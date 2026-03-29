"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { DiagnosticQuestion } from "@/lib/api-types";

interface DiagnosticQuizProps {
  questions: DiagnosticQuestion[];
  onComplete: (answers: { question_id: string; selected_option: string; time_seconds: number }[]) => void;
}

const TOTAL_TIME_SECONDS = 25 * 60;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DiagnosticQuiz({ questions, onComplete }: DiagnosticQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    { question_id: string; selected_option: string; time_seconds: number }[]
  >([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const finishQuiz = useCallback(
    (finalAnswers: { question_id: string; selected_option: string; time_seconds: number }[]) => {
      onComplete(finalAnswers);
    },
    [onComplete]
  );

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishQuiz(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [answers, finishQuiz]);

  const handleSelect = (key: string) => {
    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    const newAnswers = [
      ...answers,
      { question_id: question.id, selected_option: key, time_seconds: elapsed },
    ];
    setQuestionStartTime(Date.now());
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span
          className={cn(
            "text-lg font-mono",
            timeLeft < 60 ? "text-red-600" : "text-amber-600"
          )}
        >
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <p className="text-base leading-relaxed text-stone-800">{question.stem}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-amber-400"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-xs font-bold text-stone-500">
              {option.id}
            </span>
            <span className="pt-0.5 text-sm leading-6 text-stone-700">
              {option.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
