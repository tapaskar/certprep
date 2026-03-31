"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useStudyStore } from "@/stores/study-store";
import { useAuthStore } from "@/stores/auth-store";
import { ModeSelector } from "./mode-selector";

export function SessionPlan() {
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [limitError, setLimitError] = useState<string | null>(null);
  const { isLoading, mode, setMode, createSession } = useStudyStore();
  const examId = useAuthStore((s) => s.user?.active_exam_id);

  const handleStart = async () => {
    if (!examId) return;
    setLimitError(null);
    try {
      await createSession(examId, selectedDuration);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      if (msg.includes("Daily limit") || msg.includes("expired") || msg.includes("403")) {
        setLimitError(msg);
      }
    }
  };

  if (!examId) {
    return (
      <div className="mx-auto max-w-lg text-center py-16">
        <p className="text-stone-500">No exam selected. Complete onboarding first.</p>
        <a href="/onboarding" className="mt-4 inline-block rounded-lg bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600">
          Start Onboarding
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {limitError && (
        <div className="mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-6 text-center">
          <Zap className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <p className="font-bold text-stone-900">Daily Limit Reached</p>
          <p className="mt-1 text-sm text-stone-500">{limitError}</p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white hover:scale-[1.02] transition-all"
          >
            Upgrade Plan
          </Link>
        </div>
      )}
      <ModeSelector
        mode={mode}
        onModeChange={setMode}
        duration={selectedDuration}
        onDurationChange={setSelectedDuration}
        onStart={handleStart}
        isLoading={isLoading}
      />
    </div>
  );
}
