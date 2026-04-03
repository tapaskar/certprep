"use client";

import { useEffect, useState } from "react";
import { Trophy, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { LeagueData } from "@/lib/api-types";

const TIER_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: "bg-stone-100", text: "text-stone-400", label: "Not Joined" },
  1: { bg: "bg-amber-100", text: "text-amber-700", label: "Bronze" },
  2: { bg: "bg-stone-200", text: "text-stone-600", label: "Silver" },
  3: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Gold" },
  4: { bg: "bg-cyan-100", text: "text-cyan-700", label: "Platinum" },
  5: { bg: "bg-violet-100", text: "text-violet-700", label: "Diamond" },
};

export function LeagueCard() {
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getLeague()
      .then(setLeague)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Weekly League</h3>
        <div className="flex items-center justify-center h-24">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
        </div>
      </div>
    );
  }

  if (!league || league.tier === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-bold text-stone-900">Weekly League</h3>
        </div>
        <p className="text-sm text-stone-500">
          Complete a study session this week to join a league and compete with
          other learners.
        </p>
      </div>
    );
  }

  const tier = TIER_COLORS[league.tier] || TIER_COLORS[1];
  const top5 = league.leaderboard.slice(0, 5);
  const totalMembers = league.total_members;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tier.bg)}>
            <Trophy className={cn("h-4 w-4", tier.text)} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              {tier.label} League
            </h3>
            <p className="text-xs text-stone-400">
              {league.days_remaining} days left
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-stone-900">{league.user_xp}</p>
          <p className="text-xs text-stone-400">XP this week</p>
        </div>
      </div>

      {/* Mini leaderboard */}
      <div className="space-y-1.5">
        {top5.map((member) => (
          <div
            key={member.rank}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
              member.is_current_user
                ? "bg-amber-50 border border-amber-200"
                : "bg-stone-50",
              member.rank <= 3 && !member.is_current_user && "bg-green-50"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  member.rank === 1
                    ? "bg-yellow-400 text-white"
                    : member.rank === 2
                      ? "bg-stone-300 text-white"
                      : member.rank === 3
                        ? "bg-amber-600 text-white"
                        : "bg-stone-200 text-stone-500"
                )}
              >
                {member.rank}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  member.is_current_user
                    ? "text-amber-700 font-bold"
                    : "text-stone-600"
                )}
              >
                {member.is_current_user ? "You" : member.display_name}
              </span>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {member.weekly_xp} XP
            </span>
          </div>
        ))}
      </div>

      {/* Zones legend */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400">
        <div className="flex items-center gap-1">
          <ChevronUp className="h-3 w-3 text-green-500" />
          Top 3 promoted
        </div>
        <span>{totalMembers} learners</span>
        <div className="flex items-center gap-1">
          <ChevronDown className="h-3 w-3 text-red-400" />
          Bottom 3 demoted
        </div>
      </div>
    </div>
  );
}
