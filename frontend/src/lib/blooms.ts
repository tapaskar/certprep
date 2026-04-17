/**
 * Bloom's Taxonomy cognitive level mapping.
 *
 * Since concepts don't have an explicit blooms_level in the DB yet, we infer
 * it from `difficulty_tier` (1–5). When a backend field is added, swap
 * `inferBloomsLevel()` for a direct read.
 */

export type BloomsLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export interface BloomsInfo {
  level: BloomsLevel;
  label: string;
  order: number; // 1 = lowest, 6 = highest
  description: string;
  color: string; // tailwind bg/text pair
  emoji: string;
}

export const bloomsLevels: Record<BloomsLevel, BloomsInfo> = {
  remember: {
    level: "remember",
    label: "Remember",
    order: 1,
    description: "Recall facts and basic concepts",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    emoji: "📘",
  },
  understand: {
    level: "understand",
    label: "Understand",
    order: 2,
    description: "Explain ideas or concepts",
    color: "bg-teal-100 text-teal-700 border-teal-200",
    emoji: "💡",
  },
  apply: {
    level: "apply",
    label: "Apply",
    order: 3,
    description: "Use information in new situations",
    color: "bg-green-100 text-green-700 border-green-200",
    emoji: "🛠️",
  },
  analyze: {
    level: "analyze",
    label: "Analyze",
    order: 4,
    description: "Draw connections among ideas",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    emoji: "🔍",
  },
  evaluate: {
    level: "evaluate",
    label: "Evaluate",
    order: 5,
    description: "Justify a stand or decision",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    emoji: "⚖️",
  },
  create: {
    level: "create",
    label: "Create",
    order: 6,
    description: "Produce new or original work",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    emoji: "🎨",
  },
};

/**
 * Infer Bloom's level from a concept's difficulty_tier (1-5).
 * Fundamentals concepts = Remember/Understand.
 * Applied concepts = Apply/Analyze.
 * Architecture/tradeoff concepts = Evaluate/Create.
 */
export function inferBloomsLevel(
  difficultyTier: number | null | undefined
): BloomsLevel {
  const t = difficultyTier ?? 2;
  if (t <= 1) return "remember";
  if (t === 2) return "understand";
  if (t === 3) return "apply";
  if (t === 4) return "analyze";
  if (t === 5) return "evaluate";
  return "understand";
}

export function getBloomsInfo(level: BloomsLevel): BloomsInfo {
  return bloomsLevels[level];
}
