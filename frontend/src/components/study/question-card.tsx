"use client";

import { cn } from "@/lib/utils";
import type { Question } from "@/lib/api-types";

interface QuestionCardProps {
  question: Question;
  selectedOption: string | null;
  onSelect: (option: string) => void;
  questionNumber: number;
  totalQuestions: number;
  timerSeconds: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QuestionCard({
  question,
  selectedOption,
  onSelect,
  questionNumber,
  totalQuestions,
  timerSeconds,
}: QuestionCardProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }} />
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between text-sm text-stone-500">
        <span>
          Question {questionNumber}{" "}
          <span className="inline-block h-1 w-1 rounded-full bg-amber-500 align-middle" />{" "}
          {totalQuestions}
        </span>
        <span className={cn(
          "font-mono",
          timerSeconds > 120 ? "text-red-500 font-bold text-lg" : timerSeconds > 60 ? "text-amber-600 font-bold text-lg" : "text-stone-500 font-mono"
        )}>{formatTime(timerSeconds)}</span>
      </div>

      {/* Question stem */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <p className="text-lg leading-relaxed text-stone-800">{question.stem}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              selectedOption === option.id
                ? "border-amber-500 bg-amber-50 text-stone-800"
                : "border-stone-200 bg-white text-stone-700 hover:border-amber-400"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                selectedOption === option.id
                  ? "bg-amber-500 text-white"
                  : "bg-stone-200 text-stone-500"
              )}
            >
              {option.id}
            </span>
            <span className="pt-0.5 text-base leading-6">{option.text}</span>
          </button>
        ))}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-stone-400">
        Press 1-4 to select
      </p>
    </div>
  );
}
