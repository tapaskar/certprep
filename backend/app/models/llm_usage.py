"""LLM usage log — one row per LLM call. Powers cost telemetry."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKey


class LLMUsageLog(Base, UUIDPrimaryKey):
    """One row per LLM call.

    Lets us answer:
      - How many tokens did a user spend today?
      - What's the dollar cost of /tutor/chat vs /observe vs /explainer?
      - Are we hitting cache effectively (cached_tokens / input_tokens)?
      - Time-series spend: am I trending toward the local-LLM break-even?
    """

    __tablename__ = "llm_usage_log"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    # "tutor.chat" | "tutor.observe" | "explainer" | etc.
    endpoint: Mapped[str] = mapped_column(String(60), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)

    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cached_tokens: Mapped[int] = mapped_column(Integer, default=0)
    # 6 decimal places — fractions of a cent matter at scale
    cost_usd: Mapped[float] = mapped_column(Numeric(12, 6), default=0)

    # Latency and any error context
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(String(200))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_llm_usage_user_day", "user_id", "created_at"),
        Index("idx_llm_usage_endpoint_day", "endpoint", "created_at"),
    )
