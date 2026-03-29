"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface XpBadgeProps {
  amount: number;
  label?: string;
}

export function XpBadge({ amount, label }: XpBadgeProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (amount <= 0) {
      setDisplayed(0);
      return;
    }

    let current = 0;
    const step = Math.max(1, Math.floor(amount / 20));
    const interval = setInterval(() => {
      current = Math.min(current + step, amount);
      setDisplayed(current);
      if (current >= amount) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [amount]);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5">
      <Star className="h-4 w-4 text-amber-500" />
      <span className="text-sm font-bold text-amber-700">
        +{displayed} XP
      </span>
      {label && (
        <span className="text-xs text-amber-500">{label}</span>
      )}
    </div>
  );
}
