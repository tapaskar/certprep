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
