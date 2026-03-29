"use client";

import { Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SessionSummary as SessionSummaryType } from "@/lib/api-types";
import { useStudyStore } from "@/stores/study-store";
import { XpBadge } from "./xp-badge";
import { ConceptProgress } from "./concept-progress";

interface SessionSummaryProps {
  summary: SessionSummaryType;
}

export function SessionSummary({ summary }: SessionSummaryProps) {
  const resetSession = useStudyStore((s) => s.resetSession);
  const xpEarned = useStudyStore((s) => s.xpEarned);

  const readinessDelta = summary.readiness_delta;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Confetti */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#f59e0b', '#8b5cf6', '#16a34a', '#dc2626', '#3b82f6'][i % 5],
              animation: `confetti-fall ${2 + Math.random() * 2}s ease-out ${Math.random() * 0.5}s forwards`,
            }}
          />
        ))}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-md shadow-stone-200/60">
        <h2 className="relative inline-block text-3xl font-bold text-stone-900">
          Session Complete
          <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-amber-500" />
        </h2>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-stone-200 border-t-2 border-t-stone-400 bg-white p-3">
            <p className="text-3xl font-bold text-stone-900">
              {summary.questions_answered}
            </p>
            <p className="text-xs text-stone-500">Questions</p>
          </div>
          <div className="rounded-lg border border-stone-200 border-t-2 border-t-green-500 bg-white p-3">
            <p className="text-3xl font-bold text-green-600">
              {summary.questions_correct}
            </p>
            <p className="text-xs text-stone-500">Correct</p>
          </div>
          <div className="rounded-lg border border-stone-200 border-t-2 border-t-amber-500 bg-white p-3">
            <p className="text-3xl font-bold text-amber-600">
              {summary.accuracy_pct}%
            </p>
            <p className="text-xs text-stone-500">Accuracy</p>
          </div>
        </div>

        {/* Readiness change */}
        {summary.readiness_before != null && summary.readiness_after != null && (
          <div className="mt-6 rounded-lg border border-stone-200 bg-stone-100 p-4">
            <p className="text-sm text-stone-500">Readiness</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-lg font-bold text-stone-900">
              {Math.round(summary.readiness_before)}%
              <span className="text-amber-500">→</span>
              {Math.round(summary.readiness_after)}%
              {readinessDelta != null && (
                <span
                  className={cn(
                    "text-sm",
                    readinessDelta >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  ({readinessDelta >= 0 ? "+" : ""}{readinessDelta.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Streak */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-amber-500">
            {summary.streak_days} day streak
          </span>
        </div>

        {/* XP earned */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <XpBadge amount={xpEarned} />
        </div>

        {/* Concept tier progress for improved concepts */}
        {summary.concepts_improved && summary.concepts_improved.length > 0 && (
          <div className="mt-4 space-y-2">
            {summary.concepts_improved.map((c) => {
              const deltaPct = parseFloat(c.delta) || 0;
              // Estimate current mastery from delta (rough approximation)
              const estimatedMastery = Math.min(100, 50 + deltaPct * 100);
              return (
                <div key={c.name}>
                  <p className="mb-1 text-xs font-medium text-stone-600">
                    {c.name}{" "}
                    <span className="text-green-600">+{c.delta}</span>
                  </p>
                  <ConceptProgress masteryPct={estimatedMastery} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={resetSession}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 font-bold text-white hover:scale-[1.02] transition-all duration-200"
        >
          Continue Studying
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          href="/dashboard"
          className="flex flex-1 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 px-6 py-4 font-semibold text-stone-700 transition-colors hover:border-amber-500"
        >
          Done for Today
        </Link>
      </div>
    </div>
  );
}
