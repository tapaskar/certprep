"use client";

import { useState } from "react";
import { useStudyStore } from "@/stores/study-store";
import { ModeSelector } from "./mode-selector";
import type { StudyMode } from "@/stores/study-store";

const EXAM_ID = "aws-sap-c02";

export function SessionPlan() {
  const [selectedDuration, setSelectedDuration] = useState(30);
  const { isLoading, mode, setMode, createSession } = useStudyStore();

  const handleStart = () => {
    createSession(EXAM_ID, selectedDuration);
  };

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
