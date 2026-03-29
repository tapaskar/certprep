"""Pydantic schemas for study session endpoints."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

# --- Onboarding ---


class OnboardingStartRequest(BaseModel):
    exam_id: str
    exam_date: date | None = None
    experience_level: str = "intermediate"
    daily_study_minutes: int = 30
    preferred_session_time: str = "08:00"


class OnboardingStartResponse(BaseModel):
    enrollment_id: UUID
    exam: dict
    diagnostic_required: bool = True
    estimated_study_weeks: int
    next_step: str = "diagnostic"


class DiagnosticAnswer(BaseModel):
    question_id: str
    selected_option: str
    time_seconds: float


class DiagnosticSubmitRequest(BaseModel):
    diagnostic_id: UUID
    answers: list[DiagnosticAnswer]


class DiagnosticSubmitResponse(BaseModel):
    score_pct: int
    domain_scores: dict[str, int]
    initial_readiness_pct: int
    recommended_study_plan: dict
    concepts_initialized: int


# --- Study Session ---


class CreateSessionRequest(BaseModel):
    exam_id: str
    duration_minutes: int = 30
    session_type: str = "focused"


class QuestionData(BaseModel):
    id: str
    stem: str
    options: list[dict]
    domain: str | None = None
    difficulty: int | None = None
    estimated_time_seconds: int = 90


class ReviewCard(BaseModel):
    concept_id: str
    concept_name: str
    mastery_pct: int
    review_type: str
    question: QuestionData | None = None


class SessionPlanResponse(BaseModel):
    session_id: UUID
    plan: dict


class SubmitAnswerRequest(BaseModel):
    question_id: str
    selected_option: str
    time_seconds: float
    confidence: int = Field(ge=1, le=3)


class MasteryUpdate(BaseModel):
    concept_id: str
    concept_name: str
    mastery_before: float
    mastery_after: float
    level_before: str
    level_after: str
    quality_score: int


class PropagationUpdate(BaseModel):
    concept_id: str
    mastery_delta: float
    reason: str


class SubmitAnswerResponse(BaseModel):
    correct: bool
    correct_option: str
    mastery_update: MasteryUpdate
    propagation_updates: list[PropagationUpdate] = []
    next_review_date: str | None = None
    explanation_available: bool = True
    misconception_detected: bool = False


class SessionSummary(BaseModel):
    questions_answered: int
    questions_correct: int
    accuracy_pct: int
    duration_minutes: int
    review_cards_completed: int
    readiness_before: float | None
    readiness_after: float | None
    readiness_delta: float | None
    streak_days: int
    streak_status: str
    concepts_improved: list[dict] = []
    concepts_declined: list[dict] = []
    misconceptions_detected: int = 0
    achievements_unlocked: list[dict] = []


class EndSessionResponse(BaseModel):
    summary: SessionSummary


# --- Explanation ---


class ExplanationResponse(BaseModel):
    explanation: dict


# --- Progress ---


class ProgressResponse(BaseModel):
    readiness: dict
    streak: dict
    study_stats: dict
    upcoming_reviews: dict
    weakest_concepts: list[dict]


class ProgressHistoryResponse(BaseModel):
    data_points: list[dict]
