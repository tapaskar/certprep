"use client";

import { BookOpen, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyMode } from "@/stores/study-store";

const durations = [15, 30, 60];

interface ModeSelectorProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  onStart: () => void;
  isLoading: boolean;
}

export function ModeSelector({
  mode,
  onModeChange,
  duration,
  onDurationChange,
  onStart,
  isLoading,
}: ModeSelectorProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Mode cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Learn & Practice */}
        <button
          onClick={() => onModeChange("learn_practice")}
          className={cn(
            "rounded-xl border-2 bg-white p-6 text-left shadow-md shadow-stone-200/60 transition-colors",
            mode === "learn_practice"
              ? "border-amber-400 bg-amber-50/50"
              : "border-stone-200 hover:border-stone-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-amber-50">
              <BookOpen className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900">Learn & Practice</h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                Recommended
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Study concepts first, then test your knowledge
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-amber-500" />
              Key facts
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-amber-500" />
              Common misconceptions
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-amber-500" />
              Study links
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-amber-500" />
              Then practice questions
            </li>
          </ul>
        </button>

        {/* Quick Quiz */}
        <button
          onClick={() => onModeChange("quick_quiz")}
          className={cn(
            "rounded-xl border-2 bg-white p-6 text-left shadow-md shadow-stone-200/60 transition-colors",
            mode === "quick_quiz"
              ? "border-amber-400 bg-amber-50/50"
              : "border-stone-200 hover:border-stone-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-100">
              <Zap className="h-8 w-8 text-stone-500" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900">Quick Quiz</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Jump straight to questions
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-stone-400" />
              Timed questions
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-stone-400" />
              Instant feedback
            </li>
          </ul>
        </button>
      </div>

      {/* Duration selector */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <p className="mb-4 text-sm font-medium text-stone-700">
          Session Length
        </p>
        <div className="flex justify-center gap-3">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => onDurationChange(d)}
              className={cn(
                "rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
                duration === d
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 font-bold text-white hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
      >
        {isLoading ? "Preparing Session..." : "Start Session"}
      </button>
    </div>
  );
}
