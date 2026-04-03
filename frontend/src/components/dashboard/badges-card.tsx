"use client";

import { useEffect, useState } from "react";
import { Flame, Zap, BookOpen, Target, Brain, Award, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Badge } from "@/lib/api-types";

const BADGE_DEFS: Record<string, { label: string; icon: typeof Flame; color: string; description: string }> = {
  first_session: { label: "First Steps", icon: BookOpen, color: "text-green-500 bg-green-100", description: "Completed your first study session" },
  streak_7: { label: "7-Day Streak", icon: Flame, color: "text-amber-500 bg-amber-100", description: "Studied 7 days in a row" },
  streak_14: { label: "14-Day Streak", icon: Flame, color: "text-orange-500 bg-orange-100", description: "Studied 14 days in a row" },
  streak_30: { label: "30-Day Streak", icon: Flame, color: "text-red-500 bg-red-100", description: "Studied 30 days in a row" },
  streak_60: { label: "60-Day Streak", icon: Flame, color: "text-rose-600 bg-rose-100", description: "Studied 60 days in a row" },
  streak_100: { label: "100-Day Streak", icon: Flame, color: "text-purple-600 bg-purple-100", description: "Studied 100 days in a row" },
  questions_100: { label: "Century", icon: Target, color: "text-blue-500 bg-blue-100", description: "Answered 100 practice questions" },
  questions_500: { label: "Scholar", icon: Brain, color: "text-violet-500 bg-violet-100", description: "Answered 500 practice questions" },
  concept_mastered: { label: "Mastery", icon: Award, color: "text-emerald-500 bg-emerald-100", description: "Fully mastered a concept" },
  accuracy_90: { label: "Sharpshooter", icon: Zap, color: "text-yellow-500 bg-yellow-100", description: "Achieved 90%+ accuracy in a session" },
};

const BADGE_ORDER = [
  "first_session",
  "streak_7",
  "streak_14",
  "streak_30",
  "streak_60",
  "streak_100",
  "questions_100",
  "questions_500",
  "concept_mastered",
  "accuracy_90",
];

export function BadgesCard() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getBadges()
      .then((res) => setBadges(res.badges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earnedTypes = new Set(badges.map((b) => b.badge_type));

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Achievements</h3>
        <div className="flex items-center justify-center h-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-stone-900">Achievements</h3>
        <span className="text-xs text-stone-400">
          {earnedTypes.size}/{BADGE_ORDER.length}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {BADGE_ORDER.map((type) => {
          const def = BADGE_DEFS[type];
          if (!def) return null;
          const earned = earnedTypes.has(type);
          const Icon = earned ? def.icon : Lock;

          return (
            <div
              key={type}
              className="group relative flex flex-col items-center"
              title={earned ? `${def.label}: ${def.description}` : def.description}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                  earned ? def.color : "bg-stone-100 text-stone-300"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium text-center leading-tight",
                  earned ? "text-stone-700" : "text-stone-300"
                )}
              >
                {def.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
