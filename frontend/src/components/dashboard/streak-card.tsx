"use client";

import { Flame } from "lucide-react";

interface StreakCardProps {
  currentDays: number;
  longestDays: number;
  freezesRemaining: number;
}

export function StreakCard({ currentDays, longestDays, freezesRemaining }: StreakCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
      <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">
        Study Streak
      </h2>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Flame className="h-14 w-14 text-amber-500 animate-pulse-glow" />
        <span className="text-6xl font-bold text-amber-500">
          {currentDays}
        </span>
        <span className="text-sm text-stone-500">day streak</span>
        {longestDays > currentDays && (
          <p className="mt-2 text-sm text-amber-600 font-medium">
            {longestDays - currentDays} more days to beat your record!
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <div>
          <p className="text-stone-500">Longest</p>
          <p className="font-semibold text-stone-700">
            {longestDays} days
          </p>
        </div>
        <div className="rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-600">
          {freezesRemaining} freezes left
        </div>
      </div>
    </div>
  );
}
