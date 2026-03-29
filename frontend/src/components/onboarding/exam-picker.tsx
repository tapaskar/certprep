"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Exam } from "@/lib/api-types";

interface ExamPickerProps {
  selectedExamId: string | null;
  onSelect: (exam: Exam) => void;
}

const providerColors: Record<string, string> = {
  AWS: "bg-amber-50 text-amber-600",
  Azure: "bg-violet-50 text-violet-600",
  GCP: "bg-green-50 text-green-600",
};

export function ExamPicker({ selectedExamId, onSelect }: ExamPickerProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getExams()
      .then(setExams)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight text-stone-900">
        Choose Your Certification Exam
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {exams.map((exam) => (
          <button
            key={exam.id}
            onClick={() => onSelect(exam)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              selectedExamId === exam.id
                ? "border-amber-500 bg-amber-50"
                : "border-stone-200 bg-white hover:border-amber-500/50"
            )}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-stone-900">{exam.name}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  providerColors[exam.provider] ?? "bg-stone-100 text-stone-600"
                )}
              >
                {exam.provider}
              </span>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-stone-500">
              <span>{exam.total_questions} questions</span>
              <span>{exam.time_limit_minutes} min</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
