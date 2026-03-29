"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Question, AnswerResult } from "@/lib/api-types";

interface AnswerFeedbackProps {
  question: Question;
  selectedOption: string;
  result: AnswerResult;
  onNext: () => void;
}

export function AnswerFeedback({
  question,
  selectedOption,
  result,
  onNext,
}: AnswerFeedbackProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleToggleExplanation = async () => {
    if (!showExplanation && !explanationText) {
      setLoadingExplanation(true);
      try {
        const data = await api.getExplanation(question.id);
        setExplanationText(data.explanation.text || data.explanation.why_correct || "");
      } catch {
        setExplanationText("Could not load explanation.");
      }
      setLoadingExplanation(false);
    }
    setShowExplanation(!showExplanation);
  };

  const mu = result.mastery_update;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Result banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl p-4",
          result.correct
            ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700"
            : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700"
        )}
      >
        {result.correct ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
        <span className="text-xl font-bold">
          {result.correct ? "Correct!" : "Incorrect"}
        </span>
        {result.misconception_detected && (
          <span className="ml-auto rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
            Misconception detected
          </span>
        )}
      </div>

      {/* Question with highlighted options */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <p className="mb-4 text-base leading-relaxed text-stone-800">{question.stem}</p>
        <div className="space-y-2">
          {question.options.map((option) => {
            const isCorrect = option.id === result.correct_option;
            const isSelected = option.id === selectedOption;
            const isWrong = isSelected && !result.correct;

            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  isCorrect
                    ? "border-green-300 bg-green-50"
                    : isWrong
                      ? "border-red-300 bg-red-50"
                      : "border-stone-200 bg-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
                    isCorrect
                      ? "bg-green-600 text-white"
                      : isWrong
                        ? "bg-red-600 text-white"
                        : "bg-stone-200 text-stone-500"
                  )}
                >
                  {option.id}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isCorrect ? "text-green-700" : isWrong ? "text-red-700" : "text-stone-500"
                  )}
                >
                  {option.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mastery update */}
      {mu && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-2 text-base">
            <span className="font-medium text-stone-800">{mu.concept_name}</span>
            <span
              className={cn(
                "font-mono",
                mu.mastery_after > mu.mastery_before ? "text-green-600" : "text-red-600"
              )}
            >
              {Math.round(mu.mastery_before * 100)}% → {Math.round(mu.mastery_after * 100)}%
              {mu.mastery_after > mu.mastery_before ? " ↑" : " ↓"}
            </span>
          </div>
          {result.propagation_updates.map((p) => (
            <div
              key={p.concept_id}
              className="flex items-center justify-between rounded-lg bg-stone-100 px-4 py-1 text-xs text-amber-600"
            >
              <span>{p.concept_id}</span>
              <span>+{(p.mastery_delta * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Misconception warning */}
      {result.misconception_detected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-700">
            <AlertTriangle className="h-6 w-6" />
            Misconception Detected
          </div>
          <p className="text-base text-amber-600">
            You answered quickly with high confidence but got it wrong.
            This suggests a common misconception. Review the explanation carefully.
          </p>
        </div>
      )}

      {/* Explanation toggle */}
      <button
        onClick={handleToggleExplanation}
        className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-amber-500"
      >
        {loadingExplanation ? "Loading..." : "Show Explanation"}
        {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showExplanation && explanationText && (
        <div className="rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
          {explanationText}
        </div>
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-white hover:scale-[1.02] transition-all duration-200"
      >
        Next Question
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
