"""Convenience helper for logging LLM calls to the DB."""

from __future__ import annotations

import time
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_usage import LLMUsageLog
from app.services.ai.llm_provider import (
    ChatProvider,
    ChatResult,
    LLMUnavailable,
    estimate_cost_usd,
    get_chat_provider,
)


async def chat_and_log(
    *,
    db: AsyncSession,
    endpoint: str,
    user_id: uuid.UUID | None,
    system: str,
    messages: list[dict],
    max_tokens: int = 700,
    temperature: float = 0.7,
    fast: bool = False,
) -> ChatResult:
    """Wrapper around provider.chat() that persists a usage log row.

    Logs both successful calls (with tokens + cost) and failures
    (with the error message and zero tokens). Never raises a DB error
    out of the logging path — chat success is what matters most.
    """
    provider: ChatProvider = get_chat_provider()
    started = time.monotonic()
    error: str | None = None
    result: ChatResult | None = None

    try:
        result = await provider.chat(
            system=system,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            fast=fast,
        )
    except LLMUnavailable as e:
        error = str(e)[:200]
        raise
    finally:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        try:
            db.add(
                LLMUsageLog(
                    user_id=user_id,
                    endpoint=endpoint,
                    provider=provider.name,
                    model=result.model if result else "(failed)",
                    input_tokens=result.input_tokens if result else 0,
                    output_tokens=result.output_tokens if result else 0,
                    cached_tokens=result.cached_tokens if result else 0,
                    cost_usd=Decimal(
                        f"{estimate_cost_usd(result):.6f}" if result else "0"
                    ),
                    latency_ms=elapsed_ms,
                    error=error,
                )
            )
            await db.commit()
        except Exception:
            # Never let logging failure mask the actual chat outcome.
            await db.rollback()

    assert result is not None
    return result
