"""Coach RAG — embed messages on save, retrieve relevant past on chat.

Two public functions:
  - retrieve_relevant(): given a fresh user query, return the top-K
    most-similar past messages for that user.
  - index_messages(): given new (role, content) pairs, embed them and
    persist to tutor_message_embeddings.

Both are best-effort. They never raise out of the chat path — if the
embedder is unavailable or pgvector isn't installed yet, Coach
silently falls back to behaviour without RAG.
"""

from __future__ import annotations

import logging
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.tutor import _HAS_PGVECTOR, TutorMessageEmbedding
from app.services.ai.embeddings import (
    EMBEDDING_DIMENSIONS,
    EmbeddingUnavailable,
    get_embedder,
)

log = logging.getLogger(__name__)


def _summarise(text: str, limit: int = 240) -> str:
    """Single-line truncated summary used when injecting into prompts."""
    one_line = " ".join(text.split())
    return one_line[: limit - 1] + "…" if len(one_line) > limit else one_line


def _format_when(ts: datetime) -> str:
    """Human-readable relative time: 'yesterday', '3 weeks ago', etc."""
    now = datetime.now(timezone.utc)
    delta = now - ts
    days = delta.days
    if days >= 30:
        months = days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    if days >= 14:
        return f"{days // 7} weeks ago"
    if days >= 7:
        return "last week"
    if days >= 2:
        return f"{days} days ago"
    if days == 1:
        return "yesterday"
    hours = delta.seconds // 3600
    if hours >= 1:
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    return "earlier today"


def _cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity for two vectors. Used in the JSONB fallback path."""
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return 0.0 if na == 0 or nb == 0 else dot / (na * nb)


# ── INDEX ──────────────────────────────────────────────────────────────


async def index_messages(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    scope: str,
    messages: Iterable[dict],
) -> int:
    """Embed and persist the given messages. Returns count successfully indexed.

    `messages` is an iterable of {role, content, ts?}. We skip messages
    with empty/very short content (no useful signal).
    """
    msgs = [
        m for m in messages
        if (m.get("content") or "").strip() and len((m.get("content") or "").strip()) >= 8
    ]
    if not msgs:
        return 0

    try:
        embedder = get_embedder()
    except EmbeddingUnavailable as e:
        log.info("RAG indexing skipped — no embedder: %s", e)
        return 0

    if embedder.dimensions != EMBEDDING_DIMENSIONS:
        log.warning(
            "Embedder dim mismatch (%s vs %s); skipping",
            embedder.dimensions,
            EMBEDDING_DIMENSIONS,
        )
        return 0

    contents = [m["content"] for m in msgs]
    try:
        vectors = await embedder.embed(contents)
    except EmbeddingUnavailable as e:
        log.warning("Embedding call failed: %s", e)
        return 0

    for m, vec in zip(msgs, vectors):
        db.add(
            TutorMessageEmbedding(
                user_id=user_id,
                conversation_id=conversation_id,
                scope=scope,
                role=m["role"],
                content=m["content"],
                summary=_summarise(m["content"]),
                embedding=vec,
                embedding_model=embedder.name,
            )
        )
    try:
        await db.commit()
    except Exception:  # noqa: BLE001
        await db.rollback()
        log.exception("Failed to persist embeddings; rolling back")
        return 0
    return len(msgs)


# ── RETRIEVE ───────────────────────────────────────────────────────────


async def retrieve_relevant(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    query: str,
    current_scope: str | None = None,
    top_k: int | None = None,
) -> list[dict]:
    """Return the top-K most-similar past Coach messages for this user.

    Returns: [{scope, role, summary, content, when, similarity}, ...]
    Empty list on any failure or if nothing crosses the similarity threshold.
    """
    if not query or len(query.strip()) < 8:
        return []

    top_k = top_k or settings.rag_top_k
    skip_recent_until = datetime.now(timezone.utc) - timedelta(
        seconds=settings.rag_recency_skip_seconds
    )

    try:
        embedder = get_embedder()
        query_vec = (await embedder.embed([query]))[0]
    except EmbeddingUnavailable as e:
        log.info("RAG retrieval skipped — no embedder: %s", e)
        return []

    if _HAS_PGVECTOR:
        # Fast path: use pgvector's cosine_distance operator on indexed vectors.
        # cosine_distance = 1 - cosine_similarity, so smaller is better.
        rows = await db.execute(
            select(TutorMessageEmbedding)
            .where(
                and_(
                    TutorMessageEmbedding.user_id == user_id,
                    TutorMessageEmbedding.created_at < skip_recent_until,
                )
            )
            .order_by(TutorMessageEmbedding.embedding.cosine_distance(query_vec))
            .limit(top_k * 3)  # over-fetch then post-filter
        )
        candidates = rows.scalars().all()
        out = []
        for row in candidates:
            sim = 1.0 - _cosine_distance_value(row.embedding, query_vec)
            if sim >= settings.rag_min_similarity:
                out.append(_make_record(row, sim))
            if len(out) >= top_k:
                break
        # Soft boost for current-scope matches
        if current_scope:
            out.sort(
                key=lambda r: (
                    -(r["similarity"] + (0.05 if r["scope"] == current_scope else 0))
                )
            )
        return out

    # JSONB fallback: load recent rows + cosine in Python.
    rows = await db.execute(
        select(TutorMessageEmbedding)
        .where(
            and_(
                TutorMessageEmbedding.user_id == user_id,
                TutorMessageEmbedding.created_at < skip_recent_until,
            )
        )
        .order_by(desc(TutorMessageEmbedding.created_at))
        .limit(500)
    )
    candidates = rows.scalars().all()
    scored = [
        (row, _cosine(row.embedding, query_vec)) for row in candidates
    ]
    scored.sort(key=lambda x: -x[1])
    out = []
    for row, sim in scored:
        if sim < settings.rag_min_similarity:
            break
        out.append(_make_record(row, sim))
        if len(out) >= top_k:
            break
    return out


def _cosine_distance_value(a: list[float], b: list[float]) -> float:
    """Cosine distance computed in Python (post-DB sort filter)."""
    return 1.0 - _cosine(a, b)


def _make_record(row: TutorMessageEmbedding, sim: float) -> dict:
    return {
        "scope": row.scope,
        "role": row.role,
        "summary": row.summary,
        "content": row.content,
        "when": _format_when(row.created_at),
        "similarity": round(sim, 3),
    }


# ── PROMPT INJECTION HELPER ────────────────────────────────────────────


def format_for_prompt(matches: list[dict]) -> str:
    """Format retrieved messages for injection into Coach's system prompt."""
    if not matches:
        return ""
    lines = ["", "RELEVANT PAST DISCUSSIONS WITH THIS STUDENT (use only if directly relevant):"]
    for m in matches:
        scope_label = m["scope"].split(":", 1)[-1] if ":" in m["scope"] else m["scope"]
        speaker = "they said" if m["role"] == "user" else "you (Coach) said"
        lines.append(
            f'- {m["when"]}, in {scope_label}, {speaker}: "{m["summary"]}"'
        )
    lines.append(
        "If you reference any of these, do it naturally — like a real tutor remembering. "
        "Don't list them mechanically. Don't fabricate details not present here."
    )
    return "\n".join(lines)
