"use client";

import { cn, getMasteryLevel, getMasteryIcon, getMasteryTierName, masteryColors } from "@/lib/utils";

interface ConceptProgressProps {
  masteryPct: number;
}

const tierThresholds = [
  { min: 0, max: 40, level: "weak" },
  { min: 40, max: 70, level: "familiar" },
  { min: 70, max: 90, level: "proficient" },
  { min: 90, max: 100, level: "mastered" },
];

export function ConceptProgress({ masteryPct }: ConceptProgressProps) {
  const currentLevel = getMasteryLevel(masteryPct);
  const currentTier = getMasteryTierName(currentLevel);
  const currentIcon = getMasteryIcon(currentLevel);
  const colors = masteryColors[currentLevel] || masteryColors.not_started;

  // Find next tier
  const currentThreshold = tierThresholds.find((t) => t.level === currentLevel);
  const currentIdx = tierThresholds.findIndex((t) => t.level === currentLevel);
  const nextThreshold = tierThresholds[currentIdx + 1];
  const nextLevel = nextThreshold?.level || currentLevel;
  const nextTier = getMasteryTierName(nextLevel);
  const nextIcon = getMasteryIcon(nextLevel);

  // Calculate progress within current tier
  const tierMin = currentThreshold?.min ?? 0;
  const tierMax = currentThreshold?.max ?? 100;
  const tierRange = tierMax - tierMin;
  const progressInTier = tierRange > 0 ? ((masteryPct - tierMin) / tierRange) * 100 : 100;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-2.5">
      <span className="text-sm" title={currentTier}>
        {currentIcon}
      </span>
      <span className="text-xs font-medium text-stone-600">{currentTier}</span>

      <div className="relative flex-1 h-2 rounded-full bg-stone-200">
        <div
          className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${Math.min(progressInTier, 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-stone-600">
          {Math.round(masteryPct)}%
        </span>
      </div>

      {nextThreshold ? (
        <>
          <span className="text-xs font-medium text-stone-400">{nextTier}</span>
          <span className="text-sm opacity-50" title={nextTier}>
            {nextIcon}
          </span>
        </>
      ) : (
        <span className="text-xs font-medium text-stone-400">Max</span>
      )}
    </div>
  );
}
