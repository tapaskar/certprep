"use client";

import { useEffect } from "react";
import { X, GraduationCap } from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import { TutorChat } from "./tutor-chat";

/**
 * Slide-out Coach panel from the right edge.
 *
 * Source of truth for "is the panel open" is the coach store, so any
 * component anywhere in the app can call `useCoachStore.openPanel()` to
 * raise it, and intervention banners can `acceptIntervention()` to seed
 * a starter message.
 */
export function CoachSidePanel() {
  const open = useCoachStore((s) => s.panelOpen);
  const close = useCoachStore((s) => s.closePanel);
  const seed = useCoachStore((s) => s.seedMessage);
  const examId = useCoachStore((s) => s.examId);
  const pathId = useCoachStore((s) => s.pathId);
  const stepId = useCoachStore((s) => s.stepId);
  const conceptId = useCoachStore((s) => s.conceptId);

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
        className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] lg:w-[480px] transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="h-full bg-white shadow-2xl flex flex-col border-l border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Coach</div>
                <div className="text-[10px] text-stone-500">
                  Press ESC to close
                </div>
              </div>
            </div>
            <button
              onClick={close}
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close Coach"
            >
              <X className="h-4 w-4" />
            </button>
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
