"""Mock exam endpoints — full-length timed exams with pass/fail scoring."""

import random
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, select

from app.api.deps import DB, CurrentUser
from app.models.exam import Exam, Question
from app.models.progress import MockExamSession

router = APIRouter(prefix="/mock-exam", tags=["mock-exam"])


class StartMockExamRequest(BaseModel):
    exam_id: str
    mock_number: int = 1  # 1, 2, or 3


class SubmitAnswerRequest(BaseModel):
    question_id: str
    selected_option: str


class FinishMockExamRequest(BaseModel):
    pass


@router.get("/available/{exam_id}")
async def get_available_mocks(exam_id: str, user: CurrentUser, db: DB):
    """List available mock exams and user's attempt history."""
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    # Count questions in bank
    from sqlalchemy import func
    q_count = await db.execute(
        select(func.count()).select_from(Question).where(
            and_(Question.exam_id == exam_id, Question.review_status == "approved")
        )
    )
    total_in_bank = q_count.scalar() or 0
    max_mocks = min(3, total_in_bank // max(exam.total_questions, 1))

    # Get user's past attempts
    result = await db.execute(
        select(MockExamSession).where(
            and_(
                MockExamSession.user_id == user.id,
                MockExamSession.exam_id == exam_id,
            )
        ).order_by(MockExamSession.started_at.desc())
    )
    attempts = result.scalars().all()

    mock_status = {}
    for m in range(1, 4):
        mock_attempts = [a for a in attempts if a.mock_number == m]
        best = None
        if mock_attempts:
            completed = [a for a in mock_attempts if a.completed]
            if completed:
                best = max(completed, key=lambda a: float(a.score_pct or 0))
        mock_status[m] = {
            "available": m <= max_mocks,
            "attempts": len(mock_attempts),
            "best_score": float(best.score_pct) if best else None,
            "best_passed": best.passed if best else None,
        }

    return {
        "exam_id": exam_id,
        "exam_name": exam.name,
        "total_questions": exam.total_questions,
        "time_limit_minutes": exam.time_limit_minutes,
        "passing_score_pct": exam.passing_score_pct,
        "questions_in_bank": total_in_bank,
        "mocks": mock_status,
    }


@router.post("/start")
async def start_mock_exam(request: StartMockExamRequest, user: CurrentUser, db: DB):
    """Start a timed mock exam. Returns all questions at once."""
    exam = await db.get(Exam, request.exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    if request.mock_number not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="mock_number must be 1, 2, or 3")

    # Get all approved questions
    result = await db.execute(
        select(Question).where(
            and_(
                Question.exam_id == request.exam_id,
                Question.review_status == "approved",
            )
        )
    )
    all_questions = list(result.scalars().all())

    if len(all_questions) < exam.total_questions:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions ({len(all_questions)}) for mock exam ({exam.total_questions} needed)",
        )

    # Deterministic shuffle per mock number for consistency
    rng = random.Random(f"{request.exam_id}-mock{request.mock_number}")
    rng.shuffle(all_questions)

    # Select questions weighted by domain
    selected = []
    domains = exam.domains
    total_weight = sum(d.get("weight_pct", 0) for d in domains)

    for domain in domains:
        target = max(1, round(exam.total_questions * domain["weight_pct"] / total_weight))
        domain_qs = [q for q in all_questions if q.domain_id == domain["id"] and q not in selected]
        selected.extend(domain_qs[:target])

    # Fill remaining from any domain
    remaining = exam.total_questions - len(selected)
    if remaining > 0:
        unused = [q for q in all_questions if q not in selected]
        selected.extend(unused[:remaining])

    # Trim to exact count
    selected = selected[:exam.total_questions]

    # Shuffle final order
    rng.shuffle(selected)

    # Create session
    session = MockExamSession(
        user_id=user.id,
        exam_id=request.exam_id,
        mock_number=request.mock_number,
        time_limit_minutes=exam.time_limit_minutes,
        question_ids=[q.id for q in selected],
        total_questions=len(selected),
    )
    db.add(session)
    await db.flush()

    return {
        "session_id": session.id,
        "exam_id": exam.id,
        "exam_name": exam.name,
        "mock_number": request.mock_number,
        "total_questions": len(selected),
        "time_limit_minutes": exam.time_limit_minutes,
        "passing_score_pct": exam.passing_score_pct,
        "questions": [
            {
                "id": q.id,
                "number": i + 1,
                "stem": q.stem,
                "options": q.options,
                "domain_id": q.domain_id,
            }
            for i, q in enumerate(selected)
        ],
    }


@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: UUID,
    request: SubmitAnswerRequest,
    user: CurrentUser,
    db: DB,
):
    """Submit an answer for a question in the mock exam."""
    session = await db.get(MockExamSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.completed:
        raise HTTPException(status_code=400, detail="Exam already submitted")

    answers = dict(session.answers or {})
    answers[request.question_id] = request.selected_option
    session.answers = answers
    session.questions_answered = len(answers)
    await db.flush()

    return {"status": "ok", "answered": len(answers), "total": session.total_questions}


@router.post("/{session_id}/finish")
async def finish_mock_exam(session_id: UUID, user: CurrentUser, db: DB):
    """Finish the mock exam and calculate results."""
    session = await db.get(MockExamSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.completed:
        raise HTTPException(status_code=400, detail="Exam already submitted")

    exam = await db.get(Exam, session.exam_id)
    answers = session.answers or {}

    # Score each question
    correct = 0
    domain_stats: dict[str, dict] = {}
    question_review = []

    for qid in session.question_ids:
        question = await db.get(Question, qid)
        if not question:
            continue

        selected = answers.get(qid)
        is_correct = selected == question.correct_answer if selected else False
        if is_correct:
            correct += 1

        # Track domain stats
        did = question.domain_id
        if did not in domain_stats:
            domain_stats[did] = {"correct": 0, "total": 0}
        domain_stats[did]["total"] += 1
        if is_correct:
            domain_stats[did]["correct"] += 1

        question_review.append({
            "question_id": qid,
            "selected": selected,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "domain_id": did,
            "explanation": question.explanation,
        })

    # Calculate scores
    total = session.total_questions
    score_pct = round(correct / total * 100) if total > 0 else 0
    passed = score_pct >= exam.passing_score_pct

    # Domain breakdown with pass/fail per domain
    domain_results = {}
    for domain in exam.domains:
        did = domain["id"]
        stats = domain_stats.get(did, {"correct": 0, "total": 0})
        d_score = round(stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        domain_results[did] = {
            "name": domain["name"],
            "weight_pct": domain["weight_pct"],
            "correct": stats["correct"],
            "total": stats["total"],
            "score_pct": d_score,
        }

    # Update session
    session.ended_at = datetime.now(UTC)
    session.questions_correct = correct
    session.score_pct = Decimal(str(score_pct))
    session.passed = passed
    session.domain_scores = domain_results
    session.completed = True
    await db.flush()

    return {
        "session_id": session.id,
        "exam_name": exam.name,
        "mock_number": session.mock_number,
        "score_pct": score_pct,
        "passed": passed,
        "passing_score_pct": exam.passing_score_pct,
        "correct": correct,
        "total": total,
        "unanswered": total - session.questions_answered,
        "time_taken_seconds": (
            int((session.ended_at - session.started_at).total_seconds())
            if session.ended_at and session.started_at
            else None
        ),
        "domain_scores": domain_results,
        "question_review": question_review,
    }


@router.get("/{session_id}/results")
async def get_mock_results(session_id: UUID, user: CurrentUser, db: DB):
    """Get results of a completed mock exam."""
    session = await db.get(MockExamSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.completed:
        raise HTTPException(status_code=400, detail="Exam not yet completed")

    exam = await db.get(Exam, session.exam_id)

    return {
        "session_id": session.id,
        "exam_id": session.exam_id,
        "exam_name": exam.name,
        "mock_number": session.mock_number,
        "score_pct": float(session.score_pct) if session.score_pct else 0,
        "passed": session.passed,
        "passing_score_pct": exam.passing_score_pct,
        "correct": session.questions_correct,
        "total": session.total_questions,
        "domain_scores": session.domain_scores,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
    }
