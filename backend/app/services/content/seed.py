"""Seed data loader — imports exam content from JSON fixtures.

Uses Postgres-native `INSERT ... ON CONFLICT (id) DO UPDATE` for every
write so duplicates are structurally impossible regardless of how
the script is interrupted, retried, or run concurrently. Previously
we did get-then-add which could and did produce duplicates after a
crashed run left index pages inconsistent.
"""

import json
import re
from decimal import Decimal
from pathlib import Path

from passlib.hash import bcrypt
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Concept, Exam, Question
from app.models.user import User


def _filter_to_columns(model_cls, data: dict) -> dict:
    """Strip keys that don't match any column on the model.

    Seed JSON sometimes carries denormalised metadata (e.g. ``aws_services``)
    that isn't a real column. We silently drop those.
    """
    cols = {c.key for c in model_cls.__table__.columns}
    return {k: v for k, v in data.items() if k in cols}


async def _upsert(
    db: AsyncSession,
    model_cls,
    rows: list[dict],
    *,
    conflict_target: str = "id",
) -> int:
    """INSERT ... ON CONFLICT (id) DO UPDATE for a batch of rows.

    Atomic at the DB level — no race conditions, no duplicates, no
    half-written state on retry. Returns the count of rows processed
    (every row is a definite insert-or-update, so this equals len(rows)).
    """
    if not rows:
        return 0
    cleaned = [_filter_to_columns(model_cls, r) for r in rows]
    stmt = pg_insert(model_cls).values(cleaned)
    # Update every column except the primary key on conflict.
    update_cols = {
        c.key: getattr(stmt.excluded, c.key)
        for c in model_cls.__table__.columns
        if c.key != conflict_target
    }
    stmt = stmt.on_conflict_do_update(
        index_elements=[conflict_target],
        set_=update_cols,
    )
    await db.execute(stmt)
    return len(cleaned)


async def seed_exam(db: AsyncSession, data_dir: str) -> dict[str, int]:
    """Load exam, concepts, questions, and a dev user from JSON fixtures.

    Returns counts of imported records. Idempotent — re-running the
    same fixture is a no-op (UPDATE with identical values).
    """
    data_path = Path(data_dir)
    counts = {"exams": 0, "concepts": 0, "questions": 0, "dev_user": 0}
    exam_data: dict | None = None

    # ── Exam ───────────────────────────────────────────────────────
    exam_file = data_path / "exam.json"
    if exam_file.exists():
        with open(exam_file) as f:
            exam_data = json.load(f)
        counts["exams"] = await _upsert(db, Exam, [exam_data])

    # ── Exam info (a JSONB column on the Exam row) ─────────────────
    # We treat this as a partial update on the existing exam record.
    exam_info_file = data_path / "exam_info.json"
    if exam_info_file.exists() and exam_data is not None:
        with open(exam_info_file) as f:
            exam_info = json.load(f)
        # Merge: load the row we just upserted, set exam_info, let SQLA
        # write it back on flush. This keeps `exam_info` decoupled from
        # the Exam upsert columns above (it's a one-off JSONB blob).
        existing_exam = await db.get(Exam, exam_data["id"])
        if existing_exam is not None:
            existing_exam.exam_info = exam_info

    # ── Concepts ──────────────────────────────────────────────────
    concepts_file = data_path / "concepts.json"
    concepts_data: list[dict] = []
    if concepts_file.exists():
        with open(concepts_file) as f:
            concepts_data = json.load(f)
        # Coerce numeric-as-string into Decimal (model column type).
        for cd in concepts_data:
            if "exam_weight" in cd:
                cd["exam_weight"] = Decimal(str(cd["exam_weight"]))
        counts["concepts"] = await _upsert(db, Concept, concepts_data)

    # ── Questions ─────────────────────────────────────────────────
    questions_file = data_path / "questions.json"
    questions_data: list[dict] = []
    if questions_file.exists():
        with open(questions_file) as f:
            questions_data = json.load(f)
        for qd in questions_data:
            for field in ("bkt_p_guess", "bkt_p_slip", "bkt_p_transit"):
                if field in qd and qd[field] is not None:
                    qd[field] = Decimal(str(qd[field]))
        counts["questions"] = await _upsert(db, Question, questions_data)

    # ── Auto-link questions with empty concept_ids via keyword match ──
    # Same logic as before — uses the in-memory JSON, not the DB. We
    # then push updates via a second upsert pass (only for questions
    # whose concept_ids actually changed).
    if concepts_data and questions_data:
        domain_concepts: dict[str, list[dict]] = {}
        for cd in concepts_data:
            did = cd.get("domain_id", "")
            domain_concepts.setdefault(did, [])
            keywords: set[str] = set()
            keywords.update(_words(cd.get("name", "")))
            keywords.update(_words(cd.get("description") or ""))
            for svc in cd.get("aws_services", []) or []:
                keywords.update(_words(svc))
            for fact in cd.get("key_facts", []) or []:
                if isinstance(fact, str):
                    keywords.update(_words(fact))
            keywords -= _NOISE_WORDS
            domain_concepts[did].append(
                {"id": cd["id"], "name": (cd.get("name") or "").lower(), "keywords": keywords}
            )

        relinked: list[dict] = []
        for qd in questions_data:
            if qd.get("concept_ids"):
                continue
            domain_id = qd.get("domain_id", "")
            candidates = domain_concepts.get(domain_id, [])
            if not candidates:
                continue
            stem_words = set(_words(qd.get("stem", "")))
            for opt in qd.get("options", []) or []:
                stem_words.update(
                    _words(opt.get("text", "") if isinstance(opt, dict) else str(opt))
                )

            scored = [
                (
                    c["id"],
                    len(c["keywords"] & stem_words)
                    + len(set(_words(c["name"])) & stem_words) * 3,
                )
                for c in candidates
            ]
            scored.sort(key=lambda x: x[1], reverse=True)
            if scored and scored[0][1] > 0:
                linked = [scored[0][0]]
                if len(scored) > 1 and scored[1][1] >= scored[0][1] * 0.6:
                    linked.append(scored[1][0])
            elif scored:
                linked = [scored[0][0]]
            else:
                linked = []

            if linked:
                relinked.append({"id": qd["id"], "concept_ids": linked})

        if relinked:
            # Targeted upsert that only touches concept_ids; ON CONFLICT
            # leaves every other column unchanged.
            stmt = pg_insert(Question).values(
                [{"id": r["id"], "concept_ids": r["concept_ids"]} for r in relinked]
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={"concept_ids": stmt.excluded.concept_ids},
            )
            await db.execute(stmt)

    # ── Dev user (id=clerk_id constraint) ─────────────────────────
    result = await db.execute(select(User).where(User.clerk_id == "dev_user"))
    if not result.scalar_one_or_none():
        db.add(
            User(
                clerk_id="dev_user",
                email="dev@sparkupcloud.com",
                display_name="Dev User",
                referral_code="DEVTEST",
                password_hash=bcrypt.hash("password123"),
                is_email_verified=True,
                is_admin=True,
            )
        )
        counts["dev_user"] = 1

    # ── Promote tapas to admin if account exists ─────────────────
    result = await db.execute(select(User).where(User.email == "tapas.eric@gmail.com"))
    tapas = result.scalar_one_or_none()
    if tapas and not tapas.is_admin:
        tapas.is_admin = True

    await db.flush()
    return counts


# ── Internal helpers ────────────────────────────────────────────────


_WORD_RE = re.compile(r"[a-z][a-z0-9]+")
_NOISE_WORDS = {
    "the", "and", "for", "with", "that", "this", "are", "from",
    "can", "has", "was", "will", "use", "used", "using", "which",
    "when", "how", "what", "each", "all", "more", "most", "also",
    "not", "but", "its", "you", "your", "into", "between", "across",
}


def _words(s: str) -> list[str]:
    """Tokenise a string into lowercase alphanumeric words."""
    return _WORD_RE.findall((s or "").lower())
