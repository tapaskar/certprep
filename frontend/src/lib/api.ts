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
}

export const api = new ApiClient();
