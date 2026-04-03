"use client";

import { useEffect, useState } from "react";
import { Flag, Clock, Gift, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ChallengeData } from "@/lib/api-types";

const TYPE_LABELS: Record<string, string> = {
  questions_answered: "questions",
  study_minutes: "minutes studied",
  streak_days: "day streak",
  concepts_mastered: "concepts mastered",
};

const REWARD_LABELS: Record<string, string> = {
  badge: "Exclusive Badge",
  pro_extension: "Pro Extension",
  xp_bonus: "XP Bonus",
};

export function ChallengeCard() {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    api
      .getChallenges()
      .then((res) => setChallenges(res.challenges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try {
      await api.claimChallengeReward(id);
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, reward_claimed: true } : c))
      );
    } catch {
      // ignore
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Monthly Challenge</h3>
        <div className="flex items-center justify-center h-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
        </div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60">
        <div className="flex items-center gap-2 mb-2">
          <Flag className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-bold text-stone-900">Monthly Challenge</h3>
        </div>
        <p className="text-sm text-stone-500">
          No active challenges right now. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {challenges.map((challenge) => {
        const pct = Math.min(
          100,
          Math.round((challenge.user_progress / challenge.goal_value) * 100)
        );
        const typeLabel = TYPE_LABELS[challenge.challenge_type] || challenge.challenge_type;
        const rewardLabel = REWARD_LABELS[challenge.reward_type] || challenge.reward_type;

        return (
          <div
            key={challenge.id}
            className={cn(
              "rounded-xl border bg-white p-5 shadow-md shadow-stone-200/60",
              challenge.completed
                ? "border-green-300 bg-green-50/30"
                : "border-stone-200"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    challenge.completed ? "bg-green-100" : "bg-amber-100"
                  )}
                >
                  {challenge.completed ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Flag className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {challenge.title}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {challenge.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-stone-400">
                <Clock className="h-3 w-3" />
                {challenge.days_remaining}d left
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-stone-600">
                  {challenge.user_progress} / {challenge.goal_value}{" "}
                  {typeLabel}
                </span>
                <span className="text-xs font-bold text-stone-500">
                  {pct}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    challenge.completed
                      ? "bg-green-500"
                      : "bg-gradient-to-r from-amber-400 to-amber-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <div className="flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" />
                  {rewardLabel}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {challenge.participants_count} joined
                </div>
              </div>

              {challenge.completed && !challenge.reward_claimed && (
                <button
                  onClick={() => handleClaim(challenge.id)}
                  disabled={claiming === challenge.id}
                  className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600 disabled:opacity-50 transition-all"
                >
                  {claiming === challenge.id ? "Claiming..." : "Claim Reward"}
                </button>
              )}
              {challenge.reward_claimed && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  Claimed
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
