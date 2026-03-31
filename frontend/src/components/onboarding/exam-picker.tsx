"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Exam } from "@/lib/api-types";

interface ExamPickerProps {
  selectedExamId: string | null;
  onSelect: (exam: Exam) => void;
}

type Level = "Foundational" | "Fundamentals" | "Associate" | "Professional" | "Specialty" | "Expert";
type Provider = "all" | "aws" | "azure" | "gcp";

const levelByCode: Record<string, Level> = {
  // AWS
  "CLF-C02": "Foundational",
  "AIF-C01": "Foundational",
  "SAA-C03": "Associate",
  "DVA-C02": "Associate",
  "SOA-C02": "Associate",
  "DEA-C01": "Associate",
  "MLA-C01": "Associate",
  "SAP-C02": "Professional",
  "DOP-C02": "Professional",
  "AIP-C01": "Professional",
  "SCS-C02": "Specialty",
  "DBS-C01": "Specialty",
  "ANS-C01": "Specialty",
  "MLS-C01": "Specialty",
  // Azure
  "AZ-900": "Fundamentals",
  "AI-900": "Fundamentals",
  "DP-900": "Fundamentals",
  "SC-900": "Fundamentals",
  "AZ-104": "Associate",
  "AZ-204": "Associate",
  "AZ-500": "Associate",
  "DP-300": "Associate",
  "AI-102": "Associate",
  "DP-203": "Associate",
  "AZ-305": "Expert",
  "AZ-400": "Expert",
  // GCP
  "CDL": "Foundational",
  "ACE": "Associate",
  "PCA": "Professional",
  "PCD": "Professional",
  "PDE": "Professional",
  "PCSE": "Professional",
  "PCNE": "Professional",
  "PCDE": "Professional",
  "PMLE": "Professional",
  "PCDOE": "Professional",
};

const levelOrder: Level[] = ["Foundational", "Fundamentals", "Associate", "Professional", "Expert", "Specialty"];

const levelColors: Record<Level, string> = {
  Foundational: "text-sky-600",
  Fundamentals: "text-sky-600",
  Associate: "text-amber-600",
  Professional: "text-violet-600",
  Expert: "text-violet-600",
  Specialty: "text-red-600",
};

const cardAccent: Record<Level, { border: string; hover: string }> = {
  Foundational: { border: "border-sky-400", hover: "hover:border-sky-400/50" },
  Fundamentals: { border: "border-sky-400", hover: "hover:border-sky-400/50" },
  Associate: { border: "border-amber-400", hover: "hover:border-amber-400/50" },
  Professional: { border: "border-violet-400", hover: "hover:border-violet-400/50" },
  Expert: { border: "border-violet-400", hover: "hover:border-violet-400/50" },
  Specialty: { border: "border-red-400", hover: "hover:border-red-400/50" },
};

const providerTabs: { key: Provider; label: string }[] = [
  { key: "all", label: "All" },
  { key: "aws", label: "AWS" },
  { key: "azure", label: "Azure" },
  { key: "gcp", label: "GCP" },
];

function getLevel(code: string | null): Level {
  return (code && levelByCode[code]) || "Associate";
}

function groupByLevel(exams: Exam[]): Record<Level, Exam[]> {
  const groups: Record<Level, Exam[]> = {
    Foundational: [],
    Fundamentals: [],
    Associate: [],
    Professional: [],
    Expert: [],
    Specialty: [],
  };
  for (const exam of exams) {
    groups[getLevel(exam.code)].push(exam);
  }
  return groups;
}

export function ExamPicker({ selectedExamId, onSelect }: ExamPickerProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>("all");

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

  const filtered =
    provider === "all"
      ? exams
      : exams.filter((e) => e.provider.toLowerCase() === provider);
  const grouped = groupByLevel(filtered);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold tracking-tight text-stone-900">
        Choose Your Certification Exam
      </h2>

      {/* Provider filter */}
      <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 w-fit">
        {providerTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setProvider(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              provider === t.key
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Level groups */}
      {levelOrder.map((level) => {
        const items = grouped[level];
        if (items.length === 0) return null;
        return (
          <div key={level}>
            <h3
              className={cn(
                "mb-3 text-xs font-bold uppercase tracking-widest",
                levelColors[level]
              )}
            >
              {level}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((exam) => {
                const accent = cardAccent[level];
                const selected = selectedExamId === exam.id;
                return (
                  <button
                    key={exam.id}
                    onClick={() => onSelect(exam)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      selected
                        ? `${accent.border} bg-amber-50`
                        : `border-stone-200 bg-white ${accent.hover}`
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900 text-sm leading-snug">
                        {exam.name}
                      </h3>
                      {exam.code && (
                        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                          {exam.code}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-stone-500">
                      <span>{exam.total_questions} Qs</span>
                      <span>{exam.time_limit_minutes} min</span>
                      <span>{exam.passing_score_pct}% pass</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
