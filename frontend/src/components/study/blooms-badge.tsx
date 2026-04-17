"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import {
  inferBloomsLevel,
  getBloomsInfo,
  type BloomsLevel,
} from "@/lib/blooms";

interface BloomsBadgeProps {
  difficultyTier?: number | null;
  level?: BloomsLevel; // if explicitly set
  size?: "sm" | "md";
  showTooltip?: boolean;
}

export function BloomsBadge({
  difficultyTier,
  level,
  size = "md",
  showTooltip = true,
}: BloomsBadgeProps) {
  const [hover, setHover] = useState(false);
  const blooms = level
    ? getBloomsInfo(level)
    : getBloomsInfo(inferBloomsLevel(difficultyTier));

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5 gap-1"
      : "text-xs px-2 py-1 gap-1.5";

  return (
    <span className="relative inline-block">
      <span
        className={`inline-flex items-center font-semibold rounded-full border ${blooms.color} ${sizeClasses}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span>{blooms.emoji}</span>
        <span>{blooms.label}</span>
        {showTooltip && size !== "sm" && (
          <Info className="h-3 w-3 opacity-50" />
        )}
      </span>
      {showTooltip && hover && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-64 rounded-md bg-stone-900 text-white text-xs p-2.5 shadow-lg">
          <div className="font-semibold mb-1">
            Bloom&apos;s Level {blooms.order}/6: {blooms.label}
          </div>
          <div className="text-stone-300">{blooms.description}</div>
        </div>
      )}
    </span>
  );
}
