"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Gift, Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

const STORAGE_KEY = "sparkupcloud_exit_intent_v1";
const DISMISS_DAYS = 30; // Don't show again for 30 days after dismiss

/**
 * Exit-intent / abandonment popup.
 *
 * Triggers:
 *   - Desktop: mouse moves above the viewport top edge (`mouseout` to <html>)
 *   - Mobile: a fast upward scroll past the fold OR 45s of idle time
 *
 * Suppression rules:
 *   - Already a logged-in user (any plan) → never show
 *   - Already dismissed within DISMISS_DAYS → don't show
 *   - Already showed once this session → don't show again
 *
 * The lead magnet is a free 5-question diagnostic + a study cheatsheet —
 * both deliverable post-registration so the popup also doubles as a signup CTA.
 */
export function ExitIntentPopup() {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Wait for the auth store to hydrate before deciding whether to arm.
    if (!hasHydrated) return;
    if (user) return; // Logged-in users get no popup

    // Respect dismissal cookie
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const dismissedAt = Number(stored);
        if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
          return;
        }
      }
    } catch {
      // localStorage may throw in privacy modes — silently arm anyway
    }

    let armed = true;
    let lastScrollY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (!armed) return;
      armed = false;
      setOpen(true);
    };

    // Desktop: mouse out the top of the viewport
    const onMouseOut = (e: MouseEvent) => {
      // relatedTarget null = left the document; clientY <= 0 = top edge
      if (!e.relatedTarget && e.clientY <= 0) {
        trigger();
      }
    };

    // Mobile: rapid upward scroll past the fold
    const onScroll = () => {
      const y = window.scrollY;
      const dy = lastScrollY - y;
      if (y > 600 && dy > 80) trigger();
      lastScrollY = y;
    };

    // Idle fallback (universal): 45s with no interaction
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(trigger, 45_000);
    };

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    ["click", "keydown", "touchstart"].forEach((ev) =>
      document.addEventListener(ev, resetIdle, { passive: true })
    );
    resetIdle();

    return () => {
      armed = false;
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
      ["click", "keydown", "touchstart"].forEach((ev) =>
        document.removeEventListener(ev, resetIdle)
      );
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [user, hasHydrated]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore localStorage failures (private mode, etc.)
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 px-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow">
          <Gift className="h-6 w-6 text-white" />
        </div>

        <h2
          id="exit-intent-title"
          className="text-center text-2xl font-bold text-stone-900"
        >
          Wait — grab your free starter pack
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Get a 5-question diagnostic + cheat sheet for your target cert.
          No credit card. Takes under 60 seconds.
        </p>

        <ul className="mt-5 space-y-2 text-sm text-stone-700">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>Free diagnostic across 5 real exam questions</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>Printable 1-page cheat sheet for any 1 cert</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>10 free practice questions per day, forever</span>
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/register?utm_source=exit_intent"
            onClick={dismiss}
            className="flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md hover:scale-[1.02] transition-all"
          >
            Get my free starter pack →
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            No thanks, I&apos;ll keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
