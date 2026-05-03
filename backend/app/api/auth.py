"""Authentication endpoints — register, login, email verification, password reset."""

import logging
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from jose import jwt
from passlib.hash import bcrypt
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.config import settings
from app.services.email import send_email as _send_email

from app.models.user import User

logger = logging.getLogger(__name__)

ADMIN_EMAILS = {"tapas.eric@gmail.com"}

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ──────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("display_name")
    @classmethod
    def display_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Display name is required")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Helpers ──────────────────────────────────────────────────────

def _create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _generate_verification_code() -> str:
    return "".join(random.choices(string.digits, k=6))


# Domains that are confirmed disposable / fake — bots scanning
# /auth/register often use these. Real users almost never do.
# Conservative list; expand as we see new patterns in /list-signups.
DISPOSABLE_EMAIL_DOMAINS = frozenset({
    "g9e.mail.com",
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "throwawaymail.com",
    "tempmail.com",
    "tempmail.net",
    "yopmail.com",
    "trashmail.com",
    "mintemail.com",
    "fakeinbox.com",
    "spamgourmet.com",
    "dispostable.com",
    "maildrop.cc",
    "getnada.com",
    "tempmailo.com",
    "emailondeck.com",
})


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DB):
    # Reject obvious disposable-email signups. We saw 0085@g9e.mail.com
    # in our /list-signups audit; pure bot pattern. Keep the list
    # conservative — false-positives here actively block real users.
    domain = body.email.split("@")[-1].lower().strip()
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        logger.warning("Register blocked: disposable domain %s", domain)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a permanent email address (we send your verification code there).",
        )

    # Check if email already taken
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    verification_code = _generate_verification_code()
    password_hash = bcrypt.hash(body.password)

    user = User(
        clerk_id=f"local_{uuid.uuid4().hex[:16]}",
        email=body.email,
        display_name=body.display_name,
        password_hash=password_hash,
        is_email_verified=False,
        email_verification_code=verification_code,
        email_verification_expires=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send welcome email — combines warm intro + features + verification
    # code in one email instead of firing two separate messages on signup
    # (which feels spammy). The verification code is intentionally
    # secondary now that signup auto-issues a token; "verify when you
    # have a sec" matches the new soft-gate UX.
    _send_email(
        to=body.email,
        subject=f"Welcome to SparkUpCloud, {body.display_name}!",
        body_html=_welcome_email_html(
            display_name=body.display_name,
            verification_code=verification_code,
        ),
        body_text=_welcome_email_text(
            display_name=body.display_name,
            verification_code=verification_code,
        ),
    )

    # Return an access token immediately — even though the email isn't
    # yet verified — so the frontend can route the user straight into
    # the app (and, critically, straight to checkout for paying flows).
    # The previous behavior of returning no token forced everyone
    # through /verify-email before they could pay, which industry data
    # puts as the single biggest funnel-killer in modern paid SaaS
    # signup. Verification is now a soft requirement enforced by the
    # dashboard banner + a 7-day grace period (see /auth/me response
    # for `is_email_verified`).
    #
    # Also stamp last_login_at — registration auto-signs the user in
    # via the issued token, so it counts as their first login. Without
    # this, the admin dashboard incorrectly shows users as "never
    # logged in" forever (since most never call /auth/login again
    # under the new flow).
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    token = _create_access_token(str(user.id))
    return {
        "user_id": str(user.id),
        "email": user.email,
        "message": "Verification code sent",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
        },
        "is_email_verified": False,
    }


@router.post("/resend-verification")
async def resend_verification(user: CurrentUser, db: DB):
    """Generate + email a fresh verification code for the current user.

    Auth-gated so we can only ever email the code to the user's own
    address — keeps the endpoint from being weaponized to spam SES
    with codes sent to arbitrary email addresses.

    Replaces the previous flawed pattern where the frontend called
    /auth/register with empty password to "resend" — which 409'd on
    every existing user, the dashboard banner then misleadingly
    showed "code sent" regardless.

    60-second per-user cooldown — protects SES quota and stops the
    user accidentally double-tapping the button. Returns 429 if
    they hit it inside the window.
    """
    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )

    # Cooldown: if a verification code was generated less than 60s
    # ago, refuse. We use email_verification_expires (set 1h in the
    # future on send) to derive the send time.
    now = datetime.now(timezone.utc)
    if user.email_verification_expires:
        expires = user.email_verification_expires
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        # If the code is fresh (less than 1h old means sent within the
        # last 1h, but we want the LAST 60 seconds), check directly.
        sent_at = expires - timedelta(hours=1)
        if (now - sent_at).total_seconds() < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait a minute before requesting another code.",
            )

    code = _generate_verification_code()
    user.email_verification_code = code
    user.email_verification_expires = now + timedelta(hours=1)
    await db.commit()

    # Bare resend email — the warm welcome was already sent on signup,
    # this is the "I lost the code" follow-up so it just delivers the
    # code without re-pitching the platform.
    _send_email(
        to=user.email,
        subject="Your SparkUpCloud verification code",
        body_html=f"""<!DOCTYPE html>
<html><body style="margin:0;padding:40px 20px;background:#f5f5f4;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:14px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="font-size:18px;font-weight:800;letter-spacing:-0.01em;margin-bottom:24px;">
      <span style="color:#1c1917;">Spark</span><span style="color:#f59e0b;">Up</span><span style="color:#1c1917;">Cloud</span>
    </div>
    <p style="color:#44403c;line-height:1.6;margin:0 0 16px;font-size:15px;">
      Here's your fresh verification code:
    </p>
    <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
      <span style="font-family:'SF Mono',Menlo,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#d97706;">{code}</span>
    </div>
    <p style="color:#78716c;font-size:13px;line-height:1.6;margin:0 0 8px;">
      Paste it at <a href="https://www.sparkupcloud.com/verify-email" style="color:#d97706;">sparkupcloud.com/verify-email</a>.
    </p>
    <p style="color:#a8a29e;font-size:12px;margin:16px 0 0;">
      Code expires in 1 hour. Didn't request this? You can safely ignore.
    </p>
  </div>
</body></html>""",
        body_text=(
            f"Your SparkUpCloud verification code: {code}\n\n"
            f"Paste it at https://www.sparkupcloud.com/verify-email\n\n"
            f"Code expires in 1 hour. Didn't request this? Safely ignore.\n"
        ),
    )

    return {
        "status": "sent",
        "message": f"Verification code sent to {user.email}.",
    }


@router.post("/login")
async def login(body: LoginRequest, db: DB):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not bcrypt.verify(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Email verification is no longer a HARD gate on login — users can
    # sign in unverified and the dashboard nudges them with a banner.
    # This unblocks the paid-checkout flow (most acute drop-off point)
    # and matches modern SaaS norms (Stripe, Vercel, Linear all let you
    # use a paid product before verifying email).

    # Auto-promote admin emails
    if user.email in ADMIN_EMAILS and not user.is_admin:
        user.is_admin = True

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    token = _create_access_token(str(user.id))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
        },
        "is_email_verified": user.is_email_verified,
    }


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: DB):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )

    if user.email_verification_code != body.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    if (
        user.email_verification_expires
        and user.email_verification_expires < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired. Please request a new one.",
        )

    user.is_email_verified = True
    user.email_verification_code = None
    user.email_verification_expires = None
    await db.commit()

    token = _create_access_token(str(user.id))

    return {
        "message": "Email verified",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
        },
    }


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: DB):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        reset_token = uuid.uuid4().hex
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()

        reset_url = f"https://sparkupcloud.com/reset-password?token={reset_token}"
        _send_email(
            to=body.email,
            subject="SparkUpCloud — Reset Your Password",
            body_html=f"""
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #1c1917; margin-bottom: 8px;">Reset Your Password</h2>
                <p style="color: #57534e;">Click the button below to reset your SparkUpCloud password:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="{reset_url}" style="display: inline-block; background: #f59e0b; color: white; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Reset Password</a>
                </div>
                <p style="color: #78716c; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            </div>
            """,
            body_text=f"Reset your SparkUpCloud password: {reset_url}  (expires in 1 hour)",
        )

    # Always return success to prevent email enumeration
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: DB):
    result = await db.execute(
        select(User).where(User.password_reset_token == body.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if (
        user.password_reset_expires
        and user.password_reset_expires < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one.",
        )

    user.password_hash = bcrypt.hash(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.commit()

    return {"message": "Password reset successful"}


@router.get("/me")
async def get_me(user: CurrentUser, db: DB):
    from app.models.progress import UserExamEnrollment
    from sqlalchemy import and_

    from app.models.exam import Exam

    # Auto-promote admin emails
    if user.email in ADMIN_EMAILS and not user.is_admin:
        user.is_admin = True
        await db.commit()

    # Get all active enrollments
    enrollment_result = await db.execute(
        select(UserExamEnrollment, Exam)
        .join(Exam, UserExamEnrollment.exam_id == Exam.id)
        .where(
            and_(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.is_active,
            )
        )
    )
    enrollments = enrollment_result.all()

    enrolled_exams = [
        {
            "exam_id": e.exam_id,
            "exam_name": exam.name,
            "exam_code": exam.code,
            "readiness_pct": float(e.overall_readiness_pct),
            "exam_date": e.exam_date.isoformat() if e.exam_date else None,
        }
        for e, exam in enrollments
    ]

    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "timezone": user.timezone,
        "plan": user.plan,
        "is_email_verified": user.is_email_verified,
        "is_admin": user.is_admin,
        "active_exam_id": enrolled_exams[0]["exam_id"] if enrolled_exams else None,
        "enrolled_exams": enrolled_exams,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
    }


# ── Welcome email content ────────────────────────────────────────
#
# Single email on signup (replaces the previous bare verification-code
# email). Combines: warm welcome, what they get, the verification code
# as a soft secondary nudge, and a clear "open dashboard" CTA. Plain-
# text version mirrors the HTML structure so Gmail and Outlook don't
# mark it as suspicious.

def _welcome_email_html(display_name: str, verification_code: str) -> str:
    name = display_name.strip() or "there"
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

      <!-- Logo header -->
      <div style="padding:28px 32px;border-bottom:1px solid #f5f5f4;">
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.01em;">
          <span style="color:#1c1917;">Spark</span><span style="color:#f59e0b;">Up</span><span style="color:#1c1917;">Cloud</span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h1 style="font-size:26px;color:#1c1917;line-height:1.25;margin:0 0 16px;font-weight:700;">
          Welcome to SparkUpCloud, {name}.
        </h1>
        <p style="color:#44403c;line-height:1.65;margin:0 0 20px;font-size:15px;">
          Really glad you're here. You just joined a community of cloud-cert
          candidates getting smarter prep, not just more practice tests.
        </p>

        <!-- Three things to try -->
        <p style="color:#44403c;line-height:1.65;margin:0 0 12px;font-size:15px;">
          <strong>Three things worth trying first:</strong>
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;">
          <tr><td style="padding:6px 0;color:#44403c;font-size:14.5px;line-height:1.6;">
            <span style="color:#f59e0b;font-weight:700;">→</span>
            <strong>Practice your target cert</strong> — adaptive engine
            (Bayesian Knowledge Tracing) feeds you what you don't know,
            not what you already do.
          </td></tr>
          <tr><td style="padding:6px 0;color:#44403c;font-size:14.5px;line-height:1.6;">
            <span style="color:#f59e0b;font-weight:700;">→</span>
            <strong>Meet Sage, your AI tutor</strong> — stateful, remembers
            every conversation, watches your answer patterns and steps in
            when you're stuck. Knows your top weak concepts.
          </td></tr>
          <tr><td style="padding:6px 0;color:#44403c;font-size:14.5px;line-height:1.6;">
            <span style="color:#f59e0b;font-weight:700;">→</span>
            <strong>Browse 76+ certifications</strong> — AWS, Azure, GCP,
            CompTIA, NVIDIA, Red Hat. Plus hands-on guided learning paths
            for performance-based exams (start with EX188 Containers with
            Podman).
          </td></tr>
        </table>

        <!-- CTA -->
        <div style="text-align:center;margin:28px 0;">
          <a href="https://www.sparkupcloud.com/dashboard"
             style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;">
            Open Your Dashboard →
          </a>
        </div>

        <!-- Verification code (secondary, soft amber box) -->
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;margin:28px 0 16px;">
          <p style="margin:0 0 8px;color:#78716c;font-size:12px;line-height:1.5;">
            <strong style="color:#92400e;">Optional:</strong> verify your email
            so you never miss a renewal notice or password reset.
            Nothing breaks if you skip — your account works either way.
          </p>
          <p style="margin:0;color:#78716c;font-size:12px;">
            Your code (expires in 1 hour):
            <span style="display:inline-block;margin-left:8px;font-family:'SF Mono',Menlo,monospace;font-size:18px;font-weight:700;letter-spacing:4px;color:#d97706;">{verification_code}</span>
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#a8a29e;">
            Paste it at <a href="https://www.sparkupcloud.com/verify-email" style="color:#d97706;">sparkupcloud.com/verify-email</a>
          </p>
        </div>

        <!-- Personal sign-off — important for warmth -->
        <p style="color:#57534e;line-height:1.65;margin:24px 0 8px;font-size:14px;">
          We're a tiny team and we read every reply to this address. If
          something's broken, weird, or missing, just hit reply. We genuinely
          want to know.
        </p>
        <p style="color:#1c1917;line-height:1.5;margin:16px 0 0;font-size:14px;">
          Welcome aboard,<br>
          <strong>The SparkUpCloud team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="padding:18px 32px;background:#fafaf9;color:#a8a29e;font-size:11px;text-align:center;border-top:1px solid #f5f5f4;">
        You're getting this because you signed up at sparkupcloud.com.
        Questions? Email <a href="mailto:admin@sparkupcloud.com" style="color:#a8a29e;">admin@sparkupcloud.com</a>.
      </div>
    </div>
  </div>
</body>
</html>"""


def _welcome_email_text(display_name: str, verification_code: str) -> str:
    name = display_name.strip() or "there"
    return f"""Welcome to SparkUpCloud, {name}.

Really glad you're here. You just joined a community of cloud-cert
candidates getting smarter prep, not just more practice tests.

Three things worth trying first:

  → Practice your target cert. The adaptive engine (Bayesian
    Knowledge Tracing) feeds you what you don't know, not what you
    already do.

  → Meet Sage, your AI tutor. Stateful, remembers every conversation,
    watches your answer patterns and steps in when you're stuck.
    Knows your top weak concepts.

  → Browse 76+ certifications. AWS, Azure, GCP, CompTIA, NVIDIA,
    Red Hat. Plus hands-on guided learning paths for performance-based
    exams (start with EX188 Containers with Podman).

Open your dashboard: https://www.sparkupcloud.com/dashboard

---

Optional: verify your email so you never miss a renewal notice or
password reset. Nothing breaks if you skip — your account works
either way.

Your code (expires in 1 hour): {verification_code}

Paste it at: https://www.sparkupcloud.com/verify-email

---

We're a tiny team and we read every reply to this address. If
something's broken, weird, or missing, just hit reply. We genuinely
want to know.

Welcome aboard,
The SparkUpCloud team

—
You're getting this because you signed up at sparkupcloud.com.
Questions? admin@sparkupcloud.com
"""
