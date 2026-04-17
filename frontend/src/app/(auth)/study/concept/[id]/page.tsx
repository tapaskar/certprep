"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Lightbulb,
  AlertTriangle,
  Star,
  Tag,
  Loader2,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useStudyStore } from "@/stores/study-store";
import { BloomsBadge } from "@/components/study/blooms-badge";
import { AudioTutor } from "@/components/study/audio-tutor";
import { cn } from "@/lib/utils";
import type { ConceptDetail } from "@/lib/api-types";

export default function ConceptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conceptId } = use(params);
  const router = useRouter();
  const examId = useAuthStore((s) => s.user?.active_exam_id);
  const { createSession, setMode, isLoading } = useStudyStore();

  const [detail, setDetail] = useState<ConceptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [factsChecked, setFactsChecked] = useState<Set<number>>(new Set());
  const [starting, setStarting] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // Fetch THIS concept's details — single source of truth for what's shown
  useEffect(() => {
    if (!examId || !conceptId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getConceptDetail(examId, conceptId)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load concept");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [examId, conceptId]);

  const toggleFact = (i: number) => {
    setFactsChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleStartPractice = async () => {
    if (!examId || !detail) return;
    setStarting(true);
    setPracticeError(null);
    setMode("quick_quiz");
    try {
      await createSession(examId, 15, { concept_ids: [conceptId] });
      // Jump to /study — it will render the active session from the store
      router.push("/study");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not start practice session.";
      // Strip the "API 404: " prefix for cleaner display
      const cleaned = msg.replace(/^API \d+:\s*/, "");
      setPracticeError(cleaned);
    } finally {
      setStarting(false);
    }
  };

  if (!examId) {
    return (
      <div className="mx-auto max-w-lg text-center py-16">
        <p className="text-stone-500">Select an exam to study concepts.</p>
        <Link
          href="/onboarding"
          className="mt-4 inline-block rounded-lg bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600"
        >
          Start Onboarding
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/study"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Study Home
      </Link>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-bold text-rose-700">Could not load concept</p>
          <p className="text-sm text-rose-600 mt-1">{error}</p>
        </div>
      ) : detail ? (
        <ConceptDetailView
          detail={detail}
          factsChecked={factsChecked}
          onToggleFact={toggleFact}
          onStartPractice={handleStartPractice}
          isStarting={starting || isLoading}
          practiceError={practiceError}
        />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center text-stone-500">
          Concept not found.
        </div>
      )}
    </div>
  );
}

function ConceptDetailView({
  detail,
  factsChecked,
  onToggleFact,
  onStartPractice,
  isStarting,
  practiceError,
}: {
  detail: ConceptDetail;
  factsChecked: Set<number>;
  onToggleFact: (i: number) => void;
  onStartPractice: () => void;
  isStarting: boolean;
  practiceError: string | null;
}) {
  const { concept, user_mastery, question_count } = detail;
  const {
    name,
    description,
    key_facts,
    common_misconceptions,
    aws_services,
    difficulty_tier,
    domain_id,
  } = concept;

  const difficultyLevel = difficulty_tier ?? 3;
  const totalFacts = key_facts.length;
  const reviewedPct =
    totalFacts > 0 ? (factsChecked.size / totalFacts) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <BookOpen className="h-5 w-5 text-amber-600 mt-1" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-stone-900">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {domain_id && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase text-amber-600">
                  {domain_id.replace(/-/g, " ")}
                </span>
              )}
              <BloomsBadge difficultyTier={difficulty_tier} />
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= difficultyLevel
                        ? "fill-amber-500 text-amber-500"
                        : "text-stone-300"
                    )}
                  />
                ))}
              </div>
              {user_mastery && (
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    user_mastery.mastery_pct >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : user_mastery.mastery_pct >= 50
                      ? "bg-amber-100 text-amber-700"
                      : user_mastery.mastery_pct > 0
                      ? "bg-orange-100 text-orange-700"
                      : "bg-stone-100 text-stone-600"
                  )}
                >
                  Mastery: {user_mastery.mastery_pct}%
                </span>
              )}
              <span className="text-xs text-stone-500">
                {question_count} practice questions available
              </span>
            </div>
          </div>
        </div>

        {description && (
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            {description}
          </p>
        )}

        {aws_services.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-stone-400" />
            {aws_services.map((svc) => (
              <span
                key={svc}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
              >
                {svc}
              </span>
            ))}
          </div>
        )}

        {/* Practice CTA */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onStartPractice}
              disabled={isStarting || question_count === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isStarting
                ? "Starting..."
                : question_count === 0
                ? "No questions available"
                : "Start 15-min Practice"}
            </button>
            <span className="text-xs text-stone-500 self-center">
              Questions are filtered strictly to this concept.
            </span>
          </div>
          {practiceError && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {practiceError}
            </div>
          )}
          {question_count === 0 && !practiceError && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              No practice questions are mapped to this concept yet. Pick
              another concept from the explorer or start an adaptive session.
            </div>
          )}
        </div>
      </div>

      {/* Audio Tutor */}
      <AudioTutor
        title={name}
        sections={[
          ...(description ? [{ heading: "Overview", body: description }] : []),
          ...(key_facts.length > 0
            ? [{ heading: "Key facts", body: key_facts.join(". ") }]
            : []),
          ...(common_misconceptions.length > 0
            ? [
                {
                  heading: "Common misconceptions",
                  body: common_misconceptions.join(". "),
                },
              ]
            : []),
        ]}
      />

      {/* Key Facts */}
      {key_facts.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="font-bold text-stone-900">Key Facts</h2>
            </div>
            <span className="text-sm text-stone-500">
              {factsChecked.size} of {totalFacts} reviewed
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${reviewedPct}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {key_facts.map((fact, i) => {
              const checked = factsChecked.has(i);
              return (
                <button
                  key={i}
                  onClick={() => onToggleFact(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    checked
                      ? "border-green-200 bg-green-50/50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      checked
                        ? "border-green-500 bg-green-500"
                        : "border-stone-300"
                    )}
                  >
                    {checked && (
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm leading-relaxed text-stone-700">
                    {fact}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Common Misconceptions */}
      {common_misconceptions.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="font-bold text-stone-900">Common Misconceptions</h2>
          </div>
          <ul className="space-y-2">
            {common_misconceptions.map((m, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-stone-700"
              >
                <span className="text-rose-500 shrink-0">✗</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mastery stats */}
      {user_mastery && user_mastery.total_attempts > 0 && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Your Progress
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-stone-500 text-xs">Mastery</div>
              <div className="font-bold text-stone-900">
                {user_mastery.mastery_pct}%
              </div>
            </div>
            <div>
              <div className="text-stone-500 text-xs">Attempts</div>
              <div className="font-bold text-stone-900">
                {user_mastery.total_attempts}
              </div>
            </div>
            <div>
              <div className="text-stone-500 text-xs">Accuracy</div>
              <div className="font-bold text-stone-900">
                {user_mastery.accuracy_pct}%
              </div>
            </div>
            <div>
              <div className="text-stone-500 text-xs">Next Review</div>
              <div className="font-bold text-stone-900">
                {user_mastery.next_review
                  ? new Date(user_mastery.next_review).toLocaleDateString()
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
