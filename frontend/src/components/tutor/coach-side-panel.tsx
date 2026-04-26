"use client";

import { useEffect, useState } from "react";
import { X, Maximize2, Minimize2, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import { TutorChat } from "./tutor-chat";
import { CoachAvatar } from "./coach-avatar";
import { cn } from "@/lib/utils";

/**
 * Slide-out Coach panel from the right edge.
 *
 * Resizable: cycles through compact → wide → fullscreen → compact
 * via the size button in the header. Preference persists in
 * localStorage so the user gets their last shape on next open.
 *
 * Mobile (< sm): always full-width regardless of size — fits the
 * device screen. Desktop sizes only kick in at sm and above.
 */

const SIZE_STORAGE_KEY = "sparkupcloud_coach_panel_size";
type PanelSize = "compact" | "wide" | "full";

const SIZE_CLASSES: Record<PanelSize, string> = {
  // Mobile is always full width; the breakpoints below kick in on tablet+
  compact: "w-full sm:w-[440px] lg:w-[520px]",
  wide:    "w-full sm:w-[640px] lg:w-[760px] xl:w-[860px]",
  full:    "w-full sm:max-w-[1080px]",
};

export function CoachSidePanel() {
  const open = useCoachStore((s) => s.panelOpen);
  const close = useCoachStore((s) => s.closePanel);
  const seed = useCoachStore((s) => s.seedMessage);
  const examId = useCoachStore((s) => s.examId);
  const pathId = useCoachStore((s) => s.pathId);
  const stepId = useCoachStore((s) => s.stepId);
  const conceptId = useCoachStore((s) => s.conceptId);

  const [size, setSize] = useState<PanelSize>("compact");

  // Restore last chosen size on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIZE_STORAGE_KEY) as PanelSize | null;
      if (saved === "compact" || saved === "wide" || saved === "full") {
        setSize(saved);
      }
    } catch {
      /* SSR / blocked storage */
    }
  }, []);

  const cycleSize = () => {
    setSize((prev) => {
      const next: PanelSize =
        prev === "compact" ? "wide" : prev === "wide" ? "full" : "compact";
      try {
        localStorage.setItem(SIZE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // ESC closes the panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Pick the right resize icon + tooltip for the next state
  const sizeMeta: Record<PanelSize, { Icon: typeof Maximize2; title: string }> = {
    compact: { Icon: ChevronsLeft, title: "Make wider" },
    wide:    { Icon: Maximize2,    title: "Maximize" },
    full:    { Icon: Minimize2,    title: "Back to compact" },
  };
  const SizeIcon = sizeMeta[size].Icon;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={close}
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 transform transition-all duration-300 ease-out",
          SIZE_CLASSES[size],
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="h-full bg-white shadow-2xl flex flex-col border-l border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-stone-200 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <CoachAvatar size={36} state="idle" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-stone-900">Sage</div>
                <div className="text-[10px] text-stone-500 truncate">
                  Your Coach · ESC to close
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Resize toggle — hidden on mobile (always full width there) */}
              <button
                onClick={cycleSize}
                className="hidden sm:inline-flex rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                title={sizeMeta[size].title}
                aria-label={sizeMeta[size].title}
              >
                {size === "compact" ? (
                  <ChevronsLeft className="h-4 w-4" />
                ) : (
                  <SizeIcon className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={close}
                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Close Coach"
                title="Close (ESC)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat — only mount when open to avoid background API calls */}
          <div className="flex-1 min-h-0">
            {open && (
              <TutorChat
                key={`${pathId ?? ""}-${examId ?? ""}-${stepId ?? ""}`}
                examId={examId}
                pathId={pathId}
                stepId={stepId}
                conceptId={conceptId}
                initialUserMessage={seed ?? undefined}
                className="h-full border-0 rounded-none shadow-none"
              />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// Suppress unused-import lint when ChevronsRight isn't used in the JSX
// branch above. Kept for future "compact-from-wide" direction tweaks.
void ChevronsRight;
