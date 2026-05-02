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


class CheckoutRequest(BaseModel):
    plan: str


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

    base_url = GUMROAD_CHECKOUT_URLS[body.plan]
    checkout_url = f"{base_url}?email={user.email}&wanted=true"

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

    return {"status": "activated", "plan": plan}
