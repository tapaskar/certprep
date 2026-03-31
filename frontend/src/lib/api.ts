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
  private token: string | null = "dev_user"; // Default for development

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

  // ── Study Session ──────────────────────────────────────────────

  async createSession(
    examId: string,
    durationMinutes: number,
    sessionType: string = "focused"
  ): Promise<SessionPlan> {
    return this.request("/study/session", {
      method: "POST",
      body: JSON.stringify({
        exam_id: examId,
        duration_minutes: durationMinutes,
        session_type: sessionType,
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

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ user_id: string; email: string; message: string }> {
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
    plan: string
  ): Promise<{ id: string; email: string; plan: string }> {
    return this.request(`/admin/users/${userId}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan }),
    });
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
}

export const api = new ApiClient();
