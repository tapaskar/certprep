import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
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
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_data: Mapped[dict] = mapped_column(JSONB, default={})

    source: Mapped[str | None] = mapped_column(String(20))
    user_agent: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_events_user", "user_id", "created_at"),
        Index("idx_events_type", "event_type", "created_at"),
    )


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )

    week_start: Mapped[date] = mapped_column(Date, nullable=False)

    study_minutes: Mapped[int | None] = mapped_column(Integer)
    questions_answered: Mapped[int | None] = mapped_column(Integer)
    accuracy_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    readiness_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    readiness_delta: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    streak_days: Mapped[int | None] = mapped_column(Integer)
    concepts_mastered_count: Mapped[int | None] = mapped_column(Integer)
    goals_met: Mapped[int | None] = mapped_column(Integer)
    goals_total: Mapped[int | None] = mapped_column(Integer)
    cohort_percentile: Mapped[int | None] = mapped_column(Integer)
    pass_probability_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))

    domain_breakdown: Mapped[dict | None] = mapped_column(JSONB)
    report_data: Mapped[dict | None] = mapped_column(JSONB)
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "exam_id", "week_start"),
        Index("idx_reports_user", "user_id", "week_start"),
    )
