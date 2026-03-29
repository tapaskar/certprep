"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/stores/progress-store";
import { ReadinessRadar } from "@/components/progress/readiness-radar";
import { StatsGrid } from "@/components/progress/stats-grid";
import { DomainBars } from "@/components/progress/domain-bars";

const EXAM_ID = "aws-sap-c02";

export default function ProgressPage() {
  const { progress, isLoading, error, fetchProgress } = useProgressStore();

  useEffect(() => {
    fetchProgress(EXAM_ID);
  }, [fetchProgress]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    );
  }

  if (error) {
    const notEnrolled = error.includes("404") || error.includes("Not enrolled");
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-stone-500">{notEnrolled ? "Complete onboarding to see your progress." : error}</p>
        <a href={notEnrolled ? "/onboarding" : "#"} onClick={notEnrolled ? undefined : () => fetchProgress(EXAM_ID)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600">
          {notEnrolled ? "Start Onboarding" : "Retry"}
        </a>
      </div>
    );
  }

  if (!progress) return null;

  // Convert domain_readiness map to array for charts
  const domainScores = Object.entries(progress.readiness.domain_readiness).map(
    ([id, value]) => ({
      domain_id: id,
      domain_name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      score: typeof value === "number" ? value : value.score,
    })
  );

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReadinessRadar domainScores={domainScores} />
        <StatsGrid
          totalMinutes={progress.study_stats.total_study_minutes}
          questionsAnswered={progress.study_stats.total_questions_answered}
          accuracyPct={progress.study_stats.overall_accuracy_pct}
          streakDays={progress.streak.current_days}
        />
      </div>

      {/* Domain bars */}
      <DomainBars domainScores={domainScores} />
    </div>
  );
}
