"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PreferencesFormProps {
  onSubmit: (prefs: {
    examDate: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
    dailyStudyMinutes: number;
  }) => void;
}

const experienceLevels = [
  { value: "beginner" as const, label: "Beginner" },
  { value: "intermediate" as const, label: "Intermediate" },
  { value: "advanced" as const, label: "Advanced" },
];

const studyDurations = [15, 30, 60];

export function PreferencesForm({ onSubmit }: PreferencesFormProps) {
  const [examDate, setExamDate] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");
  const [dailyMinutes, setDailyMinutes] = useState(30);

  const handleSubmit = () => {
    onSubmit({
      examDate,
      experienceLevel,
      dailyStudyMinutes: dailyMinutes,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold tracking-tight text-stone-900">
        Set Your Preferences
      </h2>

      {/* Exam date */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-stone-600">
          Target Exam Date
        </label>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500"
        />
      </div>

      {/* Experience level */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-stone-600">
          Experience Level
        </label>
        <div className="flex gap-3">
          {experienceLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setExperienceLevel(level.value)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors",
                experienceLevel === level.value
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              )}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily study minutes */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-stone-600">
          Daily Study Time
        </label>
        <div className="flex gap-3">
          {studyDurations.map((d) => (
            <button
              key={d}
              onClick={() => setDailyMinutes(d)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors",
                dailyMinutes === d
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!examDate}
        className="w-full rounded-lg bg-amber-500 px-6 py-3 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
