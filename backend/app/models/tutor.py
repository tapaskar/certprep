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
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKey

# pgvector is an optional extension. We import lazily so the module still
# loads if it's not installed yet (e.g. in a fresh dev box). The
# TutorMessageEmbedding model below will use pgvector's Vector type if
# available, otherwise it falls back to JSONB (slower retrieval, same
# semantics — we compute cosine in Python).
try:
    from pgvector.sqlalchemy import Vector  # type: ignore
    _HAS_PGVECTOR = True
except ImportError:  # pragma: no cover
    Vector = None  # type: ignore
    _HAS_PGVECTOR = False

# Must match services.ai.embeddings.EMBEDDING_DIMENSIONS
EMBEDDING_DIM = 1024


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


# ── RAG: Embeddings of past Coach messages ─────────────────────────────


class TutorMessageEmbedding(Base, UUIDPrimaryKey):
    """One row per (user, scope, message) — embedded for retrieval.

    On every Coach turn we embed the new user message + the assistant's
    reply and persist them here. On the next call we search this table
    for messages whose embedding is most similar to the new user query
    and inject the top-K back into Coach's system prompt as
    "Relevant past discussions".

    Searches across ALL of a given user's scopes by default, so Coach
    can recall "we talked about VPC peering 3 weeks ago when you were
    studying SAA" even if you're now in a Red Hat path.
    """

    __tablename__ = "tutor_message_embeddings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tutor_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    scope: Mapped[str] = mapped_column(String(80), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" | "assistant"
    # Full message text (capped to ~30K chars by the embedder anyway)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Truncated single-line summary used when injecting into prompts
    summary: Mapped[str] = mapped_column(String(280), nullable=False)
    # Embedding column type depends on whether pgvector is available
    if _HAS_PGVECTOR:
        embedding: Mapped[list[float]] = mapped_column(
            Vector(EMBEDDING_DIM), nullable=False  # type: ignore[arg-type]
        )
    else:
        embedding: Mapped[list[float]] = mapped_column(JSONB, nullable=False)

    embedding_model: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        # Recency lookups for skipping the user's own recent messages
        Index("idx_tme_user_recent", "user_id", "created_at"),
        # Per-scope lookups
        Index("idx_tme_scope", "user_id", "scope", "created_at"),
        # The HNSW vector index is created in app/cli.py create-tables
        # (SQLAlchemy doesn't have a clean way to declare HNSW indexes
        # with ops classes — done via raw SQL post-create).
    )
