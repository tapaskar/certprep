import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const masteryColors: Record<
  string,
  { bg: string; text: string; border: string; bar: string; leftBorder: string }
> = {
  not_started: {
    bg: "bg-stone-100",
    text: "text-stone-400",
    border: "border-stone-300",
    bar: "bg-stone-300",
    leftBorder: "border-l-stone-300",
  },
  weak: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    bar: "bg-red-500",
    leftBorder: "border-l-red-500",
  },
  familiar: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    bar: "bg-amber-500",
    leftBorder: "border-l-amber-500",
  },
  proficient: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-200",
    bar: "bg-violet-500",
    leftBorder: "border-l-violet-500",
  },
  mastered: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
    bar: "bg-green-500",
    leftBorder: "border-l-green-500",
  },
};

export function getMasteryLevel(pct: number): string {
  if (pct <= 0) return "not_started";
  if (pct < 40) return "weak";
  if (pct < 70) return "familiar";
  if (pct < 90) return "proficient";
  return "mastered";
}

export function getMasteryLabel(level: string): string {
  const labels: Record<string, string> = {
    not_started: "Not Started",
    weak: "Weak",
    familiar: "Familiar",
    proficient: "Proficient",
    mastered: "Mastered",
  };
  return labels[level] || level;
}

export function getMasteryIcon(level: string): string {
  const icons: Record<string, string> = {
    not_started: "\u25CB",
    weak: "\uD83D\uDEE1\uFE0F",
    familiar: "\uD83D\uDD25",
    proficient: "\uD83C\uDFC5",
    mastered: "\uD83D\uDC8E",
  };
  return icons[level] || "\u25CB";
}

export function getMasteryTierName(level: string): string {
  const tiers: Record<string, string> = {
    not_started: "Unranked",
    weak: "Bronze",
    familiar: "Silver",
    proficient: "Gold",
    mastered: "Diamond",
  };
  return tiers[level] || level;
}
