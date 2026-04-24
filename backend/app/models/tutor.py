"""Models for the AI Tutor (Coach) and Guided Learning Paths."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKey


class TutorConversation(Base, UUIDPrimaryKey):
    """One persistent Coach conversation per (user, exam_or_path).

    `messages` is a JSONB array of {role: "user"|"assistant", content: str,
    ts: ISO datetime}. Capped to the last 60 messages on update.

    Scope can be either an exam (e.g. "aws-saa-c03") or a learning path
    id prefixed with "path:" (e.g. "path:redhat-ex188-v4k"). This lets the
    same table back both general exam coaching and path-specific tutoring.
    """

    __tablename__ = "tutor_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Free-form scope key — exam_id, "path:<id>", or "global"
    scope: Mapped[str] = mapped_column(String(80), nullable=False, default="global")

    messages: Mapped[list] = mapped_column(JSONB, default=list)

    # Last context — used to seed the system prompt
    last_concept_id: Mapped[str | None] = mapped_column(String(100))
    last_path_id: Mapped[str | None] = mapped_column(String(100))
    last_step_id: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "scope"),
        Index("idx_tutor_conv_user", "user_id"),
        Index("idx_tutor_conv_updated", "user_id", "updated_at"),
    )


class UserPathProgress(Base, UUIDPrimaryKey):
    """Tracks a user's progress through a guided learning path.

    Path definitions live in seed JSON (data/seed/learning-paths.json) —
    they are versioned content, not user data.
    """

    __tablename__ = "user_path_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    path_id: Mapped[str] = mapped_column(String(100), nullable=False)

    current_step_id: Mapped[str | None] = mapped_column(String(100))
    # Array of step_ids the user has marked complete
    completed_steps: Mapped[list] = mapped_column(JSONB, default=list)
    # quiz_results: { "step_id": { "correct": int, "total": int, "answered_at": iso } }
    quiz_results: Mapped[dict] = mapped_column(JSONB, default=dict)

    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "path_id"),
        Index("idx_path_progress_user", "user_id"),
    )
