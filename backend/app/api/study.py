"""Study session endpoints — the core study experience."""

import uuid
from datetime import UTC, date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select

from app.api.deps import DB, CurrentUser
from app.models.exam import Concept, Question
from app.models.engagement import Badge, Challenge, League, LeagueMembership, UserChallenge
from app.models.progress import (
    StudySession,
    UserAnswer,
    UserConceptMastery,
    UserExamEnrollment,
)
from app.schemas.study import (
    CreateSessionRequest,
    EndSessionResponse,
    ExplanationResponse,
    MasteryUpdate,
    SessionSummary,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.schemas.study import (
    PropagationUpdate as PropagationUpdateSchema,
)
from app.services.engagement.spaced_rep import update_review
from app.services.mastery.bkt import get_mastery_level, update_mastery
from app.services.mastery.propagation import compute_lateral_transfers

router = APIRouter(prefix="/study", tags=["study"])

# Plan-based daily question limits
PLAN_DAILY_LIMITS: dict[str, int | None] = {
    "free": 10,
    "single": None,  # unlimited for enrolled exam
    "pro_monthly": None,
    "pro_annual": None,
}


async def _get_questions_answered_today(db, user_id: str) -> int:
    """Count how many questions the user answered today."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count()).select_from(UserAnswer).where(
            and_(
                UserAnswer.user_id == user_id,
                UserAnswer.answered_at >= today_start,
            )
        )
    )
    return result.scalar() or 0


@router.get("/quota")
async def get_daily_quota(user: CurrentUser, db: DB):
    """Return the user's daily question quota and usage."""
    limit = PLAN_DAILY_LIMITS.get(user.plan, 10)
    answered = await _get_questions_answered_today(db, str(user.id))
    return {
        "plan": user.plan,
        "daily_limit": limit,
        "answered_today": answered,
        "remaining": max(0, limit - answered) if limit is not None else None,
        "unlimited": limit is None,
    }


@router.post("/session")
async def create_session(
    request: CreateSessionRequest,
    user: CurrentUser,
    db: DB,
):
    """Create a new study session with AI-composed plan."""
    # ── Plan-based gating ──────────────────────────────────
    daily_limit = PLAN_DAILY_LIMITS.get(user.plan, 10)
    if daily_limit is not None:
        answered_today = await _get_questions_answered_today(db, str(user.id))
        if answered_today >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Daily limit reached ({daily_limit} questions). Upgrade your plan for unlimited access.",
            )

    # Check plan expiry
    if user.plan != "free" and user.plan_expires_at:
        if user.plan_expires_at < datetime.now(timezone.utc):
            # Plan expired — downgrade to free
            user.plan = "free"
            user.plan_expires_at = None
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your plan has expired. You've been moved to the Free plan (10 questions/day). Upgrade to continue with unlimited access.",
            )

    # Verify enrollment
    enrollment = await db.execute(
        select(UserExamEnrollment).where(
            and_(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.exam_id == request.exam_id,
                UserExamEnrollment.is_active,
            )
        )
    )
    enrollment = enrollment.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enrolled in this exam",
        )

    # Map session type
    type_map = {
        "daily_briefing": "daily_briefing",
        "focused": f"focused_{request.duration_minutes}",
        "smart_review": "smart_review",
    }
    session_type = type_map.get(request.session_type, f"focused_{request.duration_minutes}")

    # Get questions for the session (cap for free users)
    max_questions = int(request.duration_minutes / 2)
    if daily_limit is not None:
        remaining = daily_limit - (await _get_questions_answered_today(db, str(user.id)))
        max_questions = min(max_questions, remaining)

    # ── Intelligent question selection using bandit + mastery data ──
    from app.services.selection.bandit import (
        get_budget,
        remediation_score,
        reinforcement_score,
        exploration_score,
        ConceptScore,
        SelectionArm,
    )

    days_to_exam = None
    if enrollment.exam_date:
        days_to_exam = (enrollment.exam_date - date.today()).days

    budget = get_budget(days_to_exam)

    # Get user's concept mastery state
    mastery_result = await db.execute(
        select(UserConceptMastery, Concept)
        .join(Concept, UserConceptMastery.concept_id == Concept.id)
        .where(
            and_(
                UserConceptMastery.user_id == user.id,
                Concept.exam_id == request.exam_id,
            )
        )
    )
    mastery_records = mastery_result.all()
    mastery_map = {
        m.concept_id: (float(m.mastery_probability), m)
        for m, _ in mastery_records
    }

    # Get all concepts for this exam
    all_concepts_result = await db.execute(
        select(Concept).where(Concept.exam_id == request.exam_id)
    )
    all_concepts = all_concepts_result.scalars().all()

    # Score each concept by all three arms
    concept_scores: list[tuple[str, float, SelectionArm]] = []
    for concept in all_concepts:
        mastery_val, mastery_rec = mastery_map.get(concept.id, (0.0, None))
        weight = float(concept.exam_weight) if concept.exam_weight else 0.05

        # Check if concept had recent failure (last 3 answers)
        recent_answers = await db.execute(
            select(UserAnswer.is_correct)
            .join(Question, UserAnswer.question_id == Question.id)
            .where(
                and_(
                    UserAnswer.user_id == user.id,
                    Question.concept_ids.contains([concept.id]),
                )
            )
            .order_by(UserAnswer.answered_at.desc())
            .limit(3)
        )
        recent = [r[0] for r in recent_answers.all()]
        had_recent_failure = any(not r for r in recent)

        # Days until review due
        days_until_due = None
        if mastery_rec and mastery_rec.next_review_date:
            days_until_due = (mastery_rec.next_review_date - date.today()).days

        # Score by each arm
        rem_score = remediation_score(mastery_val, weight, had_recent_failure) * budget["remediate"]
        rein_score = reinforcement_score(mastery_val, weight, days_until_due) * budget["reinforce"]
        exp_score = exploration_score(mastery_val, weight, prereqs_met=True) * budget["explore"]

        # Pick the arm with the highest score for this concept
        best_score = max(rem_score, rein_score, exp_score)
        if best_score == rem_score:
            arm = SelectionArm.REMEDIATE
        elif best_score == rein_score:
            arm = SelectionArm.REINFORCE
        else:
            arm = SelectionArm.EXPLORE

        if best_score > 0:
            concept_scores.append((concept.id, best_score, arm))

    # Sort by score descending and pick top concepts
    concept_scores.sort(key=lambda x: x[1], reverse=True)
    selected_concept_ids = [cs[0] for cs in concept_scores[:max_questions * 2]]

    # ── Explicit user filters from the study explorer ──────────
    # If the user clicked a specific concept or domain in the left explorer,
    # honor that selection instead of the adaptive picker. When the user
    # explicitly filters, we MUST NOT backfill with random questions from
    # other domains — that would silently show them the wrong topic.
    has_explicit_filter = bool(request.concept_ids) or bool(request.domain_ids)
    if request.concept_ids:
        selected_concept_ids = request.concept_ids
    elif request.domain_ids:
        # Resolve domain_ids → all concept_ids in those domains
        domain_concepts_result = await db.execute(
            select(Concept.id).where(
                and_(
                    Concept.exam_id == request.exam_id,
                    Concept.domain_id.in_(request.domain_ids),
                )
            )
        )
        selected_concept_ids = [r[0] for r in domain_concepts_result.all()]

    # Get questions the user has NOT recently answered for the selected concepts
    recently_answered_result = await db.execute(
        select(UserAnswer.question_id)
        .where(UserAnswer.user_id == user.id)
        .order_by(UserAnswer.answered_at.desc())
        .limit(100)
    )
    recently_answered_ids = {r[0] for r in recently_answered_result.all()}

    # Build question filter
    question_filter = and_(
        Question.exam_id == request.exam_id,
        Question.review_status == "approved",
    )
    if user.plan == "free":
        question_filter = and_(
            question_filter,
            Question.difficulty <= 3,
        )

    # Fetch candidate questions that match selected concepts
    # First try: questions explicitly mapped to selected concepts
    from sqlalchemy.dialects.postgresql import array
    from sqlalchemy import cast, String as SAString, any_

    concept_matched_questions = []
    if selected_concept_ids:
        for concept_id in selected_concept_ids[:10]:  # Top 10 concepts
            cq_result = await db.execute(
                select(Question)
                .where(
                    and_(
                        question_filter,
                        Question.concept_ids.contains([concept_id]),
                    )
                )
                .order_by(func.random())
                .limit(max_questions)
            )
            concept_matched_questions.extend(cq_result.scalars().all())

    # Deduplicate
    seen_ids = set()
    unique_concept_questions = []
    for q in concept_matched_questions:
        if q.id not in seen_ids:
            seen_ids.add(q.id)
            unique_concept_questions.append(q)

    # If the user explicitly filtered by concept/domain, honor that filter
    # strictly — do NOT backfill. Returning fewer-than-requested questions
    # (or zero) is preferable to showing the user the wrong topic.
    if has_explicit_filter:
        candidate_questions = unique_concept_questions
    elif len(unique_concept_questions) >= max_questions:
        candidate_questions = unique_concept_questions
    else:
        # Adaptive mode — backfill with other exam questions so the session
        # is never empty when the bandit falls short.
        backfill_result = await db.execute(
            select(Question)
            .where(
                and_(
                    question_filter,
                    Question.id.notin_(seen_ids) if seen_ids else True,
                )
            )
            .order_by(func.random())
            .limit(max_questions * 2)
        )
        candidate_questions = unique_concept_questions + list(backfill_result.scalars().all())

    # Sort: prefer questions for high-scoring concepts that haven't been recently answered
    concept_rank = {cid: i for i, (cid, _, _) in enumerate(concept_scores)}

    def question_priority(q: Question) -> tuple[int, int, float]:
        # (not_recently_answered, concept_rank, random_jitter)
        is_recent = q.id in recently_answered_ids
        best_rank = min(
            (concept_rank.get(cid, 999) for cid in (q.concept_ids or [])),
            default=999,
        )
        import random as _rand
        return (0 if is_recent else 1, -best_rank, _rand.random())

    candidate_questions.sort(key=question_priority, reverse=True)
    questions = candidate_questions[:max_questions]

    # When the user explicitly filtered but no questions matched, fail fast
    # with a clear message instead of creating an empty session.
    if has_explicit_filter and len(questions) == 0:
        target = (
            f"concept '{request.concept_ids[0]}'" if request.concept_ids
            else f"domain '{request.domain_ids[0]}'"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No practice questions available yet for {target}. Try another concept or the adaptive session.",
        )

    # Create session
    session = StudySession(
        user_id=user.id,
        exam_id=request.exam_id,
        session_type=session_type,
        readiness_before=float(enrollment.overall_readiness_pct),
        plan={
            "questions": [
                {
                    "question_id": q.id,
                    "stem": q.stem,
                    "options": q.options,
                    "concept_ids": q.concept_ids,
                }
                for q in questions
            ],
            "estimated_duration_minutes": request.duration_minutes,
        },
    )
    db.add(session)
    await db.flush()

    return {
        "session_id": session.id,
        "plan": session.plan,
    }


@router.post("/session/{session_id}/answer")
async def submit_answer(
    session_id: uuid.UUID,
    request: SubmitAnswerRequest,
    user: CurrentUser,
    db: DB,
) -> SubmitAnswerResponse:
    """Submit an answer and get real-time mastery update."""
    # Get session
    session = await db.get(StudySession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Get question
    question = await db.get(Question, request.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    is_correct = request.selected_option == question.correct_answer

    # Get or create mastery for primary concept
    primary_concept_id = question.concept_ids[0] if question.concept_ids else None
    concept = await db.get(Concept, primary_concept_id) if primary_concept_id else None

    mastery_update_data = None
    propagation_updates = []
    next_review_date_str = None
    was_misconception = False

    if concept:
        mastery_record = await db.execute(
            select(UserConceptMastery).where(
                and_(
                    UserConceptMastery.user_id == user.id,
                    UserConceptMastery.concept_id == concept.id,
                )
            )
        )
        mastery_record = mastery_record.scalar_one_or_none()

        if not mastery_record:
            mastery_record = UserConceptMastery(
                user_id=user.id,
                concept_id=concept.id,
            )
            db.add(mastery_record)
            await db.flush()

        current_mastery = float(mastery_record.mastery_probability)

        # Run BKT update
        bkt_result = update_mastery(
            current_mastery=current_mastery,
            is_correct=is_correct,
            question_type=question.type,
            response_time_seconds=request.time_seconds,
            expected_time_seconds=question.estimated_time_seconds,
            confidence=request.confidence,
            p_guess=float(question.bkt_p_guess) if question.bkt_p_guess else None,
            p_slip=float(question.bkt_p_slip) if question.bkt_p_slip else None,
            p_transit=float(question.bkt_p_transit) if question.bkt_p_transit else None,
        )

        was_misconception = bkt_result.was_misconception

        # Update mastery record
        mastery_record.mastery_probability = Decimal(str(round(bkt_result.mastery_after, 4)))
        mastery_record.mastery_level = bkt_result.level_after
        mastery_record.total_attempts += 1
        if is_correct:
            mastery_record.correct_attempts += 1
        if was_misconception:
            mastery_record.misconception_count += 1
        mastery_record.last_mastery_update_at = datetime.now(UTC)

        # Update SM-2 review schedule
        enrollment = await db.execute(
            select(UserExamEnrollment).where(
                and_(
                    UserExamEnrollment.user_id == user.id,
                    UserExamEnrollment.exam_id == question.exam_id,
                )
            )
        )
        enrollment = enrollment.scalar_one_or_none()
        days_to_exam = None
        if enrollment and enrollment.exam_date:
            days_to_exam = (enrollment.exam_date - date.today()).days

        review_state = update_review(
            easiness_factor=float(mastery_record.easiness_factor),
            interval_days=float(mastery_record.interval_days),
            repetition_count=mastery_record.repetition_count,
            quality=bkt_result.quality_score,
            days_to_exam=days_to_exam,
        )

        mastery_record.easiness_factor = Decimal(str(review_state.easiness_factor))
        mastery_record.interval_days = Decimal(str(review_state.interval_days))
        mastery_record.repetition_count = review_state.repetition_count
        mastery_record.next_review_date = review_state.next_review_date
        mastery_record.last_review_date = review_state.last_review_date

        next_review_date_str = (
            review_state.next_review_date.isoformat()
            if review_state.next_review_date
            else None
        )

        # Lateral propagation
        if concept.lateral_relations:
            mastery_map = {}
            for rel in concept.lateral_relations:
                related = await db.execute(
                    select(UserConceptMastery).where(
                        and_(
                            UserConceptMastery.user_id == user.id,
                            UserConceptMastery.concept_id == rel["concept_id"],
                        )
                    )
                )
                r = related.scalar_one_or_none()
                mastery_map[rel["concept_id"]] = float(r.mastery_probability) if r else 0.0

            prop_updates = compute_lateral_transfers(
                concept.lateral_relations, mastery_map, is_correct
            )
            for pu in prop_updates:
                related_mastery = await db.execute(
                    select(UserConceptMastery).where(
                        and_(
                            UserConceptMastery.user_id == user.id,
                            UserConceptMastery.concept_id == pu.concept_id,
                        )
                    )
                )
                rm = related_mastery.scalar_one_or_none()
                if rm:
                    new_val = float(rm.mastery_probability) + pu.mastery_delta
                    rm.mastery_probability = Decimal(str(min(0.99, new_val)))
                    rm.mastery_level = get_mastery_level(float(rm.mastery_probability))

            propagation_updates = [
                PropagationUpdateSchema(
                    concept_id=pu.concept_id,
                    mastery_delta=pu.mastery_delta,
                    reason=pu.reason,
                )
                for pu in prop_updates
            ]

        mastery_update_data = MasteryUpdate(
            concept_id=concept.id,
            concept_name=concept.name,
            mastery_before=bkt_result.mastery_before,
            mastery_after=bkt_result.mastery_after,
            level_before=bkt_result.level_before,
            level_after=bkt_result.level_after,
            quality_score=bkt_result.quality_score,
        )

    # Record answer
    answer = UserAnswer(
        user_id=user.id,
        question_id=question.id,
        session_id=session_id,
        selected_option=request.selected_option,
        is_correct=is_correct,
        response_time_seconds=Decimal(str(request.time_seconds)),
        confidence_rating=request.confidence,
        mastery_before=Decimal(str(bkt_result.mastery_before)) if mastery_update_data else None,
        mastery_after=Decimal(str(bkt_result.mastery_after)) if mastery_update_data else None,
        quality_score=bkt_result.quality_score if mastery_update_data else None,
        was_misconception=was_misconception,
    )
    db.add(answer)

    # Update session counters
    session.questions_answered += 1
    if is_correct:
        session.questions_correct += 1

    return SubmitAnswerResponse(
        correct=is_correct,
        correct_option=question.correct_answer,
        mastery_update=mastery_update_data,
        propagation_updates=propagation_updates,
        next_review_date=next_review_date_str,
        explanation_available=True,
        misconception_detected=was_misconception,
    )


@router.post("/session/{session_id}/end")
async def end_session(
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> EndSessionResponse:
    """End a study session and get summary."""
    session = await db.get(StudySession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    now = datetime.now(UTC)
    session.ended_at = now
    session.duration_seconds = int((now - session.started_at).total_seconds())
    session.completed = True

    # Get enrollment for streak
    enrollment = await db.execute(
        select(UserExamEnrollment).where(
            and_(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.exam_id == session.exam_id,
            )
        )
    )
    enrollment = enrollment.scalar_one_or_none()

    streak_days = 0
    new_badges: list[dict] = []
    session_xp = 0

    if enrollment:
        enrollment.last_active_date = date.today()
        enrollment.current_streak_days += 1
        if enrollment.current_streak_days > enrollment.longest_streak_days:
            enrollment.longest_streak_days = enrollment.current_streak_days
        streak_days = enrollment.current_streak_days

        # --- XP Persistence (Layer 2) ---
        concept_xp = session.concepts_explored * 10
        correct_xp = session.questions_correct * 5
        completion_xp = 20
        session_xp = concept_xp + correct_xp + completion_xp
        enrollment.total_xp += session_xp
        enrollment.weekly_xp += session_xp

        # --- League XP update (Layer 2) ---
        from datetime import timedelta

        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        membership_result = await db.execute(
            select(LeagueMembership)
            .join(League, LeagueMembership.league_id == League.id)
            .where(
                and_(
                    LeagueMembership.user_id == user.id,
                    League.week_start == week_start,
                )
            )
        )
        membership = membership_result.scalar_one_or_none()

        if membership:
            membership.weekly_xp += session_xp
        else:
            # Auto-assign to a league
            league_result = await db.execute(
                select(League)
                .where(League.week_start == week_start)
                .order_by(League.created_at.desc())
                .limit(1)
            )
            league = league_result.scalar_one_or_none()

            # Check if league is full (20 members)
            need_new = True
            if league:
                count_result = await db.execute(
                    select(func.count())
                    .select_from(LeagueMembership)
                    .where(LeagueMembership.league_id == league.id)
                )
                member_count = count_result.scalar() or 0
                if member_count < 20:
                    need_new = False

            if need_new:
                league = League(
                    name="Bronze",
                    tier=1,
                    week_start=week_start,
                    week_end=week_end,
                )
                db.add(league)
                await db.flush()

            new_membership = LeagueMembership(
                user_id=user.id,
                league_id=league.id,
                weekly_xp=session_xp,
                display_name=user.display_name,
            )
            db.add(new_membership)

        # --- Badge checks (Layer 1) ---
        streak_milestones = {7: "streak_7", 14: "streak_14", 30: "streak_30", 60: "streak_60", 100: "streak_100"}
        for milestone, badge_type in streak_milestones.items():
            if streak_days >= milestone:
                existing = await db.execute(
                    select(Badge).where(
                        and_(Badge.user_id == user.id, Badge.badge_type == badge_type)
                    )
                )
                if not existing.scalar_one_or_none():
                    badge = Badge(user_id=user.id, badge_type=badge_type, badge_data={"streak": streak_days})
                    db.add(badge)
                    new_badges.append({"type": badge_type, "streak": streak_days})

        # First session badge
        first_session_result = await db.execute(
            select(func.count()).select_from(StudySession).where(
                and_(StudySession.user_id == user.id, StudySession.completed)
            )
        )
        total_sessions_count = (first_session_result.scalar() or 0) + 1  # +1 for current
        if total_sessions_count == 1:
            existing = await db.execute(
                select(Badge).where(and_(Badge.user_id == user.id, Badge.badge_type == "first_session"))
            )
            if not existing.scalar_one_or_none():
                db.add(Badge(user_id=user.id, badge_type="first_session", badge_data={}))
                new_badges.append({"type": "first_session"})

        # Questions milestones
        from app.models.progress import UserAnswer as UA
        total_q_result = await db.execute(
            select(func.count()).select_from(UA).where(UA.user_id == user.id)
        )
        total_questions_ever = total_q_result.scalar() or 0
        for threshold, badge_type in [(100, "questions_100"), (500, "questions_500")]:
            if total_questions_ever >= threshold:
                existing = await db.execute(
                    select(Badge).where(and_(Badge.user_id == user.id, Badge.badge_type == badge_type))
                )
                if not existing.scalar_one_or_none():
                    db.add(Badge(user_id=user.id, badge_type=badge_type, badge_data={"total": total_questions_ever}))
                    new_badges.append({"type": badge_type})

        # --- Challenge progress (Layer 3) ---
        active_challenges = await db.execute(
            select(Challenge).where(
                and_(
                    Challenge.is_active,
                    Challenge.starts_at <= now,
                    Challenge.ends_at >= now,
                )
            )
        )
        for challenge in active_challenges.scalars():
            uc_result = await db.execute(
                select(UserChallenge).where(
                    and_(
                        UserChallenge.user_id == user.id,
                        UserChallenge.challenge_id == challenge.id,
                    )
                )
            )
            uc = uc_result.scalar_one_or_none()
            if not uc:
                uc = UserChallenge(user_id=user.id, challenge_id=challenge.id, progress_value=0)
                db.add(uc)
                await db.flush()

            if not uc.completed:
                if challenge.challenge_type == "questions_answered":
                    uc.progress_value += session.questions_answered
                elif challenge.challenge_type == "study_minutes":
                    uc.progress_value += (session.duration_seconds or 0) // 60
                elif challenge.challenge_type == "streak_days":
                    uc.progress_value = streak_days

                if uc.progress_value >= challenge.goal_value:
                    uc.completed = True
                    uc.completed_at = now

    await db.commit()

    accuracy = (
        round(session.questions_correct / session.questions_answered * 100)
        if session.questions_answered > 0
        else 0
    )

    return EndSessionResponse(
        summary=SessionSummary(
            questions_answered=session.questions_answered,
            questions_correct=session.questions_correct,
            accuracy_pct=accuracy,
            duration_minutes=session.duration_seconds // 60 if session.duration_seconds else 0,
            review_cards_completed=session.review_cards_completed,
            readiness_before=session.readiness_before,
            readiness_after=session.readiness_after,
            readiness_delta=(
                float(session.readiness_after - session.readiness_before)
                if session.readiness_before and session.readiness_after
                else None
            ),
            streak_days=streak_days,
            streak_status="maintained" if streak_days > 0 else "none",
            achievements_unlocked=new_badges,
        )
    )


@router.get("/question/{question_id}/explanation")
async def get_explanation(
    question_id: str,
    user: CurrentUser,
    db: DB,
) -> ExplanationResponse:
    """Get explanation for a question."""
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    return ExplanationResponse(
        explanation={
            "text": question.explanation.get("why_correct", ""),
            "source": "cached",
            "why_correct": question.explanation.get("why_correct", ""),
            "wrong_answers": {
                k: v
                for k, v in question.explanation.items()
                if k.startswith("why_not_")
            },
        }
    )
