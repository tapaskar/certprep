"""Onboarding endpoints — exam selection, diagnostic, initial setup."""

from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select

from app.api.deps import DB, CurrentUser
from app.models.exam import Concept, Exam, Question
from app.models.progress import UserConceptMastery, UserExamEnrollment
from app.schemas.study import (
    DiagnosticSubmitRequest,
    DiagnosticSubmitResponse,
    OnboardingStartRequest,
    OnboardingStartResponse,
)
from app.services.selection.diagnostic import compute_initial_mastery

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/start")
async def start_onboarding(
    request: OnboardingStartRequest,
    user: CurrentUser,
    db: DB,
) -> OnboardingStartResponse:
    """Initialize exam enrollment and preferences."""
    # Check exam exists
    exam = await db.get(Exam, request.exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    # Check not already enrolled
    existing = await db.execute(
        select(UserExamEnrollment).where(
            and_(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.exam_id == request.exam_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already enrolled in this exam",
        )

    # Count concepts
    concept_count = await db.execute(
        select(func.count()).select_from(Concept).where(Concept.exam_id == request.exam_id)
    )
    total_concepts = concept_count.scalar()

    # Create enrollment
    enrollment = UserExamEnrollment(
        user_id=user.id,
        exam_id=request.exam_id,
        exam_date=request.exam_date,
        concepts_total=total_concepts or 0,
    )
    db.add(enrollment)

    # Update user preferences
    user.daily_study_target_minutes = request.daily_study_minutes
    await db.flush()

    # Estimate study weeks
    level = request.experience_level
    weeks = 12 if level == "beginner" else (8 if level == "intermediate" else 5)

    return OnboardingStartResponse(
        enrollment_id=enrollment.id,
        exam={
            "id": exam.id,
            "name": exam.name,
            "domains": exam.domains,
        },
        diagnostic_required=True,
        estimated_study_weeks=weeks,
        next_step="diagnostic",
    )


@router.post("/diagnostic/start")
async def start_diagnostic(
    user: CurrentUser,
    db: DB,
):
    """Begin 15-question diagnostic assessment."""
    # Find active enrollment
    enrollment = await db.execute(
        select(UserExamEnrollment).where(
            and_(
                UserExamEnrollment.user_id == user.id,
                UserExamEnrollment.is_active,
                ~UserExamEnrollment.diagnostic_completed,
            )
        )
    )
    enrollment = enrollment.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active enrollment pending diagnostic",
        )

    # Select 15 questions: 3 per domain at difficulty 1, 3, 5
    exam = await db.get(Exam, enrollment.exam_id)
    domains = exam.domains

    questions = []
    for domain in domains:
        for difficulty in [1, 3, 5]:
            result = await db.execute(
                select(Question)
                .where(
                    and_(
                        Question.exam_id == enrollment.exam_id,
                        Question.domain_id == domain["id"],
                        Question.difficulty == difficulty,
                        Question.review_status == "approved",
                    )
                )
                .limit(1)
            )
            q = result.scalar_one_or_none()
            if q:
                questions.append({
                    "id": q.id,
                    "stem": q.stem,
                    "options": q.options,
                    "domain": domain["name"],
                    "difficulty": q.difficulty,
                    "time_limit_seconds": 90,
                })

    return {
        "diagnostic_id": enrollment.id,
        "questions": questions,
        "total_time_limit_minutes": 25,
    }


@router.post("/diagnostic/submit")
async def submit_diagnostic(
    request: DiagnosticSubmitRequest,
    user: CurrentUser,
    db: DB,
) -> DiagnosticSubmitResponse:
    """Submit diagnostic and initialize mastery map."""
    enrollment = await db.get(UserExamEnrollment, request.diagnostic_id)
    if not enrollment or enrollment.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    # Process answers by domain
    domain_results: dict[str, list[tuple[bool, int]]] = {}
    total_correct = 0

    for answer in request.answers:
        question = await db.get(Question, answer.question_id)
        if not question:
            continue

        is_correct = answer.selected_option == question.correct_answer
        if is_correct:
            total_correct += 1

        domain_id = question.domain_id
        if domain_id not in domain_results:
            domain_results[domain_id] = []
        domain_results[domain_id].append((is_correct, question.difficulty or 3))

    # Compute initial mastery per domain
    domain_scores = {}
    for domain_id, results in domain_results.items():
        initial = compute_initial_mastery(results)
        domain_scores[domain_id] = round(initial * 100)

        # Set mastery for all concepts in this domain
        concepts = await db.execute(
            select(Concept).where(
                and_(
                    Concept.exam_id == enrollment.exam_id,
                    Concept.domain_id == domain_id,
                )
            )
        )
        for concept in concepts.scalars():
            mastery = UserConceptMastery(
                user_id=user.id,
                concept_id=concept.id,
                mastery_probability=Decimal(str(initial)),
                mastery_level="weak" if initial < 0.4 else "familiar",
            )
            db.add(mastery)

    # Update enrollment
    score_pct = round(total_correct / len(request.answers) * 100) if request.answers else 0
    enrollment.diagnostic_completed = True
    enrollment.diagnostic_score = Decimal(str(score_pct))
    enrollment.diagnostic_completed_at = datetime.now(UTC)
    enrollment.domain_readiness = domain_scores

    overall = sum(domain_scores.values()) / max(len(domain_scores), 1)
    enrollment.overall_readiness_pct = Decimal(str(round(overall)))

    # Count concepts initialized
    concept_count = await db.execute(
        select(func.count())
        .select_from(Concept)
        .where(Concept.exam_id == enrollment.exam_id)
    )
    total = concept_count.scalar() or 0

    return DiagnosticSubmitResponse(
        score_pct=score_pct,
        domain_scores=domain_scores,
        initial_readiness_pct=round(overall),
        recommended_study_plan={
            "focus_domains": sorted(domain_scores, key=domain_scores.get)[:2],
            "weekly_target_minutes": user.daily_study_target_minutes * 5,
            "estimated_weeks_to_ready": 10,
        },
        concepts_initialized=total,
    )
