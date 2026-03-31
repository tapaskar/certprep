"use client";

import { useEffect, useState } from "react";
import { useProgressStore } from "@/stores/progress-store";
import { useAuthStore } from "@/stores/auth-store";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { StreakCard } from "@/components/dashboard/streak-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WeakConcepts } from "@/components/dashboard/weak-concepts";
import { BookOpen, Plus, Crown, Zap } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { progress, isLoading, error, fetchProgress } = useProgressStore();
  const user = useAuthStore((s) => s.user);
  const setActiveExam = useAuthStore((s) => s.setActiveExam);
  const examId = user?.active_exam_id;
  const enrolledExams = user?.enrolled_exams ?? [];

  useEffect(() => {
    if (examId) fetchProgress(examId);
  }, [examId, fetchProgress]);

  if (!examId && enrolledExams.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-stone-900">Welcome to SparkUpCloud!</h2>
        <p className="text-stone-500">Pick an exam to get started.</p>
        <a href="/onboarding" className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600">
          Start Onboarding
        </a>
      </div>
    );
  }

  const activeExam = enrolledExams.find((e) => e.exam_id === examId);
  const userPlan = user?.plan ?? "free";
  const isFreePlan = userPlan === "free";

  // Check for upgrade param from pricing page
  const [upgradeParam, setUpgradeParam] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    if (upgrade) setUpgradeParam(upgrade);
  }, []);

  return (
    <div className="space-y-6">
      {/* Upgrade prompt from pricing page */}
      {upgradeParam && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-bold text-stone-900">
                Upgrade to {upgradeParam.replace("_", " ").replace("pro", "Pro")}
              </p>
              <p className="text-sm text-stone-500">
                Payment integration coming soon. Contact admin@sparkupcloud.com to activate your plan.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUpgradeParam(null)}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Free plan upgrade banner */}
      {isFreePlan && !upgradeParam && (
        <Link
          href="/pricing"
          className="flex items-center justify-between rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-stone-900">Unlock full access</p>
              <p className="text-xs text-stone-500">Upgrade to Pro for unlimited questions, mock exams, and AI study plans</p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white">
            View Plans
          </span>
        </Link>
      )}

      {/* Exam selector */}
      <div className="flex flex-wrap items-center gap-3">
        {enrolledExams.map((exam) => (
          <button
            key={exam.exam_id}
            onClick={() => {
              setActiveExam(exam.exam_id);
              fetchProgress(exam.exam_id);
            }}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
              exam.exam_id === examId
                ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50/50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>{exam.exam_code}</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
              {Math.round(exam.readiness_pct)}%
            </span>
          </button>
        ))}
        <Link
          href="/onboarding"
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:border-amber-400 hover:text-amber-600"
        >
          <Plus className="h-4 w-4" />
          Add Exam
        </Link>
      </div>

      {/* Active exam name */}
      {activeExam && (
        <p className="text-sm text-stone-500">
          Studying: <span className="font-semibold text-stone-700">{activeExam.exam_name}</span>
        </p>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
        </div>
      )}

      {error && (
        <div className="flex h-48 flex-col items-center justify-center gap-3">
          <p className="text-stone-500">Could not load progress.</p>
          <button
            onClick={() => examId && fetchProgress(examId)}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && progress && (
        <>
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
        </>
      )}
    </div>
  );
}
