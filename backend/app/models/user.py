from __future__ import annotations

import uuid
from datetime import datetime, time
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.progress import UserExamEnrollment

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Team(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "teams"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    max_seats: Mapped[int] = mapped_column(Integer, default=10)

    members: Mapped[list[User]] = relationship(
        "User", back_populates="team", foreign_keys="User.team_id"
    )


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")

    # Auth fields
    password_hash: Mapped[str | None] = mapped_column(String(255))
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verification_code: Mapped[str | None] = mapped_column(String(10))
    email_verification_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_reset_token: Mapped[str | None] = mapped_column(String(100))
    password_reset_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Subscription
    plan: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint("plan IN ('free', 'pro', 'team')"),
        default="free",
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    subscription_status: Mapped[str] = mapped_column(String(20), default="none")
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Team
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id")
    )
    team_role: Mapped[str | None] = mapped_column(String(20))

    # Preferences
    daily_study_target_minutes: Mapped[int] = mapped_column(Integer, default=30)
    preferred_session_length: Mapped[int] = mapped_column(Integer, default=30)
    notification_preferences: Mapped[dict] = mapped_column(
        JSONB, default={"push": True, "email": True, "sms": False}
    )
    nudge_time: Mapped[time] = mapped_column(Time, default=time(8, 0))

    # Referral
    referral_code: Mapped[str | None] = mapped_column(String(20), unique=True)
    referred_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    referral_credits_usd: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00")
    )

    # Soft delete
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    team: Mapped[Team | None] = relationship(
        "Team", back_populates="members", foreign_keys=[team_id]
    )
    enrollments: Mapped[list[UserExamEnrollment]] = relationship(
        "UserExamEnrollment", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_users_clerk", "clerk_id"),
        Index("idx_users_email", "email"),
        Index("idx_users_team", "team_id"),
        Index("idx_users_plan", "plan"),
    )
