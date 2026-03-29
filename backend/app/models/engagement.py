import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StreakHistory(Base):
    __tablename__ = "streak_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )

    streak_date: Mapped[date] = mapped_column(Date, nullable=False)
    activity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    activity_count: Mapped[int] = mapped_column(Integer, default=0)
    freeze_used: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("user_id", "exam_id", "streak_date"),
        Index("idx_streak_user", "user_id", "exam_id", "streak_date"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    channel: Mapped[str] = mapped_column(
        String(10),
        CheckConstraint("channel IN ('push', 'email', 'sms', 'in_app')"),
        nullable=False,
    )
    notification_type: Mapped[str] = mapped_column(String(30), nullable=False)

    title: Mapped[str | None] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    cta_url: Mapped[str | None] = mapped_column(Text)

    scheduled_for: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    status: Mapped[str] = mapped_column(
        String(20),
        CheckConstraint(
            "status IN ('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'failed')"
        ),
        default="scheduled",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_notifications_user", "user_id", "scheduled_for"),
        Index("idx_notifications_status", "status", "scheduled_for"),
    )


class ExplanationCache(Base):
    __tablename__ = "explanation_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    cache_key: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    cache_level: Mapped[str] = mapped_column(String(20), nullable=False)

    explanation_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str | None] = mapped_column(String(50))
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(8, 5))

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_cache_key", "cache_key"),
        Index("idx_cache_expiry", "expires_at"),
    )
