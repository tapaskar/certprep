import type {
  Exam,
  ConceptSummary,
  ConceptDetail,
  SessionPlan,
  AnswerResult,
  EndSessionResponse,
  ExplanationData,
  ProgressResponse,
  OnboardingStartRequest,
  OnboardingStartResponse,
  DiagnosticQuestion,
  DiagnosticAnswer,
  DiagnosticSubmitResponse,
} from "./api-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Content ────────────────────────────────────────────────────

  async getExams(): Promise<Exam[]> {
    return this.request("/content/exams");
  }

  async getConcepts(examId: string): Promise<ConceptSummary[]> {
    return this.request(`/content/${examId}/concepts`);
  }

  async getConceptDetail(examId: string, conceptId: string): Promise<ConceptDetail> {
    return this.request(`/content/${examId}/concept/${conceptId}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getExamDetails(examId: string): Promise<any> {
    return this.request(`/content/${examId}/details`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRoadmaps(): Promise<any[]> {
    return this.request("/content/roadmaps");
  }

  // ── Mock Exam ──────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMockExamStatus(examId: string): Promise<any> {
    return this.request(`/mock-exam/available/${examId}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async startMockExam(examId: string, mockNumber: number): Promise<any> {
    return this.request("/mock-exam/start", {
      method: "POST",
      body: JSON.stringify({ exam_id: examId, mock_number: mockNumber }),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async submitMockAnswer(sessionId: string, questionId: string, selectedOption: string): Promise<any> {
    return this.request(`/mock-exam/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, selected_option: selectedOption }),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async finishMockExam(sessionId: string): Promise<any> {
    return this.request(`/mock-exam/${sessionId}/finish`, {
      method: "POST",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMockResults(sessionId: string): Promise<any> {
    return this.request(`/mock-exam/${sessionId}/results`);
  }

  async getRecentMockExams(limit = 8): Promise<{
    attempts: Array<{
      session_id: string;
      exam_id: string;
      exam_code: string | null;
      exam_name: string;
      mock_number: number;
      started_at: string | null;
      ended_at: string | null;
      completed: boolean;
      score_pct: number | null;
      passed: boolean | null;
      passing_score_pct: number | null;
      questions_answered: number;
      total_questions: number;
    }>;
    count: number;
  }> {
    return this.request(`/mock-exam/recent?limit=${limit}`);
  }

  // ── Study Session ──────────────────────────────────────────────

  async createSession(
    examId: string,
    durationMinutes: number,
    sessionType: string = "focused",
    filters?: { concept_ids?: string[]; domain_ids?: string[] }
  ): Promise<SessionPlan> {
    return this.request("/study/session", {
      method: "POST",
      body: JSON.stringify({
        exam_id: examId,
        duration_minutes: durationMinutes,
        session_type: sessionType,
        ...(filters?.concept_ids ? { concept_ids: filters.concept_ids } : {}),
        ...(filters?.domain_ids ? { domain_ids: filters.domain_ids } : {}),
      }),
    });
  }

  async submitAnswer(
    sessionId: string,
    questionId: string,
    selectedOption: string,
    timeSeconds: number,
    confidence: number
  ): Promise<AnswerResult> {
    return this.request(`/study/session/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        selected_option: selectedOption,
        time_seconds: timeSeconds,
        confidence,
      }),
    });
  }

  async endSession(sessionId: string): Promise<EndSessionResponse> {
    return this.request(`/study/session/${sessionId}/end`, {
      method: "POST",
    });
  }

  async getExplanation(questionId: string): Promise<ExplanationData> {
    return this.request(`/study/question/${questionId}/explanation`);
  }

  // ── Progress ───────────────────────────────────────────────────

  async getProgress(examId: string): Promise<ProgressResponse> {
    return this.request(`/progress/${examId}`);
  }

  // ── Auth ───────────────────────────────────────────────────────

  /**
   * Generate + email a fresh verification code for the current user.
   * Auth-gated. Used by the dashboard's "Resend code" nudge button.
   * Replaces the previous broken pattern of calling register("") to
   * trigger a resend (which 409'd silently for existing users).
   */
  async resendVerificationCode(): Promise<{
    status: string;
    message: string;
  }> {
    return this.request("/auth/resend-verification", { method: "POST" });
  }

  /**
   * Register a new account. Returns an access token immediately so
   * the caller can route the user into the app without waiting on
   * email verification — `is_email_verified` is false on first sign-up
   * and the dashboard nudges the user to verify later.
   */
  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{
    user_id: string;
    email: string;
    message: string;
    access_token: string;
    token_type: string;
    user: { id: string; email: string; display_name: string };
    is_email_verified: boolean;
  }> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ display_name: name, email, password }),
    });
  }

  async login(
    email: string,
    password: string
  ): Promise<{
    access_token: string;
    token_type: string;
    user: { id: string; email: string; display_name: string };
  }> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyEmail(
    email: string,
    code: string
  ): Promise<{
    message: string;
    access_token: string;
    token_type: string;
    user: { id: string; email: string; display_name: string };
  }> {
    return this.request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async getMe(): Promise<{
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    timezone: string;
    plan: string;
    is_email_verified: boolean;
    is_admin: boolean;
    active_exam_id: string | null;
    enrolled_exams: { exam_id: string; exam_name: string; exam_code: string; readiness_pct: number; exam_date: string | null }[];
    created_at: string | null;
    last_login_at: string | null;
  }> {
    return this.request("/auth/me");
  }

  // ── Onboarding ─────────────────────────────────────────────────

  async startOnboarding(data: OnboardingStartRequest): Promise<OnboardingStartResponse> {
    return this.request("/onboarding/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async startDiagnostic(): Promise<{
    diagnostic_id: string;
    questions: DiagnosticQuestion[];
    total_time_limit_minutes: number;
  }> {
    return this.request("/onboarding/diagnostic/start", {
      method: "POST",
    });
  }

  async submitDiagnostic(
    diagnosticId: string,
    answers: DiagnosticAnswer[]
  ): Promise<DiagnosticSubmitResponse> {
    return this.request("/onboarding/diagnostic/submit", {
      method: "POST",
      body: JSON.stringify({
        diagnostic_id: diagnosticId,
        answers,
      }),
    });
  }

  // ── Admin ─────────────────────────────────────────────────────

  /**
   * Real engagement dashboard — funnel, daily timeseries, top users,
   * LLM cost. Replaces the bare counts from getAdminStats() as the
   * primary admin dashboard surface.
   */
  async getAdminEngagement(): Promise<{
    generated_at: string;
    funnel: { label: string; count: number; icon: string }[];
    plan_distribution: { plan: string; count: number }[];
    daily_activity: {
      day: string;
      signups: number;
      answers: number;
      sessions: number;
      mocks: number;
      coach: number;
    }[];
    top_users: {
      email: string;
      display_name: string | null;
      plan: string;
      signup_day: string | null;
      answers_14d: number;
      sessions_14d: number;
      mocks_14d: number;
      coach_msgs_14d: number;
    }[];
    llm_usage_7d: {
      endpoint: string;
      calls: number;
      total_tokens: number;
      cached_tokens: number;
      cost_usd: number;
      avg_latency_ms: number;
      errors: number;
    }[];
    llm_total_cost_7d: number;
    feature_usage: { label: string; count: number }[];
  }> {
    return this.request("/admin/engagement");
  }

  async getAdminStats(): Promise<{
    total_users: number;
    active_today: number;
    total_sessions: number;
    total_answers: number;
    exams_count: number;
    concepts_count: number;
    questions_count: number;
  }> {
    return this.request("/admin/stats");
  }

  async getAdminUsers(
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    users: Array<{
      id: string;
      email: string;
      display_name: string | null;
      plan: string;
      plan_expires_at: string | null;
      is_email_verified: boolean;
      is_admin: boolean;
      created_at: string | null;
      last_login_at: string | null;
      enrollments_count: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.request(`/admin/users?limit=${limit}&offset=${offset}`);
  }

  async getAdminUserDetail(userId: string): Promise<{
    id: string;
    email: string;
    display_name: string | null;
    plan: string;
    is_email_verified: boolean;
    is_admin: boolean;
    created_at: string | null;
    last_login_at: string | null;
    enrollments: Array<{
      id: string;
      exam_id: string;
      enrolled_at: string | null;
      overall_readiness_pct: number;
      concepts_mastered: number;
      concepts_total: number;
      current_streak_days: number;
      is_active: boolean;
    }>;
    recent_sessions: Array<{
      id: string;
      exam_id: string;
      session_type: string;
      started_at: string | null;
      ended_at: string | null;
      questions_answered: number;
      questions_correct: number;
      completed: boolean;
    }>;
  }> {
    return this.request(`/admin/users/${userId}`);
  }

  async toggleUserAdmin(
    userId: string
  ): Promise<{ id: string; email: string; is_admin: boolean }> {
    return this.request(`/admin/users/${userId}/toggle-admin`, {
      method: "PUT",
    });
  }

  async updateUserPlan(
    userId: string,
    plan: string,
    planExpiresAt?: string
  ): Promise<{ id: string; email: string; plan: string; plan_expires_at: string | null }> {
    return this.request(`/admin/users/${userId}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan, plan_expires_at: planExpiresAt || null }),
    });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}`, { method: "DELETE" });
  }

  async getAdminExams(): Promise<
    Array<{
      id: string;
      name: string;
      code: string | null;
      concepts_count: number;
      questions_count: number;
      enrolled_users_count: number;
    }>
  > {
    return this.request("/admin/exams");
  }

  async getAdminQuestions(
    examId: string
  ): Promise<
    Array<{
      id: string;
      stem: string;
      type: string;
      difficulty: number | null;
      domain_id: string;
      review_status: string;
    }>
  > {
    return this.request(`/admin/content/questions?exam_id=${examId}`);
  }

  async updateQuestionStatus(
    questionId: string,
    status: string
  ): Promise<{ id: string; review_status: string }> {
    return this.request(`/admin/content/questions/${questionId}/status`, {
      method: "PUT",
      body: JSON.stringify({ review_status: status }),
    });
  }
  // ── Payments ─────────────────────────────────────────────────

  async createCheckout(plan: string): Promise<{ checkout_url: string; plan: string }> {
    return this.request("/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  }

  /**
   * Single source of truth for the user's billing state. Powers the
   * /billing page, the /profile billing card, and the dashboard
   * plan badge — keeping all three in sync.
   */
  async getBilling(): Promise<{
    plan: string;
    plan_label: string;
    is_paid: boolean;
    is_recurring: boolean;
    expires_at: string | null;
    days_left: number | null;
    is_expiring_soon: boolean;
    can_cancel: boolean;
    can_refund: boolean;
    upgrade_url: string | null;
  }> {
    return this.request("/payments/me");
  }

  /**
   * Request cancellation of an active subscription. The user keeps
   * access until the current period ends; SparkUpCloud handles the
   * provider-side mechanics so the UI never references third parties.
   */
  async cancelSubscription(reason?: string): Promise<{
    status: string;
    access_until: string | null;
    message: string;
  }> {
    return this.request("/payments/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? null }),
    });
  }

  /**
   * Request a refund under the pass-or-refund guarantee.
   */
  async requestRefund(reason?: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.request("/payments/refund", {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? null }),
    });
  }

  // ── Engagement (Badges, Leagues, Challenges) ────────────────

  async getBadges(): Promise<{ badges: import("./api-types").Badge[] }> {
    return this.request("/progress/badges/list");
  }

  async getLeague(): Promise<import("./api-types").LeagueData> {
    return this.request("/progress/league/current");
  }

  async getChallenges(): Promise<{ challenges: import("./api-types").ChallengeData[] }> {
    return this.request("/progress/challenges/active");
  }

  async claimChallengeReward(challengeId: string): Promise<{ status: string }> {
    return this.request(`/progress/challenges/${challengeId}/claim`, {
      method: "POST",
    });
  }

  // ── Contact ──────────────────────────────────────────────────

  async sendContactMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<{ message: string }> {
    return this.request("/contact", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ── Tutor (AI Coach) — stateful per scope ───────────────────

  async tutorChat(data: {
    message: string;
    exam_id?: string;
    concept_id?: string;
    path_id?: string;
    step_id?: string;
    reset?: boolean;
  }): Promise<{
    role: "assistant";
    content: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    daily_limit: number | null;
    used_today: number;
    remaining: number | null;
  }> {
    return this.request("/tutor/chat", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTutorHistory(scope: string): Promise<{
    scope: string;
    messages: Array<{ role: "user" | "assistant"; content: string; ts?: string }>;
    total_messages: number;
    updated_at: string | null;
  }> {
    return this.request(`/tutor/history?scope=${encodeURIComponent(scope)}`);
  }

  async clearTutorHistory(scope: string): Promise<{ status: string }> {
    return this.request(`/tutor/history?scope=${encodeURIComponent(scope)}`, {
      method: "DELETE",
    });
  }

  async getTutorQuota(): Promise<{
    plan: string;
    daily_limit: number | null;
    used_today: number;
    remaining: number | null;
    unlimited: boolean;
  }> {
    return this.request("/tutor/quota");
  }

  // ── Agentic Coach: passive observation ──────────────────────
  async coachObserve(payload: {
    events: Array<{
      kind: string;
      concept_id?: string;
      concept_name?: string;
      is_correct?: boolean;
      confidence?: number;
      time_seconds?: number;
    }>;
    exam_id?: string;
    path_id?: string;
    step_id?: string;
    use_llm?: boolean;
  }): Promise<{
    intervention: {
      type: "nudge" | "intervene" | "celebrate" | "takeover_offer";
      title: string;
      message: string;
      action_label: string | null;
      seed_question: string | null;
      concept_id: string | null;
    } | null;
  }> {
    return this.request("/tutor/observe", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ── Learning Paths ────────────────────────────────────────────

  /**
   * Paths the current user has started (or completed). Used by the
   * dashboard "Resume" surface so an in-progress path like
   * `redhat-ex188-v4k` is never invisible.
   */
  async myInProgressPaths(): Promise<
    Array<{
      path_id: string;
      title: string;
      description: string | null;
      exam_code: string | null;
      exam_id: string | null;
      provider: string;
      color: string;
      difficulty: string;
      estimated_hours: number;
      total_steps: number;
      completed_steps: number;
      completion_pct: number;
      current_step_id: string | null;
      completed: boolean;
      started_at: string | null;
      completed_at: string | null;
      updated_at: string | null;
    }>
  > {
    return this.request(`/learning-paths/me/in-progress`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async listLearningPaths(filters?: { provider?: string; exam_id?: string }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (filters?.provider) qs.set("provider", filters.provider);
    if (filters?.exam_id) qs.set("exam_id", filters.exam_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/learning-paths${suffix}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getLearningPath(pathId: string): Promise<any> {
    return this.request(`/learning-paths/${pathId}`);
  }

  async startLearningPath(pathId: string): Promise<{
    path_id: string;
    current_step_id: string | null;
    completed_steps: string[];
  }> {
    return this.request(`/learning-paths/${pathId}/start`, { method: "POST" });
  }

  async completePathStep(
    pathId: string,
    stepId: string,
    quizScorePct?: number
  ): Promise<{
    step_id: string;
    completed: boolean;
    next_step_id: string | null;
    path_completed: boolean;
    completed_steps: string[];
  }> {
    return this.request(`/learning-paths/${pathId}/step/${stepId}/complete`, {
      method: "POST",
      body: JSON.stringify({ quiz_score_pct: quizScorePct ?? null }),
    });
  }

  async submitPathQuiz(
    pathId: string,
    stepId: string,
    answers: Array<{ question_id: string; selected: string }>
  ): Promise<{
    step_id: string;
    score_pct: number;
    correct: number;
    total: number;
    passed: boolean;
    results: Array<{
      question_id: string;
      selected: string | null;
      correct: string;
      is_correct: boolean;
      explanation: string;
    }>;
  }> {
    return this.request(`/learning-paths/${pathId}/step/${stepId}/quiz`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  }
}

export const api = new ApiClient();
