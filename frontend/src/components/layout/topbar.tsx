"use client";

import { Flame, User } from "lucide-react";
import { useProgressStore } from "@/stores/progress-store";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Dashboard" }: TopbarProps) {
  const progress = useProgressStore((s) => s.progress);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-16 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6">
      {/* Left: page title */}
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      {/* Right: streak + avatar */}
      <div className="flex items-center gap-4">
        {/* Streak counter */}
        {progress && (
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-foreground">
              {progress.streak.current_days}
            </span>
          </div>
        )}

        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
