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
    """Return Gumroad checkout URL with user email pre-filled."""
    if body.plan not in GUMROAD_CHECKOUT_URLS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {body.plan}",
        )

    base_url = GUMROAD_CHECKOUT_URLS[body.plan]
    checkout_url = f"{base_url}?email={user.email}"

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
