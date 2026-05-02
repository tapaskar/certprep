"""Payment endpoints — Gumroad checkout and webhook handling."""

import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.config import settings
from app.models.user import User
from app.services.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

# Gumroad product IDs → plan mapping
GUMROAD_PRODUCTS = {
    "67l86EuvageW1vfKbZPtUg==": {"plan": "single", "days": 180},
    "mkrK1MgObeOXDOU60Lvb2Q==": {"plan": "pro_monthly", "days": 30},
    "yZaYsKCJnlSBd2DpXXiI5A==": {"plan": "pro_annual", "days": 365},
}

GUMROAD_CHECKOUT_URLS = {
    "single": "https://tapasaurus.gumroad.com/l/eutwyu",
    "pro_monthly": "https://tapasaurus.gumroad.com/l/arfrcr",
    "pro_annual": "https://tapasaurus.gumroad.com/l/zpchn",
}

# Human-readable plan labels — shared by /payments/me, the
# confirmation email, and the dashboard plan badge so they never
# drift apart.
PLAN_LABELS = {
    "free": "Free",
    "single": "Single Exam",
    "pro_monthly": "Pro Monthly",
    "pro_annual": "Pro Annual",
}

# Internal support inbox for cancel / refund requests. Users never
# see Gumroad's name on the SparkUpCloud side — they email us and we
# handle the Gumroad mechanics on the back end. When/if we wire up
# Gumroad's API directly (PUT /v2/sales/:id/refund, DELETE /v2/
# subscribers/:id) the UI flow stays the same.
SUPPORT_EMAIL = "support@sparkupcloud.com"


class CheckoutRequest(BaseModel):
    plan: str


class CancelRequest(BaseModel):
    reason: str | None = None


class RefundRequest(BaseModel):
    reason: str | None = None


@router.get("/me")
async def get_billing_summary(user: CurrentUser):
    """Current user's billing summary.

    Powers the /billing route + /profile billing card + dashboard
    plan badge. Single source of truth so all three surfaces show the
    same numbers.
    """
    now = datetime.now(timezone.utc)
    expires_at = user.plan_expires_at
    days_left: int | None = None
    is_expiring_soon = False
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        delta = expires_at - now
        days_left = max(0, delta.days)
        # Warn when ≤7 days remain so the UI can render the
        # renewal-coming-up state.
        is_expiring_soon = 0 < days_left <= 7

    is_paid = user.plan in ("single", "pro_monthly", "pro_annual")
    is_recurring = user.plan in ("pro_monthly", "pro_annual")

    return {
        "plan": user.plan,
        "plan_label": PLAN_LABELS.get(user.plan, user.plan),
        "is_paid": is_paid,
        "is_recurring": is_recurring,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "days_left": days_left,
        "is_expiring_soon": is_expiring_soon,
        # `can_cancel` and `can_refund` drive which actions the /billing
        # page exposes. We never expose the third-party (Gumroad) brand
        # in the API response — the SparkUpCloud frontend handles all
        # cancel/refund UX as if it owned the subscription end-to-end.
        "can_cancel": is_recurring,
        "can_refund": is_paid,
        # Where to upgrade from — used by the /billing page CTA when
        # the user is on Free or Single and could move up.
        "upgrade_url": "/pricing" if user.plan in ("free", "single") else None,
    }


@router.post("/cancel")
async def cancel_subscription(body: CancelRequest, user: CurrentUser):
    """Request cancellation of a recurring subscription.

    Currently routes to the support inbox via SES. We email the
    request, send the user a confirmation, and keep their access
    active until the current period ends (their plan_expires_at
    already has the right date — no DB write needed). When/if we
    wire Gumroad's DELETE /v2/subscribers/:id endpoint, this becomes
    instant + automated.
    """
    if user.plan not in ("pro_monthly", "pro_annual"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel.",
        )

    plan_label = PLAN_LABELS.get(user.plan, user.plan)
    expires_str = (
        user.plan_expires_at.strftime("%B %d, %Y")
        if user.plan_expires_at
        else "the end of the current period"
    )
    reason_block = (
        f"\nReason: {body.reason}\n" if body.reason else ""
    )

    # 1) Notify support so they can process on Gumroad's side
    send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Cancel] {user.email} — {plan_label}",
        body_html=(
            f"<p>User {user.email} requested subscription cancellation.</p>"
            f"<p>Plan: <strong>{plan_label}</strong><br>"
            f"Access until: <strong>{expires_str}</strong></p>"
            f"<p>Reason: {body.reason or '(not provided)'}</p>"
        ),
        body_text=(
            f"User {user.email} requested subscription cancellation.\n"
            f"Plan: {plan_label}\n"
            f"Access until: {expires_str}\n"
            f"{reason_block}"
        ),
    )

    # 2) Confirm to the user
    send_email(
        to=user.email,
        subject="Your SparkUpCloud cancellation request — confirmed",
        body_html=(
            f"<p>Hi,</p>"
            f"<p>We received your request to cancel your <strong>{plan_label}</strong> "
            f"subscription. You'll keep full access until <strong>{expires_str}</strong>, "
            f"then automatically drop to the Free plan.</p>"
            f"<p>Nothing more to do on your side. If you change your mind before "
            f"{expires_str}, just reply to this email and we'll restore the renewal.</p>"
            f"<p>— SparkUpCloud</p>"
        ),
        body_text=(
            f"Hi,\n\n"
            f"We received your request to cancel your {plan_label} subscription. "
            f"You'll keep full access until {expires_str}, then automatically drop to Free.\n\n"
            f"Nothing more to do on your side. Reply to this email if you change your mind "
            f"before {expires_str}.\n\n"
            f"— SparkUpCloud\n"
        ),
    )

    return {
        "status": "cancellation_requested",
        "access_until": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
        "message": (
            f"You'll keep access until {expires_str}. We sent confirmation to "
            f"{user.email}."
        ),
    }


@router.post("/refund")
async def request_refund(body: RefundRequest, user: CurrentUser):
    """Request a refund (pass-or-refund guarantee).

    Same email-the-support-inbox pattern as /cancel. The pass-or-refund
    SLA is 5 business days; we set expectations accordingly in the
    user-facing confirmation. When Gumroad API integration is wired,
    this becomes the auto-refund + plan-revert path.
    """
    if user.plan not in ("single", "pro_monthly", "pro_annual"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No paid plan to refund.",
        )

    plan_label = PLAN_LABELS.get(user.plan, user.plan)

    send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Refund] {user.email} — {plan_label}",
        body_html=(
            f"<p>User {user.email} requested a refund.</p>"
            f"<p>Plan: <strong>{plan_label}</strong></p>"
            f"<p>Reason: {body.reason or '(not provided)'}</p>"
        ),
        body_text=(
            f"User {user.email} requested a refund.\n"
            f"Plan: {plan_label}\n"
            f"Reason: {body.reason or '(not provided)'}\n"
        ),
    )

    send_email(
        to=user.email,
        subject="Your SparkUpCloud refund request — received",
        body_html=(
            f"<p>Hi,</p>"
            f"<p>We received your refund request for <strong>{plan_label}</strong>. "
            f"Our team will review and process it within <strong>5 business days</strong>. "
            f"You'll see the refund hit your card 3-5 days after that.</p>"
            f"<p>If you'd like to share more about what didn't work, reply to this "
            f"email — feedback shapes what we ship next.</p>"
            f"<p>— SparkUpCloud</p>"
        ),
        body_text=(
            f"Hi,\n\n"
            f"We received your refund request for {plan_label}. We'll process it "
            f"within 5 business days. You'll see the refund 3-5 days after that.\n\n"
            f"Reply to this email if you'd like to share what didn't work — feedback "
            f"shapes what we ship next.\n\n"
            f"— SparkUpCloud\n"
        ),
    )

    return {
        "status": "refund_requested",
        "message": (
            f"Refund request received. We'll process within 5 business days and "
            f"email you at {user.email} when complete."
        ),
    }


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, user: CurrentUser):
    """Return Gumroad checkout URL with user email pre-filled + return URL.

    Both query params matter:
      email=<user.email>     pre-fills Gumroad's checkout form
      wanted=true            skips Gumroad's product detail page,
                             goes straight to the buy form

    The return URL has to be configured on the Gumroad product itself
    (Gumroad → Product → Edit → Customize → Redirect URL after
    purchase). Set it to:
        https://www.sparkupcloud.com/dashboard?upgraded=<plan>
    so the dashboard can show a success toast + refresh user state.
    """
    if body.plan not in GUMROAD_CHECKOUT_URLS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {body.plan}",
        )

    # Gumroad checkout URL with three params:
    #   email     — pre-fills the buy form
    #   wanted    — skips Gumroad's product page, goes straight to buy
    #   redirect_url — overrides the product's configured post-purchase
    #                  URL. Honored for one-time products (single).
    #                  Subscription products (pro_monthly, pro_annual)
    #                  use the per-product setting in Gumroad's UI
    #                  regardless of this param — set them manually:
    #                    https://www.sparkupcloud.com/dashboard?upgraded=<plan>
    return_url = (
        f"https://www.sparkupcloud.com/dashboard?upgraded={body.plan}"
    )
    base_url = GUMROAD_CHECKOUT_URLS[body.plan]
    checkout_url = (
        f"{base_url}?email={user.email}&wanted=true"
        f"&redirect_url={return_url}"
    )

    return {"checkout_url": checkout_url, "plan": body.plan}


@router.post("/webhook")
async def gumroad_webhook(request: Request, db: DB):
    """Handle Gumroad ping (sale notification).

    Gumroad sends a POST with form-encoded data on each sale.
    We verify the sale, find the user by email, and activate their plan.
    """
    try:
        form_data = await request.form()
        data = dict(form_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    # Log the webhook for debugging
    seller_id = data.get("seller_id", "")
    product_id = data.get("product_id", "")
    email = data.get("email", "").lower().strip()
    sale_id = data.get("sale_id", "")
    refunded = data.get("refunded", "false") == "true"
    subscription_id = data.get("subscription_id", "")

    logger.info(
        "Gumroad webhook: product=%s email=%s sale=%s refunded=%s",
        product_id, email, sale_id, refunded,
    )

    # ── Origin verification ──────────────────────────────────────────
    # Without this check, anyone with curl can POST to /payments/webhook
    # and grant themselves Pro. Gumroad signs every webhook with our
    # seller_id; we reject anything that doesn't match.
    #
    # Soft-fails when GUMROAD_SELLER_ID isn't configured so dev/staging
    # environments don't break — but logs a loud warning so we notice.
    if settings.gumroad_seller_id:
        if seller_id != settings.gumroad_seller_id:
            logger.warning(
                "Webhook rejected: seller_id mismatch (got=%s expected=%s)",
                seller_id, settings.gumroad_seller_id,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid seller_id",
            )
    else:
        logger.warning(
            "GUMROAD_SELLER_ID not configured — webhook origin NOT verified. "
            "Set settings.gumroad_seller_id in production immediately."
        )

    if not email or not product_id:
        logger.warning("Webhook missing email or product_id")
        return {"status": "ignored", "reason": "missing fields"}

    # Look up product
    product_info = GUMROAD_PRODUCTS.get(product_id)
    if not product_info:
        logger.warning("Unknown product_id: %s", product_id)
        return {"status": "ignored", "reason": "unknown product"}

    # Find user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        logger.warning("Webhook for unknown user: %s", email)
        return {"status": "ignored", "reason": "user not found"}

    if refunded:
        # Handle refund — downgrade to free
        user.plan = "free"
        user.plan_expires_at = None
        user.stripe_subscription_id = None
        await db.commit()
        logger.info("Refund processed for %s — downgraded to free", email)
        return {"status": "refund_processed"}

    # Activate plan
    plan = product_info["plan"]
    days = product_info["days"]
    user.plan = plan
    user.plan_expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    if subscription_id:
        user.stripe_subscription_id = subscription_id  # reuse field for Gumroad sub ID
    await db.commit()

    logger.info(
        "Plan activated: %s → %s (expires %s)",
        email, plan, user.plan_expires_at.isoformat(),
    )

    # Send a SparkUpCloud-branded confirmation email. Gumroad sends
    # their own receipt — this is the SparkUpCloud welcome message
    # that thanks them and tells them what's now unlocked. Failure to
    # send is non-fatal; the plan is already activated.
    _send_upgrade_confirmation_email(
        to=email,
        plan=plan,
        expires_at=user.plan_expires_at,
        display_name=user.display_name or email.split("@")[0],
    )

    return {"status": "activated", "plan": plan}


def _send_upgrade_confirmation_email(
    to: str, plan: str, expires_at: datetime, display_name: str
) -> None:
    """SparkUpCloud welcome email after plan activation. Best-effort."""
    plan_label = PLAN_LABELS.get(plan, plan)
    expires_str = expires_at.strftime("%B %d, %Y")
    is_recurring = plan in ("pro_monthly", "pro_annual")
    period_word = "renews" if is_recurring else "expires"

    subject = f"You're on {plan_label} — welcome to SparkUpCloud"
    body_text = (
        f"Hi {display_name},\n\n"
        f"Your {plan_label} plan is now active. "
        f"It {period_word} on {expires_str}.\n\n"
        f"What's unlocked:\n"
    )
    if plan == "single":
        body_text += (
            "- Full content for one certification of your choice\n"
            "- Unlimited practice questions for that exam\n"
            "- 3 timed mock exams with domain-by-domain scoring\n"
            "- 6 months of access\n"
        )
    elif plan in ("pro_monthly", "pro_annual"):
        body_text += (
            "- All 76+ certifications (AWS, Azure, GCP, CompTIA, NVIDIA, Red Hat)\n"
            "- Unlimited practice questions and mock exams\n"
            "- AI-powered Coach with conversation memory per exam\n"
            "- Bayesian Knowledge Tracing + spaced repetition\n"
            "- Hands-on labs and learning paths\n"
        )
    body_text += (
        f"\nJump back into the dashboard: https://www.sparkupcloud.com/dashboard\n"
        f"Manage your subscription: https://www.sparkupcloud.com/billing\n\n"
        f"— The SparkUpCloud team\n"
    )

    body_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f5f5f4; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="padding: 32px 32px 0; border-bottom: 1px solid #e7e5e4;">
      <div style="font-size: 22px; font-weight: 800; margin-bottom: 24px;">
        <span style="color: #1c1917;">Spark</span><span style="color: #f59e0b;">Up</span><span style="color: #1c1917;">Cloud</span>
      </div>
    </div>
    <div style="padding: 32px;">
      <h1 style="font-size: 24px; color: #1c1917; margin: 0 0 16px;">You're on {plan_label} — welcome aboard 🎉</h1>
      <p style="color: #44403c; line-height: 1.6; margin: 0 0 16px;">Hi {display_name},</p>
      <p style="color: #44403c; line-height: 1.6; margin: 0 0 24px;">
        Your <strong>{plan_label}</strong> plan is now active. It {period_word} on
        <strong>{expires_str}</strong>.
      </p>
      <h2 style="font-size: 16px; color: #1c1917; margin: 0 0 12px;">What's unlocked</h2>
      <ul style="color: #44403c; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
"""
    if plan == "single":
        body_html += """
        <li>Full content for one certification of your choice</li>
        <li>Unlimited practice questions for that exam</li>
        <li>3 timed mock exams with domain-by-domain scoring</li>
        <li>6 months of access</li>"""
    elif plan in ("pro_monthly", "pro_annual"):
        body_html += """
        <li>All 76+ certifications (AWS, Azure, GCP, CompTIA, NVIDIA, Red Hat)</li>
        <li>Unlimited practice questions and mock exams</li>
        <li>AI-powered Coach with conversation memory per exam</li>
        <li>Bayesian Knowledge Tracing + spaced repetition</li>
        <li>Hands-on labs and learning paths</li>"""
    body_html += f"""
      </ul>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.sparkupcloud.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px;">Open Dashboard →</a>
      </div>
      <p style="color: #78716c; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
        Manage your subscription anytime at <a href="https://www.sparkupcloud.com/billing" style="color: #d97706; text-decoration: underline;">sparkupcloud.com/billing</a>
      </p>
    </div>
    <div style="padding: 20px 32px; background: #fafaf9; color: #a8a29e; font-size: 12px; text-align: center;">
      You received this because you upgraded your SparkUpCloud account.
    </div>
  </div>
</body>
</html>"""

    send_email(to=to, subject=subject, body_html=body_html, body_text=body_text)
