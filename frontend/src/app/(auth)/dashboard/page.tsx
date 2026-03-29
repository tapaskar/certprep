"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/stores/progress-store";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { StreakCard } from "@/components/dashboard/streak-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WeakConcepts } from "@/components/dashboard/weak-concepts";

const EXAM_ID = "aws-sap-c02";

export default function DashboardPage() {
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
    if (notEnrolled) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <h2 className="text-xl font-bold text-stone-900">Welcome to CertPrep!</h2>
          <p className="text-stone-500">Pick an exam to get started.</p>
          <a
            href="/onboarding"
            className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600"
          >
            Start Onboarding
          </a>
        </div>
      );
    }
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-stone-500">Could not load dashboard data.</p>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => fetchProgress(EXAM_ID)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReadinessCard
            overallPct={progress.readiness.overall_pct}
            passProbability={progress.readiness.pass_probability_pct}
            daysUntilExam={progress.readiness.days_until_exam}
            conceptsMastered={progress.readiness.concepts_mastered}
            conceptsTotal={progress.readiness.concepts_total}
          />
        </div>
        <StreakCard
          currentDays={progress.streak.current_days}
          longestDays={progress.streak.longest_days}
          freezesRemaining={progress.streak.freezes_remaining}
        />
      </div>

      {/* Quick actions */}
      <QuickActions reviewCount={progress.upcoming_reviews.overdue} />

      {/* Weak concepts */}
      {progress.weakest_concepts.length > 0 && (
        <WeakConcepts concepts={progress.weakest_concepts} />
      )}
    </div>
  );
}
