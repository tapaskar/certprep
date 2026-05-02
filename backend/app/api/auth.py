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


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DB):
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

    # Send verification email via SES
    _send_email(
        to=body.email,
        subject="SparkUpCloud — Verify Your Email",
        body_html=f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1c1917; margin-bottom: 8px;">Welcome to SparkUpCloud!</h2>
            <p style="color: #57534e;">Your verification code is:</p>
            <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d97706;">{verification_code}</span>
            </div>
            <p style="color: #78716c; font-size: 14px;">This code expires in 1 hour. If you didn't create an account, ignore this email.</p>
        </div>
        """,
        body_text=f"Your SparkUpCloud verification code is: {verification_code}. This code expires in 1 hour.",
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
