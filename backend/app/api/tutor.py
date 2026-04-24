"""AI Tutor — 1-on-1 conversational teacher powered by Claude.

A persistent "hand-holding" coach that:
- Knows the user's enrolled exam, mastery levels, weak concepts
- Optionally focuses the conversation around a specific concept
- Walks through topics like a patient human tutor would
- Quizzes the user, gives examples, explains different ways

Free tier: 10 messages per day.
Paid tier (single / pro_*): unlimited.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

import anthropic
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select

from app.api.deps import DB, CurrentUser
from app.config import settings
from app.models.exam import Concept, Exam
from app.models.progress import UserConceptMastery, UserExamEnrollment

router = APIRouter(prefix="/tutor", tags=["tutor"])


# ── Schemas ──────────────────────────────────────────────────────────────


class TutorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class TutorChatRequest(BaseModel):
    """A turn in the tutor conversation.

    `messages` is the full history (frontend keeps it). The latest user
    message must be at the end.
    """

    messages: list[TutorMessage] = Field(..., min_length=1, max_length=40)
    exam_id: str | None = None  # Defaults to user's active exam
    concept_id: str | None = None  # Optional focused concept


class TutorChatResponse(BaseModel):
    role: Literal["assistant"] = "assistant"
    content: str
    daily_limit: int | None = None  # None = unlimited
    used_today: int
    remaining: int | None = None  # None = unlimited


# ── Plan-based limits ────────────────────────────────────────────────────


PLAN_DAILY_TUTOR_LIMITS: dict[str, int | None] = {
    "free": 10,
    "single": None,
    "pro_monthly": None,
    "pro_annual": None,
}


# ── Prompt construction ─────────────────────────────────────────────────


SYSTEM_PROMPT_TEMPLATE = """\
You are a patient, encouraging 1-on-1 tutor on SparkUpCloud. Your name is "Coach".
The student is preparing for a certification exam.

STUDENT CONTEXT
- Name: {display_name}
- Studying for: {exam_name}{exam_code}
- Current overall readiness: {readiness_pct}%
- Plan: {plan}
{concept_focus}
{weak_concepts}

YOUR TEACHING STYLE
- Conversational, warm, and patient — like a great human tutor.
- Always check understanding before moving on. End most replies with a question.
- Use concrete examples (real AWS services, real numbers, real scenarios) — never abstract.
- When asked a tough question, walk through the reasoning step-by-step.
- If the student is wrong, acknowledge what they got right first, then redirect.
- Adapt depth to the student's apparent level — don't lecture an expert, don't overwhelm a beginner.
- If the conversation drifts off-topic, gently steer back to exam prep.
- Keep replies short (under 200 words usually). Long lectures lose attention.
- Use simple markdown: **bold**, `code`, and bullet lists. No code fences for prose.
- Prefer "Let's try this together" over "You should do X".

WHAT TO AVOID
- Do NOT make up exam questions or claim something will appear on the real exam.
- Do NOT give away which option is correct in a practice question without first
  asking the student to reason through it.
- Do NOT be a search engine — you are a teacher. Ask, explain, check.
"""


def build_system_prompt(
    *,
    display_name: str,
    exam_name: str | None,
    exam_code: str | None,
    readiness_pct: float,
    plan: str,
    focused_concept: dict | None,
    weak_concepts: list[dict],
) -> str:
    code_str = f" ({exam_code})" if exam_code else ""

    if focused_concept:
        concept_focus = (
            f"\nFOCUSED CONCEPT (this conversation should center here):\n"
            f"- Name: {focused_concept['name']}\n"
            f"- Description: {focused_concept.get('description', '—')}\n"
            f"- Student's mastery: {focused_concept['mastery_pct']}%\n"
            f"- Difficulty tier: {focused_concept.get('difficulty_tier', '—')}\n"
        )
        if focused_concept.get("key_facts"):
            facts = "; ".join(focused_concept["key_facts"][:5])
            concept_focus += f"- Key facts you can reference: {facts}\n"
    else:
        concept_focus = "\nNo specific concept focus — be ready to help anywhere in the exam.\n"

    if weak_concepts:
        weak_str = "\nSTUDENT'S WEAKEST CONCEPTS (proactively offer help here):\n"
        for c in weak_concepts[:5]:
            weak_str += f"- {c['name']}: {c['mastery_pct']}% mastery\n"
    else:
        weak_str = ""

    return SYSTEM_PROMPT_TEMPLATE.format(
        display_name=display_name or "Student",
        exam_name=exam_name or "an AWS / Azure / GCP certification exam",
        exam_code=code_str,
        readiness_pct=int(readiness_pct),
        plan=plan,
        concept_focus=concept_focus,
        weak_concepts=weak_str,
    )


# ── Daily-quota helper ──────────────────────────────────────────────────


# In-memory per-user counter — keyed by (user_id, date). Resets daily.
# A future iteration could move this to Redis or a DB table for multi-instance
# correctness, but it is fine for the single-instance EC2 deployment today.
_TUTOR_USAGE: dict[tuple[str, str], int] = {}


def _today_key(user_id: str) -> tuple[str, str]:
    return (user_id, datetime.now(timezone.utc).date().isoformat())


def _get_usage(user_id: str) -> int:
    return _TUTOR_USAGE.get(_today_key(user_id), 0)


def _incr_usage(user_id: str) -> int:
    key = _today_key(user_id)
    _TUTOR_USAGE[key] = _TUTOR_USAGE.get(key, 0) + 1
    # Light cleanup: drop entries older than 2 days
    if len(_TUTOR_USAGE) > 5000:
        cutoff = (datetime.now(timezone.utc).date() - timedelta(days=2)).isoformat()
        for k in list(_TUTOR_USAGE.keys()):
            if k[1] < cutoff:
                _TUTOR_USAGE.pop(k, None)
    return _TUTOR_USAGE[key]


# ── Endpoints ───────────────────────────────────────────────────────────


@router.get("/quota")
async def tutor_quota(user: CurrentUser):
    """Current daily quota usage for the tutor."""
    limit = PLAN_DAILY_TUTOR_LIMITS.get(user.plan, 10)
    used = _get_usage(str(user.id))
    return {
        "plan": user.plan,
        "daily_limit": limit,
        "used_today": used,
        "remaining": (max(0, limit - used) if limit is not None else None),
        "unlimited": limit is None,
    }


@router.post("/chat", response_model=TutorChatResponse)
async def tutor_chat(request: TutorChatRequest, user: CurrentUser, db: DB):
    """Send a message to the AI tutor; receive Coach's reply."""
    # ── Rate limit ────────────────────────────────────────
    daily_limit = PLAN_DAILY_TUTOR_LIMITS.get(user.plan, 10)
    used = _get_usage(str(user.id))
    if daily_limit is not None and used >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Daily tutor limit reached ({daily_limit} messages). "
                "Upgrade your plan for unlimited 1-on-1 coaching."
            ),
        )

    if request.messages[-1].role != "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The last message in `messages` must be from the user.",
        )

    # ── Resolve student context ──────────────────────────
    target_exam_id = request.exam_id

    enrollment = None
    if target_exam_id:
        enr_result = await db.execute(
            select(UserExamEnrollment).where(
                and_(
                    UserExamEnrollment.user_id == user.id,
                    UserExamEnrollment.exam_id == target_exam_id,
                    UserExamEnrollment.is_active,
                )
            )
        )
        enrollment = enr_result.scalar_one_or_none()
    else:
        # Fall back to active exam
        active_result = await db.execute(
            select(UserExamEnrollment)
            .where(
                and_(
                    UserExamEnrollment.user_id == user.id,
                    UserExamEnrollment.is_active,
                )
            )
            .order_by(UserExamEnrollment.enrolled_at.desc())
            .limit(1)
        )
        enrollment = active_result.scalar_one_or_none()
        if enrollment:
            target_exam_id = enrollment.exam_id

    exam = await db.get(Exam, target_exam_id) if target_exam_id else None

    readiness_pct = (
        float(enrollment.overall_readiness_pct) if enrollment else 0.0
    )

    # ── Focused concept (if specified) ──────────────────
    focused = None
    if request.concept_id:
        concept = await db.get(Concept, request.concept_id)
        if concept and (not target_exam_id or concept.exam_id == target_exam_id):
            mastery_result = await db.execute(
                select(UserConceptMastery).where(
                    and_(
                        UserConceptMastery.user_id == user.id,
                        UserConceptMastery.concept_id == concept.id,
                    )
                )
            )
            mastery = mastery_result.scalar_one_or_none()
            mastery_pct = (
                int(float(mastery.mastery_probability) * 100) if mastery else 0
            )
            focused = {
                "name": concept.name,
                "description": concept.description or "",
                "key_facts": concept.key_facts or [],
                "mastery_pct": mastery_pct,
                "difficulty_tier": concept.difficulty_tier,
            }

    # ── Weak concepts (top 5) ───────────────────────────
    weak_concepts: list[dict] = []
    if target_exam_id:
        weak_result = await db.execute(
            select(UserConceptMastery, Concept)
            .join(Concept, UserConceptMastery.concept_id == Concept.id)
            .where(
                and_(
                    UserConceptMastery.user_id == user.id,
                    Concept.exam_id == target_exam_id,
                    UserConceptMastery.total_attempts > 0,
                )
            )
            .order_by(UserConceptMastery.mastery_probability.asc())
            .limit(5)
        )
        for m, c in weak_result.all():
            weak_concepts.append(
                {
                    "name": c.name,
                    "mastery_pct": int(float(m.mastery_probability) * 100),
                }
            )

    # ── Build system prompt ─────────────────────────────
    system_prompt = build_system_prompt(
        display_name=user.display_name or user.email.split("@")[0],
        exam_name=exam.name if exam else None,
        exam_code=exam.code if exam else None,
        readiness_pct=readiness_pct,
        plan=user.plan,
        focused_concept=focused,
        weak_concepts=weak_concepts,
    )

    # ── Call Claude ─────────────────────────────────────
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tutor is temporarily unavailable. Try again shortly.",
        )

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Anthropic expects the conversation as alternating user/assistant turns.
    api_messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        message = await client.messages.create(
            model=settings.ai_model,
            max_tokens=600,
            temperature=0.7,
            system=system_prompt,
            messages=api_messages,
        )
        reply = message.content[0].text if message.content else ""
    except anthropic.APIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Tutor service error: {str(e)[:200]}",
        )

    # ── Increment quota AFTER successful response ──
    new_used = _incr_usage(str(user.id))
    remaining = (
        max(0, daily_limit - new_used) if daily_limit is not None else None
    )

    return TutorChatResponse(
        content=reply,
        daily_limit=daily_limit,
        used_today=new_used,
        remaining=remaining,
    )
