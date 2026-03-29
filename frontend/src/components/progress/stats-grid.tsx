"use client";

import { Clock, Hash, Target, Flame } from "lucide-react";

interface StatsGridProps {
  totalMinutes: number;
  questionsAnswered: number;
  accuracyPct: number;
  streakDays: number;
}

export function StatsGrid({ totalMinutes, questionsAnswered, accuracyPct, streakDays }: StatsGridProps) {
  const items = [
    {
      icon: Clock,
      value: `${Math.round(totalMinutes)}m`,
      label: "Total Study Time",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      icon: Hash,
      value: questionsAnswered.toLocaleString(),
      label: "Questions Answered",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      icon: Target,
      value: `${Math.round(accuracyPct)}%`,
      label: "Accuracy",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      icon: Flame,
      value: `${streakDays}d`,
      label: "Current Streak",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="animate-fadeInUp rounded-xl border border-stone-200 bg-white p-5 shadow-md shadow-stone-200/60"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}>
            <item.icon className={`h-5 w-5 ${item.iconColor}`} />
          </div>
          <p className="mt-3 text-3xl font-bold text-stone-900">{item.value}</p>
          <p className="mt-1 text-xs text-stone-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
