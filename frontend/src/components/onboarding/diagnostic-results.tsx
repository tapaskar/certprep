"use client";

import Link from "next/link";
import { cn, getMasteryLevel, masteryColors } from "@/lib/utils";
import type { DiagnosticSubmitResponse } from "@/lib/api-types";

interface DiagnosticResultsProps {
  result: DiagnosticSubmitResponse;
}

export function DiagnosticResults({ result }: DiagnosticResultsProps) {
  const domainEntries = Object.entries(result.domain_scores);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Overall score */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-md shadow-stone-200/60">
        <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">
          Diagnostic Score
        </h2>
        <p className="mt-4 text-5xl font-bold text-amber-500">
          {result.score_pct}%
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Initial readiness: {result.initial_readiness_pct}%
        </p>
      </div>

      {/* Domain breakdown */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-500">
          Domain Breakdown
        </h3>
        <div className="space-y-4">
          {domainEntries.map(([domainId, score]) => {
            const level = getMasteryLevel(score);
            const colors = masteryColors[level];
            const name = domainId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div
                key={domainId}
                className="pl-1"
              >
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-stone-700">{name}</span>
                  <span className={cn("font-semibold", colors.text)}>
                    {Math.round(score)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={cn("h-full rounded-full", colors.bar)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended plan */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-500">
          Recommended Plan
        </h3>
        <p className="text-sm leading-6 text-stone-700">
          Focus on: {result.recommended_study_plan.focus_domains.join(", ")}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          {result.recommended_study_plan.weekly_target_minutes} min/week &middot;{" "}
          ~{result.recommended_study_plan.estimated_weeks_to_ready} weeks to ready
        </p>
      </div>

      <Link
        href="/dashboard"
        className="flex w-full items-center justify-center rounded-lg bg-amber-500 px-6 py-3 font-bold text-white transition-colors hover:bg-amber-600"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
