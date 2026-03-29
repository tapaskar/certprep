// Types matching the actual backend Pydantic schemas and API responses

// ── Exam & Content ──────────────────────────────────────────────

export interface Exam {
  id: string;
  provider: string;
  name: string;
  code: string | null;
  total_questions: number;
  time_limit_minutes: number;
  passing_score_pct: number;
  domains: ExamDomain[];
}

export interface ExamDomain {
  id: string;
  name: string;
  weight_pct: number;
}

export interface ConceptSummary {
  id: string;
  name: string;
  domain_id: string;
  topic_id: string;
  exam_weight: number;
  difficulty_tier: number | null;
}

export interface ConceptDetail {
  concept: {
    id: string;
    name: string;
    domain_id: string;
    topic_id: string;
    description: string | null;
    exam_weight: number;
    difficulty_tier: number | null;
    key_facts: string[];
    common_misconceptions: string[];
    aws_services: string[];
  };
  user_mastery: {
    mastery_pct: number;
    level: string;
    total_attempts: number;
    accuracy_pct: number;
    next_review: string | null;
    misconception_count: number;
  } | null;
  question_count: number;
}

// ── Questions ───────────────────────────────────────────────────

export interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: string;
  stem: string;
  options: QuestionOption[];
  domain?: string;
  difficulty?: number;
  estimated_time_seconds?: number;
  question_id?: string;
  concept_ids?: string[];
}

// ── Study Session ───────────────────────────────────────────────

export interface SessionPlan {
  session_id: string;
  plan: {
    questions: Question[];
    estimated_duration_minutes: number;
  };
}

export interface MasteryUpdate {
  concept_id: string;
  concept_name: string;
  mastery_before: number;
  mastery_after: number;
  level_before: string;
  level_after: string;
  quality_score: number;
}

export interface PropagationUpdate {
  concept_id: string;
  mastery_delta: number;
  reason: string;
}

export interface AnswerResult {
  correct: boolean;
  correct_option: string;
  mastery_update: MasteryUpdate | null;
  propagation_updates: PropagationUpdate[];
  next_review_date: string | null;
  explanation_available: boolean;
  misconception_detected: boolean;
}

export interface SessionSummary {
  questions_answered: number;
  questions_correct: number;
  accuracy_pct: number;
  duration_minutes: number;
  review_cards_completed: number;
  readiness_before: number | null;
  readiness_after: number | null;
  readiness_delta: number | null;
  streak_days: number;
  streak_status: string;
  concepts_improved: { name: string; delta: string }[];
  concepts_declined: { name: string; delta: string; reason: string }[];
  misconceptions_detected: number;
  achievements_unlocked: Record<string, unknown>[];
}

export interface EndSessionResponse {
  summary: SessionSummary;
}

// ── Explanation ─────────────────────────────────────────────────

export interface ExplanationData {
  explanation: {
    text: string;
    source: string;
    why_correct?: string;
    wrong_answers?: Record<string, string>;
  };
}

// ── Progress & Readiness ────────────────────────────────────────

export interface ProgressResponse {
  readiness: {
    overall_pct: number;
    pass_probability_pct: number | null;
    days_until_exam: number | null;
    concepts_mastered: number;
    concepts_total: number;
    domain_readiness: Record<string, { score: number; trend?: string; delta_7d?: number } | number>;
  };
  streak: {
    current_days: number;
    longest_days: number;
    freezes_remaining: number;
  };
  study_stats: {
    total_study_minutes: number;
    total_questions_answered: number;
    overall_accuracy_pct: number;
    avg_session_minutes: number;
  };
  upcoming_reviews: {
    overdue: number;
  };
  weakest_concepts: {
    id: string;
    name: string;
    mastery_pct: number;
    exam_weight: number;
  }[];
}

// ── Onboarding ──────────────────────────────────────────────────

export interface OnboardingStartRequest {
  exam_id: string;
  exam_date?: string | null;
  experience_level: "beginner" | "intermediate" | "advanced";
  daily_study_minutes: number;
}

export interface OnboardingStartResponse {
  enrollment_id: string;
  exam: { id: string; name: string; domains: ExamDomain[] };
  diagnostic_required: boolean;
  estimated_study_weeks: number;
  next_step: string;
}

export interface DiagnosticQuestion {
  id: string;
  stem: string;
  options: QuestionOption[];
  domain: string;
  difficulty: number;
  time_limit_seconds: number;
}

export interface DiagnosticAnswer {
  question_id: string;
  selected_option: string;
  time_seconds: number;
}

export interface DiagnosticSubmitResponse {
  score_pct: number;
  domain_scores: Record<string, number>;
  initial_readiness_pct: number;
  recommended_study_plan: {
    focus_domains: string[];
    weekly_target_minutes: number;
    estimated_weeks_to_ready: number;
  };
  concepts_initialized: number;
}
