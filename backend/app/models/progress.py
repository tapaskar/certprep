from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKey


class UserExamEnrollment(Base, UUIDPrimaryKey):
    __tablename__ = "user_exam_enrollment"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )

    exam_date: Mapped[date | None] = mapped_column(Date)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Diagnostic
    diagnostic_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    diagnostic_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    diagnostic_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Aggregated progress
    overall_readiness_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00")
    )
    domain_readiness: Mapped[dict] = mapped_column(JSONB, default={})
    pass_probability_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    concepts_mastered: Mapped[int] = mapped_column(Integer, default=0)
    concepts_total: Mapped[int] = mapped_column(Integer, default=0)

    # Streak
    current_streak_days: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak_days: Mapped[int] = mapped_column(Integer, default=0)
    streak_freezes_remaining: Mapped[int] = mapped_column(Integer, default=1)
    last_active_date: Mapped[date | None] = mapped_column(Date)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped[User] = relationship("User", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("user_id", "exam_id"),
        Index("idx_enrollment_user", "user_id"),
        Index("idx_enrollment_exam", "exam_id"),
        Index("idx_enrollment_active", "user_id", "is_active"),
    )


class UserConceptMastery(Base, UUIDPrimaryKey):
    __tablename__ = "user_concept_mastery"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    concept_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("concepts.id"), nullable=False
    )

    # BKT state
    mastery_probability: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.0000")
    )
    mastery_level: Mapped[str] = mapped_column(String(20), default="not_started")

    # SM-2 spaced repetition state
    easiness_factor: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), default=Decimal("2.50")
    )
    interval_days: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), default=Decimal("1.00")
    )
    repetition_count: Mapped[int] = mapped_column(Integer, default=0)
    next_review_date: Mapped[date | None] = mapped_column(Date)
    last_review_date: Mapped[date | None] = mapped_column(Date)

    # Decay tracking
    decay_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.0800")
    )
    last_mastery_update_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Performance stats
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    correct_attempts: Mapped[int] = mapped_column(Integer, default=0)
    misconception_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_response_time_seconds: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "concept_id"),
        Index("idx_mastery_user", "user_id"),
        Index("idx_mastery_concept", "concept_id"),
        Index("idx_mastery_review", "user_id", "next_review_date"),
        Index("idx_mastery_level", "user_id", "mastery_level"),
    )


class UserAnswer(Base):
    __tablename__ = "user_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("questions.id"), nullable=False
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("study_sessions.id")
    )

    selected_option: Mapped[str] = mapped_column(String(5), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    response_time_seconds: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    confidence_rating: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("confidence_rating BETWEEN 1 AND 3")
    )

    # Mastery snapshot
    mastery_before: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    mastery_after: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    quality_score: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("quality_score BETWEEN 0 AND 5")
    )

    was_misconception: Mapped[bool] = mapped_column(Boolean, default=False)
    explanation_viewed: Mapped[bool] = mapped_column(Boolean, default=False)
    explanation_source: Mapped[str | None] = mapped_column(String(20))

    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_answers_user", "user_id", "answered_at"),
        Index("idx_answers_question", "question_id"),
        Index("idx_answers_session", "session_id"),
    )


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    exam_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("exams.id"), nullable=False
    )

    session_type: Mapped[str] = mapped_column(String(30), nullable=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    plan: Mapped[dict | None] = mapped_column(JSONB)

    questions_answered: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)
    review_cards_completed: Mapped[int] = mapped_column(Integer, default=0)
    concepts_explored: Mapped[int] = mapped_column(Integer, default=0)

    readiness_before: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    readiness_after: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))

    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_sessions_user", "user_id", "started_at"),
        Index("idx_sessions_exam", "exam_id"),
    )
