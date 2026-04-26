"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Sticky upgrade prompt for free tools (visualizer, simulator, scenarios).
 *
 * UX-testing finding: users hit a free tool from search, played with it,
 * and never discovered the paid product. This banner sits at the top of
 * the viewport on those pages with a single, explicit CTA to either
 * Pricing (anonymous) or to start prepping (logged-in but no paid plan).
 *
 * Dismiss state is per-tool, persists for 7 days. Logged-in *paid* users
 * never see it (no point pitching pricing to someone already paying).
 *
 * Design intent: this is a thin, clay-coloured strip — not a modal, not
 * an interstitial. It must never block content or shift layout, only
 * sit above the existing nav. Accessibility: announced as a region,
 * dismiss button is reachable via keyboard.
 */

interface UpgradeBannerProps {
  /** Unique key per tool — used for the dismissal cookie/localStorage */
  toolId: string;
  /** Short marketing line shown to anonymous visitors */
  message?: string;
  /** Override the call-to-action label */
  ctaLabel?: string;
  /** Where the CTA goes — defaults to /pricing */
  href?: string;
}

const DISMISS_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function UpgradeBanner({
  toolId,
  message = "Like this tool? Get the full prep platform — practice questions, AI tutor, mock exams.",
  ctaLabel = "See plans →",
  href = "/pricing",
}: UpgradeBannerProps) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  const storageKey = `sparkupcloud_upgrade_dismissed_${toolId}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = parseInt(raw, 10);
      // Re-show after the dismissal expires
      if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_DAYS * DAY_MS) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  // Wait for hydration before rendering — avoids flashing the banner
  // to authed paid users for a frame.
  if (!hasHydrated) return null;
  if (dismissed) return null;

  // Paid users get nothing — they're already converted.
  const isPaid = user?.plan && user.plan !== "free";
  if (isPaid) return null;

  // Logged-in free users get a more relevant message.
  const isAnonymous = !user;
  const finalMessage = isAnonymous
    ? message
    : `Ready to go deeper? Unlock the full prep platform — adaptive questions, AI tutor, mock exams.`;
  const finalHref = isAnonymous ? href : "/pricing";
  const finalCta = isAnonymous ? ctaLabel : "Upgrade →";

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Upgrade promotion"
      className="relative z-30 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100/70 to-orange-50 px-4 py-2.5 text-sm shadow-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="truncate text-stone-800 sm:whitespace-normal">
            {finalMessage}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={finalHref}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700"
          >
            {finalCta}
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss for a week"
            className="rounded-md p-1.5 text-amber-700 hover:bg-amber-200/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
