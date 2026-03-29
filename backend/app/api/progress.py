"""Progress and readiness dashboard endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select

from app.api.deps import DB, CurrentUser
from app.models.exam import Concept
from app.models.progress import StudySession, UserConceptMastery, UserExamEnrollment
from app.services.analytics.readiness import calculate_readiness

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/{exam_id}")
async def get_progress(
    exam_id: str,
    user: CurrentUser,
    db: DB,
):
    """Get full readiness dashboard data."""
    enrollment = await db.execute(
        select(UserExamEnrollment).where(
            and_(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.exam_id == exam_id,
                UserExamEnrollment.is_active,
            )
        )
    )
    enrollment = enrollment.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not enrolled")

    # Get all concept masteries
    masteries = await db.execute(
        select(UserConceptMastery, Concept)
        .join(Concept, UserConceptMastery.concept_id == Concept.id)
        .where(
            and_(
                UserConceptMastery.user_id == user.id,
                Concept.exam_id == exam_id,
            )
        )
    )

    concept_data = []
    for mastery, concept in masteries:
        concept_data.append({
            "concept_id": concept.id,
            "domain_id": concept.domain_id,
            "mastery": float(mastery.mastery_probability),
            "exam_weight": float(concept.exam_weight),
        })

    readiness = calculate_readiness(concept_data)

    # Study stats
    session_stats = await db.execute(
        select(
            func.count(StudySession.id),
            func.sum(StudySession.duration_seconds),
            func.sum(StudySession.questions_answered),
            func.sum(StudySession.questions_correct),
        ).where(
            and_(
                StudySession.user_id == user.id,
                StudySession.exam_id == exam_id,
            )
        )
    )
    stats = session_stats.one()

    total_sessions = stats[0] or 0
    total_seconds = stats[1] or 0
    total_questions = stats[2] or 0
    total_correct = stats[3] or 0

    # Overdue reviews
    from datetime import date
    overdue = await db.execute(
        select(func.count()).select_from(UserConceptMastery).where(
            and_(
                UserConceptMastery.user_id == user.id,
                UserConceptMastery.next_review_date <= date.today(),
                UserConceptMastery.next_review_date.isnot(None),
            )
        )
    )
    overdue_count = overdue.scalar() or 0

    # Weakest concepts
    weakest = await db.execute(
        select(UserConceptMastery, Concept)
        .join(Concept, UserConceptMastery.concept_id == Concept.id)
        .where(
            and_(
                UserConceptMastery.user_id == user.id,
                Concept.exam_id == exam_id,
                UserConceptMastery.mastery_probability > 0,
            )
        )
        .order_by(UserConceptMastery.mastery_probability.asc())
        .limit(5)
    )

    weakest_concepts = [
        {
            "id": concept.id,
            "name": concept.name,
            "mastery_pct": round(float(mastery.mastery_probability) * 100),
            "exam_weight": float(concept.exam_weight),
        }
        for mastery, concept in weakest
    ]

    return {
        "readiness": {
            "overall_pct": readiness.overall_readiness_pct,
            "pass_probability_pct": readiness.pass_probability_pct,
            "days_until_exam": (
                (enrollment.exam_date - date.today()).days
                if enrollment.exam_date
                else None
            ),
            "concepts_mastered": readiness.concepts_mastered,
            "concepts_total": readiness.concepts_total,
            "domain_readiness": readiness.domain_readiness,
        },
        "streak": {
            "current_days": enrollment.current_streak_days,
            "longest_days": enrollment.longest_streak_days,
            "freezes_remaining": enrollment.streak_freezes_remaining,
        },
        "study_stats": {
            "total_study_minutes": total_seconds // 60,
            "total_questions_answered": total_questions,
            "overall_accuracy_pct": (
                round(total_correct / total_questions * 100)
                if total_questions > 0
                else 0
            ),
            "avg_session_minutes": (
                round(total_seconds / total_sessions / 60)
                if total_sessions > 0
                else 0
            ),
        },
        "upcoming_reviews": {
            "overdue": overdue_count,
        },
        "weakest_concepts": weakest_concepts,
    }
