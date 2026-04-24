"use client";

import { useEffect, useState } from "react";
import { Sparkles, GraduationCap, X, Lightbulb, PartyPopper } from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import { cn } from "@/lib/utils";

const TYPE_STYLES = {
  intervene: {
    bg: "bg-violet-50 border-violet-300",
    accent: "from-violet-500 to-violet-600",
    iconBg: "bg-violet-500",
    Icon: GraduationCap,
    badge: "Coach is stepping in",
    badgeColor: "bg-violet-100 text-violet-800",
  },
  nudge: {
    bg: "bg-amber-50 border-amber-300",
    accent: "from-amber-400 to-amber-500",
    iconBg: "bg-amber-500",
    Icon: Lightbulb,
    badge: "Coach noticed something",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  celebrate: {
    bg: "bg-emerald-50 border-emerald-300",
    accent: "from-emerald-400 to-emerald-500",
    iconBg: "bg-emerald-500",
    Icon: PartyPopper,
    badge: "Coach says nice work",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  takeover_offer: {
    bg: "bg-violet-50 border-violet-300",
    accent: "from-violet-500 to-amber-500",
    iconBg: "bg-violet-500",
    Icon: Sparkles,
    badge: "Coach offers to drive",
    badgeColor: "bg-violet-100 text-violet-800",
  },
} as const;

interface Props {
  className?: string;
}

/**
 * Slim, non-intrusive banner that appears when the agentic Coach decides
 * to speak up. Shows the suggestion + an "accept" button that opens the
 * Coach side panel with the seed question pre-loaded.
 */
export function CoachInterventionBanner({ className = "" }: Props) {
  const intervention = useCoachStore((s) => s.pendingIntervention);
  const accept = useCoachStore((s) => s.acceptIntervention);
  const dismiss = useCoachStore((s) => s.dismissIntervention);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (intervention) {
      setMounted(true);
    } else {
      // Allow exit animation to complete
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [intervention]);

  if (!intervention && !mounted) return null;
  if (!intervention) return null;

  const style = TYPE_STYLES[intervention.type] ?? TYPE_STYLES.nudge;
  const Icon = style.Icon;

  return (
    <div
      className={cn(
        "rounded-xl border-2 shadow-md overflow-hidden",
        style.bg,
        "animate-in slide-in-from-top-3 fade-in duration-300",
        className
      )}
    >
      <div className={`h-1 bg-gradient-to-r ${style.accent}`} />
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${style.iconBg} text-white shadow-sm`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  style.badgeColor
                )}
              >
                {style.badge}
              </span>
              <span className="text-sm font-bold text-stone-900">
                {intervention.title}
              </span>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              <Markdownish text={intervention.message} />
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={accept}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-4 py-1.5 text-xs font-bold shadow-sm transition-colors"
              >
                {intervention.action_label || "Yes, help me"}
                <Sparkles className="h-3 w-3" />
              </button>
              <button
                onClick={dismiss}
                className="inline-flex items-center rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-600 px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 -mt-1 -mr-1 rounded-md p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Render **bold** segments only — keeps the banner light. */
function Markdownish({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold text-stone-900">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
