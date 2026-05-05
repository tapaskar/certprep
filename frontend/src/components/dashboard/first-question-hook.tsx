"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { sampleQuestions } from "@/lib/sample-questions";
import { trackEngagementConversion } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * First-question activation hook for the dashboard empty state.
 *
 * Replaces the old wall ("Welcome! Pick an exam to get started") that
 * required 5+ clicks before any value landed. Drops a real practice
 * question right on the dashboard so a brand-new user can:
 *
 *   1. See what the product actually does within 3 seconds
 *   2. Answer (or guess) — feel the gameplay
 *   3. See the explanation — understand the depth
 *   4. THEN get nudged toward picking their target exam
 *
 * Fires the same Google Ads engagement conversion that /try-questions
 * fires on first answer — captures activation at the point of highest
 * intent.
 *
 * Uses the first SAA-C03 sample (most popular cert), regardless of
 * which exam the user might eventually pick. Justification: the goal
 * here is to demonstrate the product's depth + UX, not to teach the
 * specific cert content. Picking by user-stated interest would
 * require an extra step we're trying to remove.
 */
export function FirstQuestionHook() {
  const q = sampleQuestions[0]; // SAA-C03 — well-tuned starter question
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = selected === q.correct;

  const handleSelect = (optId: string) => {
    if (revealed) return;
    setSelected(optId);
  };

  const handleSubmit = () => {
    if (!selected) return;
    setRevealed(true);
    // Fire the engagement event — this is the moment a brand-new user
    // demonstrated real intent. NO-OP until the engagement conversion
    // label is wired in lib/analytics.ts.
    trackEngagementConversion();
  };

  return (
    <div className="space-y-6">
      {/* Welcome lead — short, doesn't bury the question */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
          <Sparkles className="h-3 w-3" />
          Welcome to SparkUpCloud
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 max-w-xl mx-auto leading-tight">
          {revealed
            ? isCorrect
              ? "Nice — that's exactly right."
              : "Close, but not quite. Here's the answer."
            : "Try a real exam question first."}
        </h1>
        <p className="text-sm text-stone-500 max-w-md mx-auto">
          {revealed
            ? "Read the breakdown below, then pick your exam to get more like this."
            : "We'll pick your exam together in a moment. First, see what the product feels like."}
        </p>
      </div>

      {/* The question card */}
      <div className="rounded-2xl border-2 border-amber-200 bg-white p-6 sm:p-8 shadow-md shadow-amber-100/40 max-w-2xl mx-auto">
        {/* Cert label */}
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Sample · {q.certCode}
          </span>
          <span className="text-xs text-stone-400">{q.cert}</span>
        </div>

        {/* Question stem */}
        <p className="text-base sm:text-lg leading-relaxed text-stone-900 font-medium mb-5">
          {q.stem}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt) => {
            const isSelected = selected === opt.id;
            const isThisCorrect = opt.id === q.correct;
            // Style: pre-reveal = neutral/selected. Post-reveal = green for
            // correct, rose for selected-but-wrong, neutral for everything else.
            let cls =
              "border-stone-200 bg-white text-stone-900 hover:border-amber-400 hover:bg-amber-50/40";
            let icon = null;
            if (revealed) {
              if (isThisCorrect) {
                cls = "border-emerald-300 bg-emerald-50 text-stone-900";
                icon = <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
              } else if (isSelected) {
                cls = "border-rose-300 bg-rose-50 text-stone-900";
                icon = <XCircle className="h-4 w-4 text-rose-600" />;
              } else {
                cls = "border-stone-200 bg-stone-50/40 text-stone-500";
              }
            } else if (isSelected) {
              cls = "border-amber-400 bg-amber-50 text-stone-900 ring-2 ring-amber-200";
            }
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={revealed}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border-2 p-3.5 text-left text-sm transition-all",
                  cls,
                  !revealed && "cursor-pointer",
                  revealed && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    revealed && isThisCorrect
                      ? "bg-emerald-500 text-white"
                      : revealed && isSelected
                        ? "bg-rose-500 text-white"
                        : isSelected
                          ? "bg-amber-500 text-white"
                          : "bg-stone-100 text-stone-600",
                  )}
                >
                  {opt.id}
                </span>
                <span className="flex-1 leading-relaxed">{opt.text}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Submit (pre-reveal) */}
        {!revealed && (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="mt-5 w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            Check my answer
          </button>
        )}

        {/* Explanation reveal */}
        {revealed && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-stone-900">
                Why {q.correct} is correct
              </p>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              {q.explanation}
            </p>
            {q.whyOthersWrong && Object.keys(q.whyOthersWrong).length > 0 && (
              <details className="text-xs text-stone-600">
                <summary className="cursor-pointer font-semibold text-stone-700 hover:text-stone-900">
                  Why the other options are wrong →
                </summary>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc">
                  {Object.entries(q.whyOthersWrong).map(([opt, reason]) => (
                    <li key={opt}>
                      <strong>{opt}:</strong> {reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* CTA — pick exam. Only after revealing so we don't compete with
          the "Check my answer" button. */}
      {revealed && (
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-sm text-stone-600">
            <strong>That's one of 8,800+.</strong> Pick your exam to get a
            personalized study plan + adaptive practice tuned to your weak
            areas.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-200/50 hover:scale-[1.02] transition-all"
          >
            Pick your exam
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-stone-400">
            Takes 30 seconds.{" "}
            <Link
              href="/try-questions"
              className="text-amber-600 hover:text-amber-700 underline"
            >
              Or try 4 more sample questions first
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
