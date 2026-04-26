"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  BookOpen,
  Clock,
  Target,
  ExternalLink,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  FileText,
  Star,
  Trophy,
  AlertTriangle,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CertBadge } from "@/components/cert-badge";
import { useAuthStore } from "@/stores/auth-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExamDetails = any;

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  // Enrollment state — am I already studying this exam?
  const user = useAuthStore((s) => s.user);
  const enrolledExamIds = (user?.enrolled_exams ?? []).map((e) => e.exam_id);
  const isEnrolled = enrolledExamIds.includes(examId);

  useEffect(() => {
    api
      .getExamDetails(examId)
      .then(setExam)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  /**
   * Primary CTA action.
   *  - Already enrolled → jump straight to /study (existing study session)
   *  - Not enrolled    → route to /onboarding?exam=<id> for the proper
   *    onboarding flow that captures exam date + study prefs. We don't
   *    silent-enroll here so the user gets to set their pace.
   */
  const handleStartPreparing = () => {
    if (isEnrolled) {
      router.push("/study");
      return;
    }
    setEnrolling(true);
    router.push(`/onboarding?exam=${encodeURIComponent(examId)}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-4 text-xl font-bold text-stone-900">
            Exam not found
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            We couldn&apos;t find &quot;{examId}&quot; in our catalog. It may
            not be loaded yet — if you&apos;re an admin, run{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-mono">
              python -m app.cli seed-all
            </code>{" "}
            on the backend.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const info = exam.exam_info;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-5 flex-1 min-w-0">
            <CertBadge
              code={exam.code}
              provider={exam.provider}
              size={104}
            />
            <div className="flex-1 min-w-0">
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-700">
                {exam.provider?.toUpperCase()}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-stone-900">
                {exam.name}
              </h1>
              {exam.code && (
                <p className="mt-1 text-lg text-stone-500">{exam.code}</p>
              )}
            </div>
          </div>
          {info?.difficulty_rating && (
            <div className="flex items-center gap-1 shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-5 w-5",
                    s <= info.difficulty_rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-stone-200"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-stone-50 p-4 text-center">
            <BookOpen className="mx-auto h-5 w-5 text-stone-400" />
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {exam.total_questions}
            </p>
            <p className="text-xs text-stone-500">Questions</p>
          </div>
          <div className="rounded-lg bg-stone-50 p-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-stone-400" />
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {exam.time_limit_minutes}
            </p>
            <p className="text-xs text-stone-500">Minutes</p>
          </div>
          <div className="rounded-lg bg-stone-50 p-4 text-center">
            <Target className="mx-auto h-5 w-5 text-stone-400" />
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {exam.passing_score_pct}%
            </p>
            <p className="text-xs text-stone-500">Passing Score</p>
          </div>
          <div className="rounded-lg bg-stone-50 p-4 text-center">
            <Trophy className="mx-auto h-5 w-5 text-stone-400" />
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {exam.questions_in_bank}
            </p>
            <p className="text-xs text-stone-500">Question Bank</p>
          </div>
        </div>

        {/* Overview */}
        {info?.overview && (
          <p className="mt-6 text-sm leading-relaxed text-stone-600 whitespace-pre-line">
            {info.overview}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-500">
          {info?.cost_usd && <span>Cost: ${info.cost_usd}</span>}
          {info?.validity_years && (
            <span>Valid: {info.validity_years} years</span>
          )}
          {info?.average_study_weeks && (
            <span>Avg study: {info.average_study_weeks} weeks</span>
          )}
        </div>

        {/* ── Primary CTA — visible on every exam page ──
            "Start preparing" enrolls the user (via /onboarding) and routes
            them into the study flow. Already-enrolled users see "Continue
            studying" instead and skip straight to /study. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleStartPreparing}
            disabled={enrolling}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold shadow-lg transition-all",
              "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:scale-[1.02]",
              "disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100",
            )}
          >
            {isEnrolled ? (
              <>
                <ArrowRight className="h-5 w-5" />
                Continue studying {exam.code ?? exam.name}
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                Start preparing for {exam.code ?? exam.name}
              </>
            )}
          </button>
          {!isEnrolled && (
            <p className="text-xs text-stone-500 sm:max-w-xs">
              Free to start. Set your exam date and study pace in 60 seconds.
            </p>
          )}
        </div>
      </div>

      {/* Domain Breakdown */}
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
        <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <FileText className="h-5 w-5 text-amber-500" />
          Exam Domains
        </h2>
        <div className="mt-6 space-y-4">
          {exam.domains?.map(
            (
              d: {
                id: string;
                name: string;
                weight_pct: number;
                question_count?: number;
              },
              i: number
            ) => (
              <div key={d.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">
                    {d.name}
                  </span>
                  <span className="text-sm font-bold text-stone-900">
                    {d.weight_pct}%
                  </span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${d.weight_pct}%` }}
                  />
                </div>
                {d.question_count !== undefined && (
                  <p className="mt-1 text-xs text-stone-400">
                    {d.question_count} questions in bank
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Mock Exams CTA */}
      {exam.mock_exams_available > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <Trophy className="h-5 w-5 text-amber-500" />
            Mock Exams Available
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            {exam.mock_exams_available} full-length mock exam
            {exam.mock_exams_available > 1 ? "s" : ""} with{" "}
            {exam.total_questions} questions each, timed at{" "}
            {exam.time_limit_minutes} minutes. Pass mark: {exam.passing_score_pct}%.
          </p>
          <button
            onClick={() =>
              router.push(`/mock-exam?examId=${examId}`)
            }
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600"
          >
            Start Mock Exam
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Preparation Tips */}
      {info?.preparation_tips?.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Preparation Tips
          </h2>
          <div className="mt-4 space-y-3">
            {info.preparation_tips.map((tip: string, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-stone-100 bg-stone-50 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <p className="text-sm text-stone-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Day Tips */}
      {info?.exam_day_tips?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Exam Day Tips
          </h2>
          <div className="mt-4 space-y-3">
            {info.exam_day_tips.map((tip: string, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-4"
              >
                <span className="mt-0.5 text-amber-500 font-bold text-sm">
                  {i + 1}.
                </span>
                <p className="text-sm text-stone-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Services/Technologies */}
      {info?.key_services_to_know?.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-stone-900">
            Key Services to Know
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {info.key_services_to_know.map((svc: string) => (
              <span
                key={svc}
                className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700"
              >
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Official Resources */}
      {info?.official_resources?.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <ExternalLink className="h-5 w-5 text-amber-500" />
            Official Resources
          </h2>
          <div className="mt-4 space-y-2">
            {info.official_resources.map(
              (r: { title: string; url: string; type: string }, i: number) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-stone-200 p-4 transition-colors hover:border-amber-400 hover:bg-amber-50"
                >
                  <div>
                    <p className="font-medium text-stone-900">{r.title}</p>
                    <p className="text-xs text-stone-400 uppercase">{r.type}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-stone-400" />
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* Related Certifications */}
      {info?.related_certifications?.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-stone-900">
            Related Certifications
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {info.related_certifications.map(
              (
                r: { code: string; name: string; relationship: string },
                i: number
              ) => (
                <div
                  key={i}
                  className="rounded-lg border border-stone-200 p-4"
                >
                  <p className="font-medium text-stone-900">{r.name}</p>
                  <p className="text-xs text-stone-400">
                    {r.code} &middot; {r.relationship}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Exam Guide Link */}
      {exam.exam_guide_url && (
        <div className="text-center">
          <a
            href={exam.exam_guide_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-6 py-3 font-medium text-stone-700 hover:bg-stone-50"
          >
            View Official Exam Guide
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
