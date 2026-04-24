"""AI Tutor — stateful 1-on-1 conversational teacher powered by Claude.

Coach is persistent per (user, scope). Scope can be:
  - an exam_id (e.g. "aws-saa-c03") for general exam coaching
  - "path:<path_id>" for a guided learning path
  - "global" if neither is specified

Conversation history is stored in the DB and replayed on each turn.

Free tier: 10 messages per day. Paid: unlimited.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

import json

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select

from app.api.deps import DB, CurrentUser
from app.config import settings
from app.models.exam import Concept, Exam
from app.models.progress import UserConceptMastery, UserExamEnrollment
from app.models.tutor import TutorConversation, UserPathProgress
from app.services.ai.coach_agent import (
    CoachIntervention,
    StudyEvent,
    decide_intervention,
    llm_decide_intervention,
)
from app.services.ai.llm_provider import LLMUnavailable
from app.services.ai.retrieval import (
    format_for_prompt,
    index_messages,
    retrieve_relevant,
)
from app.services.ai.usage import chat_and_log

router = APIRouter(prefix="/tutor", tags=["tutor"])


# ── Schemas ──────────────────────────────────────────────────────────────


class TutorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class TutorChatRequest(BaseModel):
    """Send the latest user message; the server replays prior history."""

    message: str = Field(..., min_length=1, max_length=4000)
    exam_id: str | None = None  # For exam coaching
    concept_id: str | None = None  # Optional concept focus
    path_id: str | None = None  # When user is in a guided path
    step_id: str | None = None  # Current step within the path
    # If true, wipe stored history and start fresh from this message.
    reset: bool = False


class TutorChatResponse(BaseModel):
    role: Literal["assistant"] = "assistant"
    content: str
    history: list[TutorMessage]
    daily_limit: int | None = None
    used_today: int
    remaining: int | None = None


# ── Plan-based limits ────────────────────────────────────────────────────


PLAN_DAILY_TUTOR_LIMITS: dict[str, int | None] = {
    "free": 10,
    "single": None,
    "pro_monthly": None,
    "pro_annual": None,
}

# Cap conversation history sent to Claude. Older messages still live in DB
# but only the last N are sent to the model to stay within the context window.
HISTORY_TURN_CAP = 30
# Hard cap on what we persist per scope.
HISTORY_PERSIST_CAP = 60


# ── Prompt construction ─────────────────────────────────────────────────


SYSTEM_PROMPT_TEMPLATE = """\
You are Coach — a patient, encouraging 1-on-1 tutor on SparkUpCloud.

STUDENT CONTEXT
- Name: {display_name}
- Currently studying: {study_target}
- Plan: {plan}
{readiness_block}
{path_block}
{concept_block}
{weak_block}

YOUR TEACHING STYLE
- Conversational, warm, and patient — like a great human tutor.
- Always check understanding before moving on. End most replies with a question.
- Use concrete examples (real services, real numbers, real scenarios).
- When asked a tough question, walk through the reasoning step-by-step.
- If the student is wrong, acknowledge what they got right first, then redirect.
- Adapt depth to the student's apparent level — don't lecture an expert, don't overwhelm a beginner.
- Keep replies short (under 200 words usually). Long lectures lose attention.
- Use simple markdown: **bold**, `code`, code fences for shell snippets, and bullet lists.
- Prefer "Let's try this together" over "You should do X".

WHEN GUIDING A LEARNING PATH STEP
- Reference the current step explicitly when relevant.
- If the step is hands-on, anticipate where students get stuck and offer specific commands.
- For quiz steps, do NOT reveal the correct answers up front — guide the student to reason it out.
- Recommend `Mark Step Complete` only when you're confident the student has understood.

WHAT TO AVOID
- Do NOT make up exam questions or claim something will appear on the real exam.
- Do NOT give away which option is correct on a practice question without first
  asking the student to reason through it.
- Do NOT be a search engine — you are a teacher. Ask, explain, check.
"""


def build_system_prompt(
    *,
    display_name: str,
    exam_name: str | None,
    exam_code: str | None,
    plan: str,
    readiness_pct: float | None,
    path: dict | None,
    step: dict | None,
    focused_concept: dict | None,
    weak_concepts: list[dict],
) -> str:
    if path:
        study_target = f"the **{path['title']}** learning path"
        if exam_name:
            study_target += f" ({exam_name})"
    elif exam_name:
        code_str = f" ({exam_code})" if exam_code else ""
        study_target = f"{exam_name}{code_str}"
    else:
        study_target = "a certification exam"

    readiness_block = (
        f"- Overall readiness: {int(readiness_pct)}%\n" if readiness_pct is not None else ""
    )

    path_block = ""
    if path:
        path_block = (
            f"\nLEARNING PATH: {path['title']}\n"
            f"- Description: {path.get('description', '—')}\n"
            f"- Progress: {path.get('completed_count', 0)} / {path.get('total_steps', '?')} steps complete\n"
        )
        if step:
            path_block += (
                f"\nCURRENT STEP — guide the student through this:\n"
                f"- Module: {step.get('module_title', '—')}\n"
                f"- Step: {step.get('title', '—')}\n"
                f"- Type: {step.get('type', 'lecture')}\n"
                f"- What it covers: {step.get('summary', '—')}\n"
            )
            if step.get("instructions"):
                joined = "; ".join(step["instructions"][:6])
                path_block += f"- Hands-on instructions you can reference: {joined}\n"

    concept_block = ""
    if focused_concept:
        concept_block = (
            f"\nFOCUSED CONCEPT (in addition to any path step):\n"
            f"- Name: {focused_concept['name']}\n"
            f"- Description: {focused_concept.get('description', '—')}\n"
            f"- Student's mastery: {focused_concept.get('mastery_pct', 0)}%\n"
        )
        if focused_concept.get("key_facts"):
            facts = "; ".join(focused_concept["key_facts"][:5])
            concept_block += f"- Key facts you can reference: {facts}\n"

    weak_block = ""
    if weak_concepts:
        weak_block = "\nSTUDENT'S WEAKEST AREAS (offer help here when appropriate):\n"
        for c in weak_concepts[:5]:
            weak_block += f"- {c['name']}: {c['mastery_pct']}% mastery\n"

    return SYSTEM_PROMPT_TEMPLATE.format(
        display_name=display_name or "Student",
        study_target=study_target,
        plan=plan,
        readiness_block=readiness_block,
        path_block=path_block,
        concept_block=concept_block,
        weak_block=weak_block,
    )


# ── Daily-quota helper ──────────────────────────────────────────────────


_TUTOR_USAGE: dict[tuple[str, str], int] = {}


def _today_key(user_id: str) -> tuple[str, str]:
    return (user_id, datetime.now(timezone.utc).date().isoformat())


def _get_usage(user_id: str) -> int:
    return _TUTOR_USAGE.get(_today_key(user_id), 0)


def _incr_usage(user_id: str) -> int:
    key = _today_key(user_id)
    _TUTOR_USAGE[key] = _TUTOR_USAGE.get(key, 0) + 1
    if len(_TUTOR_USAGE) > 5000:
        cutoff = (datetime.now(timezone.utc).date() - timedelta(days=2)).isoformat()
        for k in list(_TUTOR_USAGE.keys()):
            if k[1] < cutoff:
                _TUTOR_USAGE.pop(k, None)
    return _TUTOR_USAGE[key]


# ── Path lookup (loads from seed JSON) ──────────────────────────────────


_PATHS_CACHE: list[dict] | None = None


def _load_all_paths() -> list[dict]:
    global _PATHS_CACHE
    if _PATHS_CACHE is None:
        path_file = Path(__file__).parent.parent.parent / "data" / "seed" / "learning-paths.json"
        if path_file.exists():
            _PATHS_CACHE = json.loads(path_file.read_text())
        else:
            _PATHS_CACHE = []
    return _PATHS_CACHE


def get_path(path_id: str) -> dict | None:
    for p in _load_all_paths():
        if p["id"] == path_id:
            return p
    return None


def get_step(path: dict, step_id: str) -> tuple[dict | None, dict | None]:
    """Return (step, module) for a step_id within a path."""
    for module in path.get("modules", []):
        for step in module.get("steps", []):
            if step["id"] == step_id:
                return step, module
    return None, None


def total_steps_in_path(path: dict) -> int:
    return sum(len(m.get("steps", [])) for m in path.get("modules", []))


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


@router.get("/history")
async def tutor_history(scope: str, user: CurrentUser, db: DB):
    """Load the persisted Coach conversation for a given scope.

    `scope` is "exam:<id>", "path:<id>", or "global".
    Returns the message list (capped to the last HISTORY_TURN_CAP for display).
    """
    result = await db.execute(
        select(TutorConversation).where(
            and_(
                TutorConversation.user_id == user.id,
                TutorConversation.scope == scope,
            )
        )
    )
    conv = result.scalar_one_or_none()
    messages = conv.messages if conv else []
    return {
        "scope": scope,
        "messages": messages[-HISTORY_TURN_CAP:],
        "total_messages": len(messages),
        "updated_at": conv.updated_at.isoformat() if conv else None,
    }


@router.delete("/history")
async def clear_tutor_history(scope: str, user: CurrentUser, db: DB):
    """Clear the persisted Coach conversation for a scope."""
    result = await db.execute(
        select(TutorConversation).where(
            and_(
                TutorConversation.user_id == user.id,
                TutorConversation.scope == scope,
            )
        )
    )
    conv = result.scalar_one_or_none()
    if conv:
        conv.messages = []
        conv.last_concept_id = None
        conv.last_path_id = None
        conv.last_step_id = None
        await db.commit()
    return {"status": "cleared", "scope": scope}


@router.post("/chat", response_model=TutorChatResponse)
async def tutor_chat(request: TutorChatRequest, user: CurrentUser, db: DB):
    """Send one user message; receive Coach's reply. History is persistent."""
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

    # ── Resolve scope ────────────────────────────────────
    if request.path_id:
        scope = f"path:{request.path_id}"
    elif request.exam_id:
        scope = f"exam:{request.exam_id}"
    else:
        scope = "global"

    # ── Load or create conversation ──────────────────────
    conv_result = await db.execute(
        select(TutorConversation).where(
            and_(
                TutorConversation.user_id == user.id,
                TutorConversation.scope == scope,
            )
        )
    )
    conv = conv_result.scalar_one_or_none()

    if conv is None:
        conv = TutorConversation(
            user_id=user.id,
            scope=scope,
            messages=[],
        )
        db.add(conv)

    if request.reset:
        conv.messages = []

    # ── Build the path/step context ──────────────────────
    path = None
    step = None
    if request.path_id:
        path = get_path(request.path_id)
        if path:
            # Pull progress
            prog_result = await db.execute(
                select(UserPathProgress).where(
                    and_(
                        UserPathProgress.user_id == user.id,
                        UserPathProgress.path_id == request.path_id,
                    )
                )
            )
            prog = prog_result.scalar_one_or_none()
            path = {
                **path,
                "completed_count": len(prog.completed_steps) if prog else 0,
                "total_steps": total_steps_in_path(path),
            }
            if request.step_id:
                step_data, module_data = get_step(path, request.step_id)
                if step_data:
                    step = {
                        **step_data,
                        "module_title": module_data["title"] if module_data else "",
                    }

    # ── Resolve exam + readiness ─────────────────────────
    exam_id = request.exam_id
    if not exam_id and path:
        exam_id = path.get("exam_id")

    exam = await db.get(Exam, exam_id) if exam_id else None

    enrollment = None
    if exam_id:
        enr_result = await db.execute(
            select(UserExamEnrollment).where(
                and_(
                    UserExamEnrollment.user_id == user.id,
                    UserExamEnrollment.exam_id == exam_id,
                    UserExamEnrollment.is_active,
                )
            )
        )
        enrollment = enr_result.scalar_one_or_none()
    readiness_pct = (
        float(enrollment.overall_readiness_pct) if enrollment else None
    )

    # ── Focused concept ──────────────────────────────────
    focused = None
    if request.concept_id:
        concept = await db.get(Concept, request.concept_id)
        if concept:
            mastery_result = await db.execute(
                select(UserConceptMastery).where(
                    and_(
                        UserConceptMastery.user_id == user.id,
                        UserConceptMastery.concept_id == concept.id,
                    )
                )
            )
            mastery = mastery_result.scalar_one_or_none()
            focused = {
                "name": concept.name,
                "description": concept.description or "",
                "key_facts": concept.key_facts or [],
                "mastery_pct": int(float(mastery.mastery_probability) * 100) if mastery else 0,
            }

    # ── Weakest concepts (only if exam has them seeded) ─
    weak_concepts: list[dict] = []
    if exam_id:
        weak_result = await db.execute(
            select(UserConceptMastery, Concept)
            .join(Concept, UserConceptMastery.concept_id == Concept.id)
            .where(
                and_(
                    UserConceptMastery.user_id == user.id,
                    Concept.exam_id == exam_id,
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
        plan=user.plan,
        readiness_pct=readiness_pct,
        path=path,
        step=step,
        focused_concept=focused,
        weak_concepts=weak_concepts,
    )

    # ── Build the API messages list (history + new user msg) ──
    history = list(conv.messages or [])
    history.append({"role": "user", "content": request.message})

    # Cap history sent to Claude
    api_history = history[-HISTORY_TURN_CAP:]
    api_messages = [{"role": m["role"], "content": m["content"]} for m in api_history]

    # ── RAG: retrieve relevant past discussions across all scopes ──
    # Best-effort. If embeddings aren't configured / pgvector is missing,
    # this returns [] and Coach falls back to behaviour without RAG.
    try:
        rag_matches = await retrieve_relevant(
            db,
            user_id=user.id,
            query=request.message,
            current_scope=scope,
        )
        rag_block = format_for_prompt(rag_matches)
        if rag_block:
            system_prompt = system_prompt + "\n" + rag_block
    except Exception:  # noqa: BLE001 — never block chat on retrieval issues
        pass

    # ── Call the configured LLM provider (with usage logging) ──
    try:
        result = await chat_and_log(
            db=db,
            endpoint="tutor.chat",
            user_id=user.id,
            system=system_prompt,
            messages=api_messages,
            max_tokens=700,
            temperature=0.7,
        )
        reply = result.content
    except LLMUnavailable as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Tutor is temporarily unavailable: {e}",
        ) from e

    # ── Persist updated history ─────────────────────────
    now_iso = datetime.now(timezone.utc).isoformat()
    new_user_msg = {"role": "user", "content": request.message, "ts": now_iso}
    new_asst_msg = {"role": "assistant", "content": reply, "ts": now_iso}
    history[-1] = new_user_msg  # replace placeholder we appended above
    history.append(new_asst_msg)

    # Cap stored history
    conv.messages = history[-HISTORY_PERSIST_CAP:]
    conv.last_concept_id = request.concept_id or conv.last_concept_id
    conv.last_path_id = request.path_id or conv.last_path_id
    conv.last_step_id = request.step_id or conv.last_step_id
    await db.commit()
    await db.refresh(conv)

    # ── RAG: index the new turn for future retrieval ──
    # Done after the conversation save so we always have conv.id.
    # Best-effort — never raises.
    try:
        await index_messages(
            db,
            user_id=user.id,
            conversation_id=conv.id,
            scope=scope,
            messages=[new_user_msg, new_asst_msg],
        )
    except Exception:  # noqa: BLE001
        pass

    new_used = _incr_usage(str(user.id))
    remaining = (
        max(0, daily_limit - new_used) if daily_limit is not None else None
    )

    return TutorChatResponse(
        content=reply,
        history=[
            TutorMessage(role=m["role"], content=m["content"])
            for m in conv.messages[-HISTORY_TURN_CAP:]
        ],
        daily_limit=daily_limit,
        used_today=new_used,
        remaining=remaining,
    )


# ── Agentic observation endpoint ────────────────────────────────────────


class StudyEventIn(BaseModel):
    kind: Literal[
        "answered",
        "viewed",
        "idle",
        "started_step",
        "completed_step",
        "submitted_quiz",
        "fact_reviewed",
    ]
    concept_id: str | None = None
    concept_name: str | None = None
    is_correct: bool | None = None
    confidence: int | None = None
    time_seconds: float | None = None


class ObserveRequest(BaseModel):
    """Frontend reports a window of recent study events. Coach decides
    whether to speak up.
    """

    events: list[StudyEventIn] = Field(..., max_length=30)
    exam_id: str | None = None
    path_id: str | None = None
    step_id: str | None = None
    use_llm: bool = False  # If True, fall back to Claude when rules indecisive


class InterventionOut(BaseModel):
    type: str
    title: str
    message: str
    action_label: str | None = None
    seed_question: str | None = None
    concept_id: str | None = None


class ObserveResponse(BaseModel):
    intervention: InterventionOut | None = None


@router.post("/observe", response_model=ObserveResponse)
async def observe(request: ObserveRequest, user: CurrentUser, db: DB):
    """Stream-of-events endpoint. Coach decides whether to intervene."""
    events = [
        StudyEvent(
            kind=e.kind,
            concept_id=e.concept_id,
            concept_name=e.concept_name,
            is_correct=e.is_correct,
            confidence=e.confidence,
            time_seconds=e.time_seconds,
        )
        for e in request.events
    ]

    # Pull current step context if path-aware
    in_step = None
    if request.path_id and request.step_id:
        # Cheap lookup via the seed JSON cache used by /tutor/chat
        from app.api.tutor import get_path, get_step  # noqa: WPS433

        path = get_path(request.path_id)
        if path:
            step, mod = get_step(path, request.step_id)
            if step:
                in_step = {
                    "title": step["title"],
                    "type": step.get("type"),
                    "module_title": mod["title"] if mod else "",
                }

    # Pull weak concepts for the active exam (lightweight query)
    weak_concepts: list[dict] = []
    if request.exam_id:
        weak_result = await db.execute(
            select(UserConceptMastery, Concept)
            .join(Concept, UserConceptMastery.concept_id == Concept.id)
            .where(
                and_(
                    UserConceptMastery.user_id == user.id,
                    Concept.exam_id == request.exam_id,
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

    # Decide
    intervention: CoachIntervention | None = await decide_intervention(
        events=events,
        weak_concepts=weak_concepts,
        in_path_step=in_step,
        student_name=user.display_name,
    )

    # Optional Claude pass for ambiguous cases
    if intervention is None and request.use_llm:
        intervention = await llm_decide_intervention(events, weak_concepts, in_step)

    if intervention is None:
        return ObserveResponse(intervention=None)

    return ObserveResponse(
        intervention=InterventionOut(
            type=intervention.type,
            title=intervention.title,
            message=intervention.message,
            action_label=intervention.action_label,
            seed_question=intervention.seed_question,
            concept_id=intervention.concept_id,
        )
    )
