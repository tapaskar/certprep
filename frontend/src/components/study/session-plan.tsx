"use client";

import { useState } from "react";
import { useStudyStore } from "@/stores/study-store";
import { useAuthStore } from "@/stores/auth-store";
import { ModeSelector } from "./mode-selector";

export function SessionPlan() {
  const [selectedDuration, setSelectedDuration] = useState(30);
  const { isLoading, mode, setMode, createSession } = useStudyStore();
  const examId = useAuthStore((s) => s.user?.active_exam_id);

  const handleStart = () => {
    if (examId) createSession(examId, selectedDuration);
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
    <ModeSelector
      mode={mode}
      onModeChange={setMode}
      duration={selectedDuration}
      onDurationChange={setSelectedDuration}
      onStart={handleStart}
      isLoading={isLoading}
    />
  );
}
