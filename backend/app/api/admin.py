"""Admin endpoints — dashboard stats, user management, content management."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import selectinload

from app.api.deps import DB, AdminUser
from app.models.exam import Concept, Exam, Question
from app.models.progress import StudySession, UserAnswer, UserExamEnrollment
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────


class QuestionStatusUpdate(BaseModel):
    review_status: str


class UserPlanUpdate(BaseModel):
    plan: str
    plan_expires_at: str | None = None  # ISO date string e.g. "2026-09-30"


# ── Dashboard Stats ──────────────────────────────────────────────


@router.get("/engagement")
async def admin_engagement(admin: AdminUser, db: DB):
    """Real engagement metrics — answers the question "is anyone actually
    using the product?". Five sections, all in one endpoint to keep the
    admin page snappy.

    1. Activation funnel: how far each cohort makes it
    2. Plan distribution: who's on what
    3. Daily activity: 14-day timeseries (signups + 4 engagement actions)
    4. Top users: who's actually engaging right now
    5. LLM cost: per-endpoint spend for the last 7 days
    6. Feature usage breakdown: which surfaces are seeing real use
    """
    now = datetime.now(timezone.utc)
    last_14_days = now - timedelta(days=14)
    last_7_days = now - timedelta(days=7)
    last_24h = now - timedelta(hours=24)

    # ── 1. Activation funnel ──
    # Each step is a count of distinct users. Sequential — each later
    # step is a subset of the prior step (signed up implies eligible
    # for verified, etc).
    total_signups = (await db.execute(select(func.count(User.id)))).scalar() or 0
    verified = (
        await db.execute(
            select(func.count(User.id)).where(User.is_email_verified.is_(True))
        )
    ).scalar() or 0
    enrolled = (
        await db.execute(
            select(func.count(func.distinct(UserExamEnrollment.user_id)))
        )
    ).scalar() or 0
    answered_1 = (
        await db.execute(select(func.count(func.distinct(UserAnswer.user_id))))
    ).scalar() or 0
    answered_10 = (
        await db.execute(
            text(
                "SELECT count(*) FROM ("
                "  SELECT user_id FROM user_answers "
                "  GROUP BY user_id HAVING count(*) >= 10"
                ") sub"
            )
        )
    ).scalar() or 0
    started_mock = (
        await db.execute(
            text("SELECT count(distinct user_id) FROM mock_exam_sessions")
        )
    ).scalar() or 0
    used_coach = (
        await db.execute(
            text("SELECT count(distinct user_id) FROM tutor_conversations")
        )
    ).scalar() or 0
    paid = (
        await db.execute(
            select(func.count(User.id)).where(User.plan != "free")
        )
    ).scalar() or 0

    funnel = [
        {"label": "Signed up", "count": total_signups, "icon": "user-plus"},
        {"label": "Verified email", "count": verified, "icon": "mail-check"},
        {"label": "Enrolled in an exam", "count": enrolled, "icon": "book"},
        {"label": "Answered ≥1 question", "count": answered_1, "icon": "check-circle"},
        {"label": "Answered ≥10 questions", "count": answered_10, "icon": "trending-up"},
        {"label": "Started a mock exam", "count": started_mock, "icon": "clipboard-list"},
        {"label": "Used AI Coach", "count": used_coach, "icon": "message-circle"},
        {"label": "Upgraded to paid", "count": paid, "icon": "crown"},
    ]

    # ── 2. Plan distribution ──
    plan_dist_result = await db.execute(
        select(User.plan, func.count(User.id))
        .group_by(User.plan)
        .order_by(func.count(User.id).desc())
    )
    plan_distribution = [
        {"plan": p or "free", "count": c} for p, c in plan_dist_result.all()
    ]

    # ── 3. Daily activity (14 days) ──
    # Stitched from generate_series so days with zero activity still
    # show up as a 0 instead of a gap (cleaner sparkline).
    daily_result = await db.execute(
        text(
            """
            WITH days AS (
              SELECT generate_series(
                date_trunc('day', now() - interval '13 days'),
                date_trunc('day', now()),
                interval '1 day'
              )::date AS day
            )
            SELECT
              d.day,
              (SELECT count(*) FROM users WHERE created_at::date = d.day) AS signups,
              (SELECT count(*) FROM user_answers WHERE answered_at::date = d.day) AS answers,
              (SELECT count(*) FROM study_sessions WHERE started_at::date = d.day) AS sessions,
              (SELECT count(*) FROM mock_exam_sessions WHERE started_at::date = d.day) AS mocks,
              (SELECT count(*) FROM tutor_conversations WHERE updated_at::date = d.day) AS coach
            FROM days d
            ORDER BY d.day
            """
        )
    )
    daily_activity = [
        {
            "day": str(row[0]),
            "signups": row[1] or 0,
            "answers": row[2] or 0,
            "sessions": row[3] or 0,
            "mocks": row[4] or 0,
            "coach": row[5] or 0,
        }
        for row in daily_result.all()
    ]

    # ── 4. Top engaged users (last 14 days) ──
    top_users_result = await db.execute(
        text(
            """
            SELECT
              u.email,
              u.display_name,
              u.plan,
              u.created_at::date AS signup_day,
              COALESCE((SELECT count(*) FROM user_answers a
                          WHERE a.user_id = u.id AND a.answered_at > :cutoff), 0) AS answers,
              COALESCE((SELECT count(*) FROM study_sessions s
                          WHERE s.user_id = u.id AND s.started_at > :cutoff), 0) AS sessions,
              COALESCE((SELECT count(*) FROM mock_exam_sessions m
                          WHERE m.user_id = u.id AND m.started_at > :cutoff), 0) AS mocks,
              COALESCE((SELECT sum(jsonb_array_length(c.messages)) FROM tutor_conversations c
                          WHERE c.user_id = u.id AND c.updated_at > :cutoff), 0) AS coach_msgs
            FROM users u
            ORDER BY answers DESC, sessions DESC, mocks DESC
            LIMIT 10
            """
        ),
        {"cutoff": last_14_days},
    )
    top_users = [
        {
            "email": row[0],
            "display_name": row[1],
            "plan": row[2],
            "signup_day": str(row[3]) if row[3] else None,
            "answers_14d": row[4],
            "sessions_14d": row[5],
            "mocks_14d": row[6],
            "coach_msgs_14d": row[7],
        }
        for row in top_users_result.all()
    ]

    # ── 5. LLM cost / API usage (last 7 days) ──
    # Reads from the existing llm_usage_log table that chat_and_log()
    # writes to on every Coach / explainer call.
    llm_result = await db.execute(
        text(
            """
            SELECT
              endpoint,
              count(*) AS calls,
              sum(input_tokens + output_tokens) AS total_tokens,
              sum(cached_tokens) AS cached_tokens,
              ROUND(sum(cost_usd)::numeric, 4) AS cost_usd,
              ROUND(avg(latency_ms)::numeric, 0) AS avg_latency_ms,
              count(*) FILTER (WHERE error IS NOT NULL) AS errors
            FROM llm_usage_log
            WHERE created_at > :cutoff
            GROUP BY endpoint
            ORDER BY cost_usd DESC NULLS LAST
            """
        ),
        {"cutoff": last_7_days},
    )
    llm_usage = [
        {
            "endpoint": row[0],
            "calls": row[1] or 0,
            "total_tokens": int(row[2] or 0),
            "cached_tokens": int(row[3] or 0),
            "cost_usd": float(row[4] or 0),
            "avg_latency_ms": int(row[5] or 0),
            "errors": row[6] or 0,
        }
        for row in llm_result.all()
    ]
    llm_total_cost = sum(r["cost_usd"] for r in llm_usage)

    # ── 6. Feature usage summary ──
    # Per-feature counts so the admin can see which surfaces are
    # actually getting use vs which are dead.
    feature_usage = []
    for label, query in [
        ("Practice questions answered (all-time)", "SELECT count(*) FROM user_answers"),
        ("Practice questions answered (last 24h)",
         f"SELECT count(*) FROM user_answers WHERE answered_at > '{last_24h.isoformat()}'"),
        ("Study sessions (all-time)", "SELECT count(*) FROM study_sessions"),
        ("Study sessions (last 24h)",
         f"SELECT count(*) FROM study_sessions WHERE started_at > '{last_24h.isoformat()}'"),
        ("Mock exams started", "SELECT count(*) FROM mock_exam_sessions"),
        ("Mock exams completed",
         "SELECT count(*) FROM mock_exam_sessions WHERE completed = true"),
        ("Coach conversations", "SELECT count(*) FROM tutor_conversations"),
        ("Coach messages exchanged",
         "SELECT COALESCE(sum(jsonb_array_length(messages)), 0) FROM tutor_conversations"),
        ("Learning paths started", "SELECT count(*) FROM user_path_progress"),
        ("Learning paths completed",
         "SELECT count(*) FROM user_path_progress WHERE completed = true"),
        ("Concepts with mastery data", "SELECT count(distinct concept_id) FROM user_concept_mastery"),
    ]:
        try:
            r = await db.execute(text(query))
            feature_usage.append({"label": label, "count": int(r.scalar() or 0)})
        except Exception:
            feature_usage.append({"label": label, "count": 0})

    return {
        "generated_at": now.isoformat(),
        "funnel": funnel,
        "plan_distribution": plan_distribution,
        "daily_activity": daily_activity,
        "top_users": top_users,
        "llm_usage_7d": llm_usage,
        "llm_total_cost_7d": round(llm_total_cost, 4),
        "feature_usage": feature_usage,
    }


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
                "plan_expires_at": (
                    user.plan_expires_at.isoformat() if user.plan_expires_at else None
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


@router.put("/users/{user_id}/plan")
async def update_user_plan(user_id: str, body: UserPlanUpdate, admin: AdminUser, db: DB):
    """Update a user's subscription plan."""
    valid_plans = {"free", "single", "pro_monthly", "pro_annual"}
    if body.plan not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Must be one of: {', '.join(valid_plans)}",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.plan = body.plan

    if body.plan == "free":
        user.plan_expires_at = None
    elif body.plan_expires_at:
        from datetime import datetime, timezone
        user.plan_expires_at = datetime.fromisoformat(body.plan_expires_at).replace(tzinfo=timezone.utc)

    await db.commit()

    return {
        "id": str(user.id),
        "email": user.email,
        "plan": user.plan,
        "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
    }


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: AdminUser, db: DB):
    """Delete a user and all their related data."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an admin user. Remove admin status first.",
        )

    # Delete related data first
    for table in [
        "user_answers",
        "study_sessions",
        "user_concept_mastery",
        "streak_history",
        "weekly_reports",
        "notifications",
        "user_exam_enrollment",
    ]:
        await db.execute(
            text(f"DELETE FROM {table} WHERE user_id = :uid"), {"uid": user_id}
        )
    await db.delete(user)
    await db.commit()

    return {"message": f"User {user.email} deleted"}


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
