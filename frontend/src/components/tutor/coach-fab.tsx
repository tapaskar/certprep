"use client";

import { Sparkles } from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import { CoachAvatar } from "./coach-avatar";

/**
 * Floating Action Button — always visible in the bottom-right of the auth
 * area. One click opens the Coach side panel. When an intervention is
 * pending, a glowing dot draws attention.
 *
 * Avatar = Sage (the Coach persona). When an intervention is pending,
 * Sage shows the "thinking" state to telegraph "I want to tell you
 * something."
 */
export function CoachFAB() {
  const open = useCoachStore((s) => s.openPanel);
  const panelOpen = useCoachStore((s) => s.panelOpen);
  const pending = useCoachStore((s) => s.pendingIntervention);

  if (panelOpen) return null;

  return (
    <button
      onClick={() => open()}
      title="Ask Coach"
      aria-label="Open Coach"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-100 ring-2 ring-amber-300/60 shadow-xl hover:scale-110 hover:ring-amber-400 transition-all group"
    >
      <CoachAvatar size={44} state={pending ? "thinking" : "idle"} />
      {pending && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </span>
        </span>
      )}
      <span className="absolute right-full mr-3 whitespace-nowrap rounded-md bg-stone-900 text-white text-xs font-semibold px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Ask Coach
      </span>
    </button>
  );
}
