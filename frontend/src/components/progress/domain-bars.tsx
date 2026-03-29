"use client";

import { cn, getMasteryLevel, masteryColors } from "@/lib/utils";
interface DomainScoreItem {
  domain_id: string;
  domain_name: string;
  score: number;
}

interface DomainBarsProps {
  domainScores: DomainScoreItem[];
}

export function DomainBars({ domainScores }: DomainBarsProps) {
  const sorted = [...domainScores].sort((a, b) => a.score - b.score);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
      <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">
        Domain Breakdown
      </h2>
      <div className="mt-4 space-y-4">
        {sorted.map((domain) => {
          const level = getMasteryLevel(domain.score);
          const colors = masteryColors[level];
          return (
            <div
              key={domain.domain_id}
              className="pl-1"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-stone-700">{domain.domain_name}</span>
                <span className={cn("font-semibold", colors.text)}>
                  {Math.round(domain.score)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className={cn("h-full rounded-full transition-all", colors.bar)}
                  style={{ width: `${domain.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
