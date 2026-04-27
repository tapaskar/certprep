"""Guided Learning Paths — structured curricula with modules, steps, and quizzes."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select


def _mastery_level_from_pct(pct: float) -> str:
    """Map mastery_probability (0-100) → categorical level used in dashboards."""
    if pct >= 80:
        return "expert"
    if pct >= 60:
        return "proficient"
    if pct >= 30:
        return "novice"
    if pct > 0:
        return "learning"
    return "not_started"

from app.api.deps import DB, CurrentUser
from app.models.tutor import UserPathProgress
from app.models.progress import UserConceptMastery

router = APIRouter(prefix="/learning-paths", tags=["learning-paths"])


# ── Schemas ──────────────────────────────────────────────────────────────


class QuizAnswer(BaseModel):
    question_id: str
    selected: str


class QuizSubmitRequest(BaseModel):
    answers: list[QuizAnswer]


class StepCompleteRequest(BaseModel):
    quiz_score_pct: int | None = None  # If the step was a quiz


# ── Path loader ─────────────────────────────────────────────────────────


_PATHS_CACHE: list[dict] | None = None


def _load_paths() -> list[dict]:
    global _PATHS_CACHE
    if _PATHS_CACHE is None:
        path_file = Path(__file__).parent.parent.parent / "data" / "seed" / "learning-paths.json"
        if path_file.exists():
            _PATHS_CACHE = json.loads(path_file.read_text())
        else:
            _PATHS_CACHE = []
    return _PATHS_CACHE


def _get_path(path_id: str) -> dict | None:
    for p in _load_paths():
        if p["id"] == path_id:
            return p
    return None


def _total_steps(path: dict) -> int:
    return sum(len(m.get("steps", [])) for m in path.get("modules", []))


def _all_step_ids(path: dict) -> list[str]:
    out = []
    for m in path.get("modules", []):
        for s in m.get("steps", []):
            out.append(s["id"])
    return out


def _next_step_id(path: dict, current: str | None) -> str | None:
    ids = _all_step_ids(path)
    if not current:
        return ids[0] if ids else None
    try:
        idx = ids.index(current)
    except ValueError:
        return ids[0] if ids else None
    return ids[idx + 1] if idx + 1 < len(ids) else None


def _find_step(path: dict, step_id: str) -> tuple[dict | None, dict | None]:
    for m in path.get("modules", []):
        for s in m.get("steps", []):
            if s["id"] == step_id:
                return s, m
    return None, None


# ── Endpoints ───────────────────────────────────────────────────────────


@router.get("")
async def list_paths(provider: str | None = None, exam_id: str | None = None):
    """List all learning paths, optionally filtered by provider or exam."""
    paths = _load_paths()
    if provider:
        paths = [p for p in paths if p.get("provider") == provider]
    if exam_id:
        paths = [p for p in paths if p.get("exam_id") == exam_id]

    # Return summaries (no full step content) — lighter payload
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "exam_code": p.get("exam_code"),
            "exam_id": p.get("exam_id"),
            "provider": p.get("provider"),
            "difficulty": p.get("difficulty"),
            "estimated_hours": p.get("estimated_hours"),
            "description": p.get("description"),
            "color": p.get("color"),
            "module_count": len(p.get("modules", [])),
            "step_count": _total_steps(p),
        }
        for p in paths
    ]


@router.get("/me/in-progress")
async def my_in_progress_paths(user: CurrentUser, db: DB):
    """List the paths the current user has started (incomplete + completed).

    Surfaces a "Resume" affordance on the dashboard / paths page so users
    don't lose track of paths they've begun. Sorted by most-recently
    updated first.
    """
    result = await db.execute(
        select(UserPathProgress)
        .where(UserPathProgress.user_id == user.id)
        .order_by(UserPathProgress.updated_at.desc())
    )
    rows = result.scalars().all()

    out: list[dict] = []
    for prog in rows:
        path = _get_path(prog.path_id)
        if not path:
            # Path was removed from seed JSON — skip rather than 500.
            continue
        total = _total_steps(path)
        done = len(prog.completed_steps or [])
        out.append(
            {
                "path_id": prog.path_id,
                "title": path["title"],
                "description": path.get("description"),
                "exam_code": path.get("exam_code"),
                "exam_id": path.get("exam_id"),
                "provider": path.get("provider"),
                "color": path.get("color"),
                "difficulty": path.get("difficulty"),
                "estimated_hours": path.get("estimated_hours"),
                "total_steps": total,
                "completed_steps": done,
                "completion_pct": round((done / total) * 100) if total else 0,
                "current_step_id": prog.current_step_id,
                "completed": prog.completed,
                "started_at": prog.started_at.isoformat() if prog.started_at else None,
                "completed_at": prog.completed_at.isoformat() if prog.completed_at else None,
                "updated_at": prog.updated_at.isoformat() if prog.updated_at else None,
            }
        )
    return out


@router.get("/{path_id}")
async def get_path(path_id: str, user: CurrentUser, db: DB):
    """Get the full path (all modules + steps) plus the user's progress."""
    path = _get_path(path_id)
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Learning path not found")

    prog_result = await db.execute(
        select(UserPathProgress).where(
            and_(
                UserPathProgress.user_id == user.id,
                UserPathProgress.path_id == path_id,
            )
        )
    )
    prog = prog_result.scalar_one_or_none()

    return {
        **path,
        "progress": {
            "current_step_id": prog.current_step_id if prog else None,
            "completed_steps": prog.completed_steps if prog else [],
            "quiz_results": prog.quiz_results if prog else {},
            "completed": prog.completed if prog else False,
            "started_at": prog.started_at.isoformat() if prog else None,
            "completed_at": prog.completed_at.isoformat() if prog and prog.completed_at else None,
        },
        "total_steps": _total_steps(path),
    }


@router.post("/{path_id}/start")
async def start_path(path_id: str, user: CurrentUser, db: DB):
    """Begin (or restart) a path. Sets current_step to the first step."""
    path = _get_path(path_id)
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Learning path not found")

    first_step = _all_step_ids(path)[0] if _total_steps(path) > 0 else None

    prog_result = await db.execute(
        select(UserPathProgress).where(
            and_(
                UserPathProgress.user_id == user.id,
                UserPathProgress.path_id == path_id,
            )
        )
    )
    prog = prog_result.scalar_one_or_none()

    if prog:
        # Resume — keep completed_steps and quiz_results
        if not prog.current_step_id:
            prog.current_step_id = first_step
    else:
        prog = UserPathProgress(
            user_id=user.id,
            path_id=path_id,
            current_step_id=first_step,
            completed_steps=[],
            quiz_results={},
        )
        db.add(prog)

    await db.commit()
    await db.refresh(prog)

    return {
        "path_id": path_id,
        "current_step_id": prog.current_step_id,
        "completed_steps": prog.completed_steps,
    }


@router.post("/{path_id}/step/{step_id}/complete")
async def complete_step(
    path_id: str,
    step_id: str,
    request: StepCompleteRequest,
    user: CurrentUser,
    db: DB,
):
    """Mark a step complete and advance the cursor to the next step."""
    path = _get_path(path_id)
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Learning path not found")

    step, _ = _find_step(path, step_id)
    if not step:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Step not found in path")

    prog_result = await db.execute(
        select(UserPathProgress).where(
            and_(
                UserPathProgress.user_id == user.id,
                UserPathProgress.path_id == path_id,
            )
        )
    )
    prog = prog_result.scalar_one_or_none()

    if not prog:
        prog = UserPathProgress(
            user_id=user.id,
            path_id=path_id,
            current_step_id=step_id,
            completed_steps=[],
            quiz_results={},
        )
        db.add(prog)

    completed = list(prog.completed_steps or [])
    if step_id not in completed:
        completed.append(step_id)
    prog.completed_steps = completed

    if request.quiz_score_pct is not None:
        results = dict(prog.quiz_results or {})
        results[step_id] = {
            "score_pct": request.quiz_score_pct,
            "answered_at": datetime.now(timezone.utc).isoformat(),
        }
        prog.quiz_results = results

    next_id = _next_step_id(path, step_id)
    prog.current_step_id = next_id

    if next_id is None:
        prog.completed = True
        prog.completed_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "step_id": step_id,
        "completed": True,
        "next_step_id": next_id,
        "path_completed": prog.completed,
        "completed_steps": prog.completed_steps,
    }


@router.post("/{path_id}/step/{step_id}/quiz")
async def submit_quiz(
    path_id: str,
    step_id: str,
    request: QuizSubmitRequest,
    user: CurrentUser,
    db: DB,
):
    """Grade a quiz step's answers. Returns per-question correctness + overall %."""
    path = _get_path(path_id)
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Learning path not found")

    step, _ = _find_step(path, step_id)
    if not step:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Step not found")
    if step.get("type") != "quiz":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Step is not a quiz")

    questions = step.get("questions", [])
    questions_by_id = {q["id"]: q for q in questions}

    answer_map = {a.question_id: a.selected for a in request.answers}

    correct = 0
    results: list[dict] = []
    for q in questions:
        sel = answer_map.get(q["id"])
        is_correct = sel == q.get("correct")
        if is_correct:
            correct += 1
        results.append(
            {
                "question_id": q["id"],
                "selected": sel,
                "correct": q.get("correct"),
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            }
        )

    total = len(questions)
    score_pct = round(correct / total * 100) if total else 0
    passed = score_pct >= 70  # Threshold for passing a module quiz

    # Persist score
    prog_result = await db.execute(
        select(UserPathProgress).where(
            and_(
                UserPathProgress.user_id == user.id,
                UserPathProgress.path_id == path_id,
            )
        )
    )
    prog = prog_result.scalar_one_or_none()
    if not prog:
        prog = UserPathProgress(
            user_id=user.id,
            path_id=path_id,
            current_step_id=step_id,
            completed_steps=[],
            quiz_results={},
        )
        db.add(prog)
    quiz_results = dict(prog.quiz_results or {})
    quiz_results[step_id] = {
        "score_pct": score_pct,
        "correct": correct,
        "total": total,
        "answered_at": datetime.now(timezone.utc).isoformat(),
    }
    prog.quiz_results = quiz_results

    # ── Cross-feature integration: Path quiz pass → Study mastery boost ──
    # If the step is tagged with concept_ids and the user passed (≥70%),
    # bump those concepts in UserConceptMastery so the Study side of the
    # app sees them as practiced. Without this, the same person could be
    # 80% mastered in Study and 0% in Paths for the same concept — two
    # progress universes for one brain.
    #
    # No-op when:
    #   - step has no `concept_ids` (most current paths) — degrades silently
    #   - the concept_id doesn't exist in the concepts table — FK fails,
    #     we swallow and continue (path content can outpace concept seed)
    #   - user didn't pass — no mastery boost from a failed attempt
    boosted_concepts: list[str] = []
    if passed:
        concept_ids = step.get("concept_ids") or []
        # Boost amount scales with quiz score: 70% → +0.10, 100% → +0.25
        boost = 0.10 + ((score_pct - 70) / 30.0) * 0.15
        boost = max(0.05, min(0.25, boost))
        for cid in concept_ids:
            try:
                m_result = await db.execute(
                    select(UserConceptMastery).where(
                        and_(
                            UserConceptMastery.user_id == user.id,
                            UserConceptMastery.concept_id == cid,
                        )
                    )
                )
                mastery = m_result.scalar_one_or_none()
                if mastery is None:
                    # First touch — start at the boost level so it shows up
                    # in weak-concepts surfaces immediately.
                    mastery = UserConceptMastery(
                        user_id=user.id,
                        concept_id=cid,
                        mastery_probability=Decimal(str(round(boost, 4))),
                        mastery_level=_mastery_level_from_pct(boost * 100),
                        total_attempts=total,
                        correct_attempts=correct,
                    )
                    db.add(mastery)
                else:
                    new_p = min(0.99, float(mastery.mastery_probability) + boost)
                    mastery.mastery_probability = Decimal(str(round(new_p, 4)))
                    mastery.mastery_level = _mastery_level_from_pct(new_p * 100)
                    mastery.total_attempts = (mastery.total_attempts or 0) + total
                    mastery.correct_attempts = (mastery.correct_attempts or 0) + correct
                boosted_concepts.append(cid)
            except Exception:  # noqa: BLE001 — content drift mustn't break quiz submit
                continue

    await db.commit()

    return {
        "step_id": step_id,
        "score_pct": score_pct,
        "correct": correct,
        "total": total,
        "passed": passed,
        "results": results,
        "concepts_boosted": boosted_concepts,
    }
