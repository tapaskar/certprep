"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

type Phase = "select" | "exam" | "results";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Question = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockStatus = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Results = any;

export default function MockExamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const examId = searchParams.get("examId") || "";

  const [phase, setPhase] = useState<Phase>("select");
  const [mockStatus, setMockStatus] = useState<MockStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Exam state
  const [sessionId, setSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [passingScore, setPassingScore] = useState(72);

  // Results
  const [results, setResults] = useState<Results | null>(null);

  // Load mock exam status
  useEffect(() => {
    if (!examId) return;
    api
      .getMockExamStatus(examId)
      .then(setMockStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  // Timer
  useEffect(() => {
    if (phase !== "exam" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const handleStart = async (mockNumber: number) => {
    setLoading(true);
    try {
      const data = await api.startMockExam(examId, mockNumber);
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setTimeLeft(data.time_limit_minutes * 60);
      setTotalTime(data.time_limit_minutes * 60);
      setPassingScore(data.passing_score_pct);
      setCurrentIndex(0);
      setAnswers({});
      setFlagged(new Set());
      setPhase("exam");
    } catch {
      alert("Failed to start mock exam");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    await api.submitMockAnswer(sessionId, questionId, option).catch(() => {});
  };

  const handleFinish = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await api.finishMockExam(sessionId);
      setResults(data);
      setPhase("results");
    } catch {
      alert("Failed to submit exam");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const toggleFlag = (idx: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading && !questions.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    );
  }

  // ── SELECT MOCK ──
  if (phase === "select" && mockStatus) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-stone-900">
          Mock Exams: {mockStatus.exam_name}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {mockStatus.total_questions} questions &middot;{" "}
          {mockStatus.time_limit_minutes} min &middot; Pass:{" "}
          {mockStatus.passing_score_pct}%
        </p>

        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((num) => {
            const mock = mockStatus.mocks?.[num];
            const available = mock?.available ?? false;
            return (
              <div
                key={num}
                className={cn(
                  "rounded-xl border p-6 transition-all",
                  available
                    ? "border-stone-200 bg-white hover:border-amber-400 hover:shadow-md"
                    : "border-stone-100 bg-stone-50 opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      Mock Exam {num}
                    </h3>
                    {mock?.best_score !== null && mock?.best_score !== undefined && (
                      <p className="mt-1 text-sm text-stone-500">
                        Best: {mock.best_score}%{" "}
                        {mock.best_passed ? (
                          <span className="text-green-600 font-bold">PASSED</span>
                        ) : (
                          <span className="text-red-500 font-bold">FAILED</span>
                        )}{" "}
                        &middot; {mock.attempts} attempt(s)
                      </p>
                    )}
                    {!mock?.best_score && mock?.best_score !== 0 && (
                      <p className="mt-1 text-sm text-stone-400">Not attempted</p>
                    )}
                  </div>
                  {available && (
                    <button
                      onClick={() => handleStart(num)}
                      className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push(`/exam/${examId}`)}
          className="mt-6 text-sm text-stone-400 hover:text-stone-600"
        >
          Back to Exam Details
        </button>
      </div>
    );
  }

  // ── EXAM IN PROGRESS ──
  if (phase === "exam" && questions.length > 0) {
    const q = questions[currentIndex];
    const answered = Object.keys(answers).length;
    const timePercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    const isLowTime = timeLeft < 300;

    return (
      <div className="flex min-h-screen flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span className="text-sm font-medium text-stone-500">
              Q {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold",
                  isLowTime
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "bg-stone-100 text-stone-700"
                )}
              >
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
              <span className="text-sm text-stone-400">
                {answered}/{questions.length} answered
              </span>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to submit the exam?")) {
                    handleFinish();
                  }
                }}
                className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Finish Exam
              </button>
            </div>
          </div>
          {/* Timer bar */}
          <div className="mx-auto mt-2 max-w-5xl">
            <div className="h-1 w-full rounded-full bg-stone-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isLowTime ? "bg-red-500" : "bg-amber-500"
                )}
                style={{ width: `${timePercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6">
          {/* Question */}
          <div className="flex-1 space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-base leading-relaxed text-stone-800">
                {q.stem}
              </p>
            </div>

            <div className="space-y-3">
              {q.options?.map(
                (opt: { id: string; text: string }) => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(q.id, opt.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-amber-400 bg-amber-50"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                          selected
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-stone-300 text-stone-400"
                        )}
                      >
                        {opt.id}
                      </span>
                      <span className="text-sm text-stone-700">{opt.text}</span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => toggleFlag(currentIndex)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-4 py-2 text-sm",
                  flagged.has(currentIndex)
                    ? "border-amber-400 bg-amber-50 text-amber-600"
                    : "border-stone-200 text-stone-500 hover:bg-stone-50"
                )}
              >
                <Flag className="h-4 w-4" />
                {flagged.has(currentIndex) ? "Flagged" : "Flag"}
              </button>
              <button
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min(questions.length - 1, i + 1)
                  )
                }
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-1 rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-30"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Question navigator sidebar */}
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-28 rounded-xl border border-stone-200 bg-white p-4">
              <h4 className="mb-3 text-xs font-bold uppercase text-stone-400">
                Questions
              </h4>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((_: Question, i: number) => {
                  const isAnswered = answers[questions[i].id] !== undefined;
                  const isFlagged = flagged.has(i);
                  const isCurrent = i === currentIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors",
                        isCurrent
                          ? "bg-amber-500 text-white"
                          : isAnswered
                            ? "bg-green-100 text-green-700"
                            : "bg-stone-100 text-stone-500",
                        isFlagged && !isCurrent && "ring-2 ring-amber-400"
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-100" /> Answered (
                  {answered})
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-stone-100" /> Unanswered (
                  {questions.length - answered})
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded ring-2 ring-amber-400" />{" "}
                  Flagged ({flagged.size})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (phase === "results" && results) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        {/* Pass/Fail banner */}
        <div
          className={cn(
            "rounded-2xl p-8 text-center",
            results.passed
              ? "bg-gradient-to-r from-green-500 to-emerald-600"
              : "bg-gradient-to-r from-red-500 to-rose-600"
          )}
        >
          {results.passed ? (
            <Trophy className="mx-auto h-16 w-16 text-white" />
          ) : (
            <AlertTriangle className="mx-auto h-16 w-16 text-white" />
          )}
          <h1 className="mt-4 text-3xl font-bold text-white">
            {results.passed ? "PASSED!" : "Not Yet"}
          </h1>
          <p className="mt-2 text-lg text-white/80">
            Mock Exam {results.mock_number} &middot; {results.exam_name}
          </p>
        </div>

        {/* Score */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p
                className={cn(
                  "text-4xl font-bold",
                  results.passed ? "text-green-600" : "text-red-500"
                )}
              >
                {results.score_pct}%
              </p>
              <p className="text-sm text-stone-500">Your Score</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-stone-400">
                {results.passing_score_pct}%
              </p>
              <p className="text-sm text-stone-500">Passing Score</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-stone-700">
                {results.correct}/{results.total}
              </p>
              <p className="text-sm text-stone-500">Correct</p>
            </div>
          </div>
          {results.unanswered > 0 && (
            <p className="mt-4 text-center text-sm text-amber-600">
              {results.unanswered} question(s) left unanswered
            </p>
          )}
          {results.time_taken_seconds && (
            <p className="mt-2 text-center text-sm text-stone-400">
              Time: {formatTime(results.time_taken_seconds)}
            </p>
          )}
        </div>

        {/* Domain Breakdown */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-stone-900">
            Domain Performance
          </h2>
          <div className="mt-6 space-y-4">
            {Object.entries(results.domain_scores || {}).map(
              ([did, d]: [string, any]) => (
                <div key={did}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">
                      {d.name}
                    </span>
                    <span className="text-sm text-stone-500">
                      {d.correct}/{d.total} ({d.score_pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        d.score_pct >= results.passing_score_pct
                          ? "bg-green-500"
                          : "bg-red-400"
                      )}
                      style={{ width: `${d.score_pct}%` }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Question Review */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-stone-900">Question Review</h2>
          <div className="mt-4 space-y-2">
            {results.question_review?.map((qr: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  qr.is_correct
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                )}
              >
                {qr.is_correct ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <span className="text-sm text-stone-600">
                  Q{i + 1}: {qr.selected ? `You chose ${qr.selected}` : "Unanswered"}{" "}
                  &middot; Correct: {qr.correct_answer}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              setPhase("select");
              setResults(null);
              api.getMockExamStatus(examId).then(setMockStatus);
            }}
            className="flex-1 rounded-lg border border-stone-200 px-6 py-3 font-semibold text-stone-700 hover:bg-stone-50"
          >
            Back to Mock Exams
          </button>
          <button
            onClick={() => router.push("/study")}
            className="flex-1 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600"
          >
            Practice Weak Areas
            <ArrowRight className="ml-2 inline h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── NO EXAM SELECTED — show exam list ──
  if (!examId) {
    return <ExamSelector />;
  }

  return (
    <div className="py-20 text-center text-stone-500">Loading...</div>
  );
}

function ExamSelector() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getExams()
      .then(setExams)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    );
  }

  const providers = [...new Set(exams.map((e) => e.provider))].sort();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
        <Trophy className="h-7 w-7 text-amber-500" />
        Mock Exams
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Select an exam to take a full-length timed mock test.
      </p>
      {providers.map((prov) => (
        <div key={prov} className="mt-8">
          <h2 className="text-lg font-bold uppercase text-stone-400">
            {prov}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {exams
              .filter((e) => e.provider === prov)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() =>
                    router.push(`/mock-exam?examId=${e.id}`)
                  }
                  className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-amber-400 hover:shadow-md"
                >
                  <h3 className="text-sm font-bold text-stone-900">
                    {e.name}
                  </h3>
                  <p className="mt-1 text-xs text-stone-400">
                    {e.code} &middot; {e.total_questions} Qs &middot;{" "}
                    {e.time_limit_minutes} min
                  </p>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
