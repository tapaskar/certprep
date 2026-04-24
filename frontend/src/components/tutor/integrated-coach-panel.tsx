"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { TutorChat } from "./tutor-chat";
import { cn } from "@/lib/utils";

export interface IntegratedCoachPanelProps {
  /** Identifies what Coach is scoped to */
  examId?: string;
  conceptId?: string;
  conceptName?: string;
  pathId?: string;
  pathTitle?: string;
  stepId?: string;
  stepTitle?: string;
  /** Free-form phase/context label used for the footer hint */
  contextHint?: string;
  /** Used to namespace the localStorage collapse preference */
  storageKey?: string;
  /** Override the default sticky height (defaults to viewport - 6rem) */
  className?: string;
}

/**
 * Persistent right-rail Coach panel — used by both /study and /paths/[id]
 * so the integration feels identical wherever Coach appears.
 *
 *   - Sticky at top: 5rem
 *   - Collapsible to a 44px vertical sliver (state persisted)
 *   - Auto-scoped via the props (TutorChat handles history loading)
 *   - Optional phase-aware hint footer
 */
export function IntegratedCoachPanel({
  examId,
  conceptId,
  conceptName,
  pathId,
  pathTitle,
  stepId,
  stepTitle,
  contextHint,
  storageKey = "sparkupcloud_coach_collapsed",
  className = "",
}: IntegratedCoachPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Persist preference (per-storage-key so /study and /paths can differ)
  useEffect(() => {
    const v = localStorage.getItem(storageKey);
    if (v === "1") setCollapsed(true);
  }, [storageKey]);
  useEffect(() => {
    localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [storageKey, collapsed]);

  // Scope label for the header
  const scopeLabel = stepTitle
    ? `Step: ${stepTitle}`
    : pathTitle
    ? `Path: ${pathTitle}`
    : conceptName
    ? `Concept: ${conceptName}`
    : "This session";

  return (
    <aside
      className={cn(
        "hidden lg:block self-start sticky top-20",
        className
      )}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="group relative w-11 h-[calc(100vh-6rem)] rounded-xl border border-stone-200 bg-white shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-between py-4"
          title="Show Coach"
          aria-label="Show Coach panel"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-white">
            <Lightbulb className="h-4 w-4" />
          </div>
          <span
            className="text-[11px] font-bold tracking-wider text-stone-500 group-hover:text-stone-900"
            style={{ writingMode: "vertical-rl" }}
          >
            SHOW COACH
          </span>
          <ChevronLeft className="h-4 w-4 text-stone-400 group-hover:text-stone-700" />
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden border border-stone-200 bg-white shadow-sm h-[calc(100vh-6rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2 shrink-0 bg-gradient-to-r from-violet-50/40 to-amber-50/40">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Coach is watching
              </div>
              <div className="text-[11px] font-semibold text-stone-800 truncate">
                {scopeLabel}
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="shrink-0 ml-2 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              title="Collapse Coach"
              aria-label="Collapse Coach panel"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Chat — TutorChat handles history loading + scope */}
          <div className="flex-1 min-h-0">
            <TutorChat
              examId={examId}
              conceptId={conceptId}
              conceptName={conceptName}
              pathId={pathId}
              pathTitle={pathTitle}
              stepId={stepId}
              stepTitle={stepTitle}
              className="h-full border-0 rounded-none shadow-none"
            />
          </div>

          {/* Optional context hint */}
          {contextHint && (
            <div className="border-t border-stone-200 bg-amber-50/40 px-3 py-2 text-[11px] text-amber-800 shrink-0">
              💡 {contextHint}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
