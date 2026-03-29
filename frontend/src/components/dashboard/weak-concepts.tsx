"use client";

import { cn, getMasteryLevel, getMasteryIcon, getMasteryTierName, masteryColors } from "@/lib/utils";

interface WeakConceptItem {
  id: string;
  name: string;
  mastery_pct: number;
  exam_weight: number;
}

interface WeakConceptsProps {
  concepts: WeakConceptItem[];
}

export function WeakConcepts({ concepts }: WeakConceptsProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
      <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">
        Weakest Concepts
      </h2>

      <div className="mt-4 space-y-3">
        {concepts.slice(0, 5).map((concept) => {
          const level = getMasteryLevel(concept.mastery_pct);
          const colors = masteryColors[level];
          const icon = getMasteryIcon(level);
          const tierName = getMasteryTierName(level);
          return (
            <button
              key={concept.id}
              className={cn(
                "flex w-full items-center gap-4 rounded-lg border border-stone-200 p-3 text-left transition-all duration-200 hover:border-amber-400 hover:shadow-md"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <p className="text-base font-semibold text-stone-800">
                    {concept.name}
                  </p>
                  <span className={cn("text-xs font-medium", colors.text)}>
                    {tierName}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={cn("h-full rounded-full", colors.bar)}
                    style={{ width: `${concept.mastery_pct}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className={cn("text-sm font-semibold", colors.text)}>
                  {Math.round(concept.mastery_pct)}%
                </span>
                <span className="text-xs text-stone-500">
                  {concept.exam_weight}% weight
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
