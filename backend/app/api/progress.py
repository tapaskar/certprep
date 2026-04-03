"""Progress and readiness dashboard endpoints."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, desc, func, select

from app.api.deps import DB, CurrentUser
from app.models.engagement import Badge, Challenge, League, LeagueMembership, UserChallenge
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


@router.get("/badges/list")
async def get_badges(user: CurrentUser, db: DB):
    """Get all badges earned by the user."""
    result = await db.execute(
        select(Badge)
        .where(Badge.user_id == user.id)
        .order_by(Badge.created_at.desc())
    )
    badges = result.scalars().all()
    return {
        "badges": [
            {
                "badge_type": b.badge_type,
                "earned_at": b.created_at.isoformat() if b.created_at else "",
                "badge_data": b.badge_data or {},
            }
            for b in badges
        ]
    }


@router.get("/league/current")
async def get_league(user: CurrentUser, db: DB):
    """Get user's current weekly league and leaderboard."""
    from datetime import date, timedelta

    today = date.today()
    # Find Monday of current week
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    # Find user's membership in this week's league
    membership_result = await db.execute(
        select(LeagueMembership, League)
        .join(League, LeagueMembership.league_id == League.id)
        .where(
            and_(
                LeagueMembership.user_id == user.id,
                League.week_start == week_start,
            )
        )
    )
    row = membership_result.one_or_none()

    if not row:
        return {
            "league_name": "Not Joined",
            "tier": 0,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "user_xp": 0,
            "user_rank": 0,
            "total_members": 0,
            "leaderboard": [],
            "days_remaining": (week_end - today).days,
        }

    membership, league = row

    # Get leaderboard
    leaderboard_result = await db.execute(
        select(LeagueMembership)
        .where(LeagueMembership.league_id == league.id)
        .order_by(desc(LeagueMembership.weekly_xp))
        .limit(20)
    )
    members = leaderboard_result.scalars().all()

    # Count total members
    count_result = await db.execute(
        select(func.count())
        .select_from(LeagueMembership)
        .where(LeagueMembership.league_id == league.id)
    )
    total = count_result.scalar() or 0

    # Build leaderboard with ranks
    leaderboard = []
    user_rank = 0
    for i, m in enumerate(members, 1):
        is_current = m.user_id == user.id
        if is_current:
            user_rank = i
        leaderboard.append({
            "display_name": m.display_name or f"Learner #{i}",
            "weekly_xp": m.weekly_xp,
            "rank": i,
            "is_current_user": is_current,
        })

    return {
        "league_name": league.name,
        "tier": league.tier,
        "week_start": league.week_start.isoformat(),
        "week_end": league.week_end.isoformat(),
        "user_xp": membership.weekly_xp,
        "user_rank": user_rank,
        "total_members": total,
        "leaderboard": leaderboard,
        "days_remaining": (week_end - today).days,
    }


@router.get("/challenges/active")
async def get_challenges(user: CurrentUser, db: DB):
    """Get active challenges with user's progress."""
    now = datetime.now(UTC)

    # Get active challenges
    challenges_result = await db.execute(
        select(Challenge).where(
            and_(
                Challenge.is_active,
                Challenge.starts_at <= now,
                Challenge.ends_at >= now,
            )
        )
    )
    challenges = challenges_result.scalars().all()

    result = []
    for challenge in challenges:
        # Get user's progress
        uc_result = await db.execute(
            select(UserChallenge).where(
                and_(
                    UserChallenge.user_id == user.id,
                    UserChallenge.challenge_id == challenge.id,
                )
            )
        )
        uc = uc_result.scalar_one_or_none()

        # Count participants
        participants = await db.execute(
            select(func.count())
            .select_from(UserChallenge)
            .where(UserChallenge.challenge_id == challenge.id)
        )
        participant_count = participants.scalar() or 0

        days_remaining = max(0, (challenge.ends_at - now).days)

        result.append({
            "id": str(challenge.id),
            "title": challenge.title,
            "description": challenge.description,
            "challenge_type": challenge.challenge_type,
            "goal_value": challenge.goal_value,
            "reward_type": challenge.reward_type,
            "reward_value": challenge.reward_value,
            "starts_at": challenge.starts_at.isoformat(),
            "ends_at": challenge.ends_at.isoformat(),
            "user_progress": uc.progress_value if uc else 0,
            "completed": uc.completed if uc else False,
            "reward_claimed": uc.reward_claimed if uc else False,
            "days_remaining": days_remaining,
            "participants_count": participant_count,
        })

    return {"challenges": result}


@router.post("/challenges/{challenge_id}/claim")
async def claim_challenge_reward(
    challenge_id: str,
    user: CurrentUser,
    db: DB,
):
    """Claim reward for a completed challenge."""
    import uuid as _uuid

    uc_result = await db.execute(
        select(UserChallenge).where(
            and_(
                UserChallenge.user_id == user.id,
                UserChallenge.challenge_id == _uuid.UUID(challenge_id),
            )
        )
    )
    uc = uc_result.scalar_one_or_none()

    if not uc or not uc.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge not completed",
        )
    if uc.reward_claimed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reward already claimed",
        )

    uc.reward_claimed = True
    await db.commit()

    return {"status": "claimed"}
