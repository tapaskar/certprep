"""Admin endpoints — dashboard stats, user management, content management."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import DB, AdminUser
from app.models.exam import Concept, Exam, Question
from app.models.progress import StudySession, UserAnswer, UserExamEnrollment
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────


class QuestionStatusUpdate(BaseModel):
    review_status: str


# ── Dashboard Stats ──────────────────────────────────────────────


@router.get("/stats")
async def admin_stats(admin: AdminUser, db: DB):
    """Return high-level dashboard statistics."""
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Active today (users who logged in within the last 24 hours)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    active_today_result = await db.execute(
        select(func.count(User.id)).where(User.last_login_at >= cutoff)
    )
    active_today = active_today_result.scalar() or 0

    # Total study sessions
    total_sessions_result = await db.execute(select(func.count(StudySession.id)))
    total_sessions = total_sessions_result.scalar() or 0

    # Total answers
    total_answers_result = await db.execute(select(func.count(UserAnswer.id)))
    total_answers = total_answers_result.scalar() or 0

    # Content counts
    exams_count_result = await db.execute(select(func.count(Exam.id)))
    exams_count = exams_count_result.scalar() or 0

    concepts_count_result = await db.execute(select(func.count(Concept.id)))
    concepts_count = concepts_count_result.scalar() or 0

    questions_count_result = await db.execute(select(func.count(Question.id)))
    questions_count = questions_count_result.scalar() or 0

    return {
        "total_users": total_users,
        "active_today": active_today,
        "total_sessions": total_sessions,
        "total_answers": total_answers,
        "exams_count": exams_count,
        "concepts_count": concepts_count,
        "questions_count": questions_count,
    }


# ── User Management ─────────────────────────────────────────────


@router.get("/users")
async def admin_list_users(
    admin: AdminUser,
    db: DB,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all users with pagination and enrollment counts."""
    # Subquery for enrollment count per user
    enrollment_count_sq = (
        select(
            UserExamEnrollment.user_id,
            func.count(UserExamEnrollment.id).label("enrollments_count"),
        )
        .group_by(UserExamEnrollment.user_id)
        .subquery()
    )

    query = (
        select(User, enrollment_count_sq.c.enrollments_count)
        .outerjoin(enrollment_count_sq, User.id == enrollment_count_sq.c.user_id)
        .order_by(User.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    rows = result.all()

    users = []
    for user, enrollments_count in rows:
        users.append(
            {
                "id": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "plan": user.plan,
                "is_email_verified": user.is_email_verified,
                "is_admin": user.is_admin,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login_at": (
                    user.last_login_at.isoformat() if user.last_login_at else None
                ),
                "enrollments_count": enrollments_count or 0,
            }
        )

    # Total count for pagination
    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    return {"users": users, "total": total, "limit": limit, "offset": offset}


@router.get("/users/{user_id}")
async def admin_user_detail(user_id: str, admin: AdminUser, db: DB):
    """Get detailed info for a single user including enrollments and recent sessions."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.enrollments))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Recent sessions
    sessions_result = await db.execute(
        select(StudySession)
        .where(StudySession.user_id == user_id)
        .order_by(StudySession.started_at.desc())
        .limit(10)
    )
    sessions = sessions_result.scalars().all()

    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "plan": user.plan,
        "is_email_verified": user.is_email_verified,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": (
            user.last_login_at.isoformat() if user.last_login_at else None
        ),
        "enrollments": [
            {
                "id": str(e.id),
                "exam_id": e.exam_id,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
                "overall_readiness_pct": float(e.overall_readiness_pct),
                "concepts_mastered": e.concepts_mastered,
                "concepts_total": e.concepts_total,
                "current_streak_days": e.current_streak_days,
                "is_active": e.is_active,
            }
            for e in user.enrollments
        ],
        "recent_sessions": [
            {
                "id": str(s.id),
                "exam_id": s.exam_id,
                "session_type": s.session_type,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "questions_answered": s.questions_answered,
                "questions_correct": s.questions_correct,
                "completed": s.completed,
            }
            for s in sessions
        ],
    }


@router.put("/users/{user_id}/toggle-admin")
async def toggle_admin(user_id: str, admin: AdminUser, db: DB):
    """Toggle admin status for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = not user.is_admin
    await db.commit()

    return {
        "id": str(user.id),
        "email": user.email,
        "is_admin": user.is_admin,
    }


# ── Exam / Content Management ───────────────────────────────────


@router.get("/exams")
async def admin_list_exams(admin: AdminUser, db: DB):
    """List all exams with concept and question counts."""
    # Subqueries
    concepts_sq = (
        select(
            Concept.exam_id,
            func.count(Concept.id).label("concepts_count"),
        )
        .group_by(Concept.exam_id)
        .subquery()
    )
    questions_sq = (
        select(
            Question.exam_id,
            func.count(Question.id).label("questions_count"),
        )
        .group_by(Question.exam_id)
        .subquery()
    )
    enrolled_sq = (
        select(
            UserExamEnrollment.exam_id,
            func.count(UserExamEnrollment.id).label("enrolled_users_count"),
        )
        .group_by(UserExamEnrollment.exam_id)
        .subquery()
    )

    query = (
        select(
            Exam,
            concepts_sq.c.concepts_count,
            questions_sq.c.questions_count,
            enrolled_sq.c.enrolled_users_count,
        )
        .outerjoin(concepts_sq, Exam.id == concepts_sq.c.exam_id)
        .outerjoin(questions_sq, Exam.id == questions_sq.c.exam_id)
        .outerjoin(enrolled_sq, Exam.id == enrolled_sq.c.exam_id)
    )
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": exam.id,
            "name": exam.name,
            "code": exam.code,
            "concepts_count": concepts_count or 0,
            "questions_count": questions_count or 0,
            "enrolled_users_count": enrolled_users_count or 0,
        }
        for exam, concepts_count, questions_count, enrolled_users_count in rows
    ]


@router.get("/content/questions")
async def admin_list_questions(
    admin: AdminUser,
    db: DB,
    exam_id: str = Query(...),
):
    """List questions for a specific exam."""
    result = await db.execute(
        select(Question)
        .where(Question.exam_id == exam_id)
        .order_by(Question.domain_id, Question.id)
    )
    questions = result.scalars().all()

    return [
        {
            "id": q.id,
            "stem": q.stem[:120] + ("..." if len(q.stem) > 120 else ""),
            "type": q.type,
            "difficulty": q.difficulty,
            "domain_id": q.domain_id,
            "review_status": q.review_status,
        }
        for q in questions
    ]


@router.put("/content/questions/{question_id}/status")
async def update_question_status(
    question_id: str,
    body: QuestionStatusUpdate,
    admin: AdminUser,
    db: DB,
):
    """Update the review status of a question."""
    valid_statuses = {"approved", "draft", "retired"}
    if body.review_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    question.review_status = body.review_status
    await db.commit()

    return {
        "id": question.id,
        "review_status": question.review_status,
    }
