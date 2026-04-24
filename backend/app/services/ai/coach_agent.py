"""Agentic Coach — observes study events, decides whether to intervene.

Architecture:

  ┌─ Frontend (study session) ─┐
  │ Emits events:               │
  │   answered, viewed, idle,   │
  │   skipped, started_step     │
  └────────────────┬────────────┘
                   │ POST /tutor/observe
                   ▼
  ┌─ Rules engine (this file) ──┐
  │ 1. Hard heuristics first    │  e.g. 3-wrong-streak, misconception
  │    (free, deterministic)    │
  │ 2. If rules indecisive,     │
  │    ask Claude with tool use │  "stay_silent" | "nudge" | "intervene" | "celebrate"
  └────────────────┬────────────┘
                   ▼
       Returns Intervention | None
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

from app.services.ai.llm_provider import LLMUnavailable, get_chat_provider


InterventionType = Literal["nudge", "intervene", "celebrate", "takeover_offer"]


@dataclass
class StudyEvent:
    """One thing that happened in the study session."""

    kind: Literal[
        "answered",  # answered a question
        "viewed",  # opened a step / cheat sheet / explanation
        "idle",  # no activity for N seconds
        "started_step",  # entered a new lab step
        "completed_step",
        "submitted_quiz",
        "fact_reviewed",
    ]
    concept_id: str | None = None
    concept_name: str | None = None
    is_correct: bool | None = None
    confidence: int | None = None  # 1=guessing, 2=unsure, 3=confident
    time_seconds: float | None = None


@dataclass
class CoachIntervention:
    type: InterventionType
    title: str
    message: str
    action_label: str | None = None
    seed_question: str | None = None  # First question Coach asks if user accepts
    concept_id: str | None = None  # Concept the intervention is about


# ── Rule-based detectors (cheap, fast) ──────────────────────────────────


def _wrong_streak(events: list[StudyEvent], min_count: int = 3) -> str | None:
    """Return concept_id if last `min_count` answered events on the SAME
    concept were all wrong, else None.
    """
    answered = [e for e in events if e.kind == "answered" and e.is_correct is not None]
    if len(answered) < min_count:
        return None
    last = answered[-min_count:]
    if not all(e.is_correct is False for e in last):
        return None
    # All on same concept?
    concept_ids = [e.concept_id for e in last if e.concept_id]
    if len(set(concept_ids)) == 1 and concept_ids[0]:
        return concept_ids[0]
    return None


def _misconception_hit(events: list[StudyEvent]) -> StudyEvent | None:
    """Last answer was wrong AND user reported high confidence (3) AND
    answered quickly — classic misconception pattern.
    """
    answered = [e for e in events if e.kind == "answered" and e.is_correct is not None]
    if not answered:
        return None
    last = answered[-1]
    if (
        last.is_correct is False
        and last.confidence == 3
        and (last.time_seconds is None or last.time_seconds < 30)
    ):
        return last
    return None


def _winning_streak(events: list[StudyEvent], min_count: int = 4) -> bool:
    """Last N answers all correct and at least 2 different concepts — celebrate."""
    answered = [e for e in events if e.kind == "answered" and e.is_correct is not None]
    if len(answered) < min_count:
        return False
    last = answered[-min_count:]
    if not all(e.is_correct for e in last):
        return False
    concept_ids = [e.concept_id for e in last if e.concept_id]
    return len(set(concept_ids)) >= 2


def _idle_break(events: list[StudyEvent]) -> bool:
    """Most recent event is an idle marker > 90s."""
    if not events:
        return False
    last = events[-1]
    return last.kind == "idle" and (last.time_seconds or 0) >= 90


# ── Public entry point ─────────────────────────────────────────────────


async def decide_intervention(
    *,
    events: list[StudyEvent],
    weak_concepts: list[dict],
    in_path_step: dict | None = None,
    student_name: str | None = None,
) -> CoachIntervention | None:
    """Decide whether Coach should speak up. Returns None for silence.

    Order of operations:
      1. Cheap deterministic rules first — they handle the obvious cases.
      2. If the situation is mixed (e.g. 2/4 right, slow), ask Claude.
    """
    # ── Rule 1: 3-wrong streak on same concept → intervene ──
    wrong_concept = _wrong_streak(events)
    if wrong_concept:
        # Try to find the concept name from recent events
        cname = next(
            (
                e.concept_name
                for e in reversed(events)
                if e.concept_id == wrong_concept and e.concept_name
            ),
            "this topic",
        )
        return CoachIntervention(
            type="intervene",
            title=f"Let's pause and look at {cname}",
            message=(
                f"You've missed the last 3 questions on **{cname}**. "
                f"That usually means a piece of the underlying concept is off. "
                f"Want me to walk through it with you in 2 minutes? "
                f"You won't lose your place."
            ),
            action_label="Yes, walk me through it",
            seed_question=f"I keep getting {cname} questions wrong. Can you start by explaining the core idea, then check my understanding?",
            concept_id=wrong_concept,
        )

    # ── Rule 2: misconception detected ──
    misc = _misconception_hit(events)
    if misc:
        cname = misc.concept_name or "this question"
        return CoachIntervention(
            type="nudge",
            title="Misconception alert",
            message=(
                f"You answered **{cname}** confidently and quickly — but it was wrong. "
                f"That's the classic 'I know this' trap. Want a quick correction?"
            ),
            action_label="Show me where I went wrong",
            seed_question=f"I just got a {cname} question wrong but I was sure I knew it. What am I missing?",
            concept_id=misc.concept_id,
        )

    # ── Rule 3: winning streak → celebrate ──
    if _winning_streak(events):
        return CoachIntervention(
            type="celebrate",
            title="You're on a roll 🔥",
            message=(
                f"Last 4 answers — all correct, across different concepts. "
                f"This is a great moment to push into something harder. "
                f"Want me to throw you a tougher one?"
            ),
            action_label="Yes, level me up",
            seed_question="I've nailed the last 4. Push me with a harder scenario question.",
        )

    # ── Rule 4: long idle ──
    if _idle_break(events):
        return CoachIntervention(
            type="nudge",
            title="Stuck?",
            message="You've been on this question a while. Want a hint that doesn't give it away?",
            action_label="Yes, give me a hint",
            seed_question="I'm stuck on this question. Can you give me a hint that doesn't give the answer away?",
        )

    # ── Rule 5: in a lab step + last 2 events were "viewed" with no action → encouragement ──
    last_few = events[-3:]
    if (
        in_path_step
        and len(last_few) >= 2
        and all(e.kind == "viewed" for e in last_few[-2:])
    ):
        return CoachIntervention(
            type="nudge",
            title="Stuck on this step?",
            message=(
                f"You've been reading this step a while. Want me to break down "
                f"**{in_path_step.get('title', 'it')}** in plainer terms?"
            ),
            action_label="Yes, simplify it for me",
            seed_question=f"I'm reading the step '{in_path_step.get('title')}' but it's not clicking. Can you explain it more simply?",
        )

    # ── No deterministic intervention. Stay quiet. ──
    # (Future: optionally ask Claude to judge subtle situations — but that costs
    # a token round-trip per observation, so we skip it unless strongly motivated.)
    return None


# ── Optional: Claude-judged intervention (off by default) ───────────────


_CLAUDE_DECIDER_PROMPT = """\
You are Coach's "observation engine". You decide whether to interrupt the
student's study session.

Recent activity:
{events_summary}

Weak concepts:
{weak_summary}

{step_context}

Decide: should Coach speak up RIGHT NOW?

Respond with EXACTLY one of these JSON objects (no prose):
{{"action": "stay_silent"}}
{{"action": "nudge", "title": "...", "message": "...", "action_label": "...", "seed": "..."}}
{{"action": "intervene", "title": "...", "message": "...", "action_label": "...", "seed": "...", "concept_id": "..."}}
{{"action": "celebrate", "title": "...", "message": "..."}}

Be conservative — silence is often the right answer. Only interrupt if the
student clearly benefits from it.
"""


async def llm_decide_intervention(
    events: list[StudyEvent],
    weak_concepts: list[dict],
    in_path_step: dict | None,
) -> CoachIntervention | None:
    """Optional second-pass: ask the LLM to judge subtle cases.

    Only call this when the rules engine returned None AND the situation
    looks ambiguous (e.g. mixed correct/wrong, low confidence overall).
    Works with whichever provider is configured (Anthropic or local).
    """
    events_summary = "\n".join(
        f"- {e.kind}"
        + (f" concept={e.concept_name or e.concept_id}" if e.concept_id else "")
        + (f" correct={e.is_correct}" if e.is_correct is not None else "")
        + (f" conf={e.confidence}" if e.confidence is not None else "")
        for e in events[-10:]
    )
    weak_summary = "\n".join(
        f"- {c['name']}: {c['mastery_pct']}%" for c in (weak_concepts or [])[:5]
    ) or "—"
    step_context = (
        f"Currently on step: {in_path_step.get('title')}"
        if in_path_step
        else "Not in a learning path step."
    )

    prompt = _CLAUDE_DECIDER_PROMPT.format(
        events_summary=events_summary or "—",
        weak_summary=weak_summary,
        step_context=step_context,
    )

    provider = get_chat_provider()
    try:
        # Use the cheap "fast" model — this is a "should I intervene?"
        # judgment, not a tutoring conversation. ~12x cheaper than Sonnet.
        result = await provider.chat(
            system="",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
            fast=True,
        )
        text = result.content.strip()
    except LLMUnavailable:
        return None
    try:
        # Find first JSON object in text
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return None
        data = json.loads(text[start : end + 1])
        action = data.get("action")
        if action == "stay_silent":
            return None
        if action in ("nudge", "intervene", "celebrate"):
            return CoachIntervention(
                type=action,  # type: ignore[arg-type]
                title=data.get("title", "Coach"),
                message=data.get("message", ""),
                action_label=data.get("action_label"),
                seed_question=data.get("seed"),
                concept_id=data.get("concept_id"),
            )
    except Exception:
        return None

    return None
