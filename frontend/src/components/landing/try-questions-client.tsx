"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Star,
} from "lucide-react";
import { CertBadge } from "@/components/cert-badge";
import { cn } from "@/lib/utils";
import type { SampleQuestion } from "@/lib/sample-questions";
import { trackEngagementConversion } from "@/lib/analytics";

interface Props {
  questions: SampleQuestion[];
}

export function TryQuestionsClient({ questions }: Props) {
  const [idx, setIdx] = useState(0);
  // Map of question.id → selected option id
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Map of question.id → boolean revealing the explanation
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const q = questions[idx];
  const selected = answers[q.id] ?? null;
  const isRevealed = revealed[q.id] ?? false;
  const isCorrect = selected === q.correct;

  const handleSelect = (optId: string) => {
    if (isRevealed) return;
    setAnswers({ ...answers, [q.id]: optId });
  };

  const handleSubmit = () => {
    if (!selected) return;
    setRevealed({ ...revealed, [q.id]: true });
    // Fire Google Ads "Engagement" conversion on the first answer
    // submitted in this session. The helper dedupes per visitor per
    // day so additional answers don't double-count. Anonymous —
    // user is logged-out at this point. NO-OP until the engagement
    // conversion label is pasted into lib/analytics.ts.
    trackEngagementConversion();
  };

  const handleNext = () => {
    if (idx < questions.length - 1) setIdx(idx + 1);
  };

  const handlePrev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Question {idx + 1} of {questions.length}
          </span>
          <span className="text-xs text-stone-400">
            {Object.keys(answers).length} answered ·{" "}
            {Object.values(revealed).filter(Boolean).length} revealed
          </span>
        </div>
        <div className="flex gap-1">
          {questions.map((qq, i) => {
            const ans = answers[qq.id];
            const rev = revealed[qq.id];
            const correct = ans === qq.correct;
            return (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  i === idx
                    ? "bg-amber-500"
                    : rev && correct
                    ? "bg-emerald-500"
                    : rev
                    ? "bg-rose-400"
                    : ans
                    ? "bg-amber-300"
                    : "bg-stone-200"
                )}
                aria-label={`Go to question ${i + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Cert badge + meta */}
        <div className="flex items-start gap-4 mb-5 pb-4 border-b border-stone-100">
          <CertBadge code={q.certCode} provider={q.provider} size={56} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
              {q.cert}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "h-3 w-3",
                      s <= q.difficulty
                        ? "fill-amber-400 text-amber-400"
                        : "text-stone-200"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-semibold text-stone-500">
                Difficulty {q.difficulty}/5
              </span>
            </div>
          </div>
        </div>

        {/* Stem */}
        <p className="text-base sm:text-lg leading-relaxed text-stone-800 font-medium">
          {q.stem}
        </p>

        {/* Options */}
        <div className="mt-5 space-y-2">
          {q.options.map((opt) => {
            const isThisCorrect = opt.id === q.correct;
            const isThisSelected = selected === opt.id;
            let stateClass =
              "border-stone-200 bg-white hover:border-amber-400 hover:bg-amber-50/50";
            let icon = null;

            if (isRevealed) {
              if (isThisCorrect) {
                stateClass = "border-emerald-300 bg-emerald-50";
                icon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
              } else if (isThisSelected) {
                stateClass = "border-rose-300 bg-rose-50";
                icon = <XCircle className="h-5 w-5 text-rose-500" />;
              } else {
                stateClass = "border-stone-200 bg-stone-50/40 opacity-70";
              }
            } else if (isThisSelected) {
              stateClass = "border-amber-400 bg-amber-50";
            }

            return (
              <button
                key={opt.id}
                disabled={isRevealed}
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  "w-full text-left rounded-lg border-2 p-3 sm:p-4 transition-all flex items-start gap-3",
                  stateClass,
                  !isRevealed && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                    isThisSelected
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-stone-300 text-stone-500"
                  )}
                >
                  {opt.id}
                </span>
                <span className="flex-1 text-sm sm:text-base text-stone-800 leading-relaxed">
                  {opt.text}
                </span>
                {icon && <span className="shrink-0">{icon}</span>}
              </button>
            );
          })}
        </div>

        {/* Submit / Result */}
        {!isRevealed ? (
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
            >
              Reveal Answer
            </button>
            {selected && (
              <span className="text-xs text-stone-500">
                You picked <strong>{selected}</strong> · click to check
              </span>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div
              className={cn(
                "rounded-lg p-4 mb-4 flex items-start gap-3",
                isCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <div className="font-bold text-stone-900">
                  {isCorrect
                    ? "Correct!"
                    : `Incorrect. The right answer is ${q.correct}.`}
                </div>
              </div>
            </div>

            {/* Why correct */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-bold text-stone-900">
                  Why {q.correct} is correct
                </h4>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">
                {q.explanation}
              </p>
            </div>

            {/* Why others wrong */}
            <details className="rounded-lg border border-stone-200 bg-white">
              <summary className="cursor-pointer p-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 rounded-lg">
                ✗ Why the other options are wrong
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {Object.entries(q.whyOthersWrong).map(([id, why]) => (
                  <div key={id} className="text-sm text-stone-600 flex gap-2">
                    <span className="font-bold text-rose-500 shrink-0">
                      {id}:
                    </span>
                    <span>{why}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={idx === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        {idx < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-sm font-semibold"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <a
            href="/register"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 text-sm font-bold shadow-md hover:scale-[1.02] transition-all"
          >
            Get 8,800+ More
            <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
