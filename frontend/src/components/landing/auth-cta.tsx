"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, LayoutDashboard, Crown, Sparkles } from "lucide-react";
import { readAuthCookie, type AuthCookiePayload } from "@/lib/auth-cookie";

type Variant =
  | "nav-desktop" // top nav links (right side)
  | "hero" // big hero buttons
  | "cta-banner"; // bottom amber CTA banner

interface AuthCTAProps {
  variant: Variant;
}

/**
 * Auth-aware CTA buttons. Reads the `sparkupcloud_session` cookie set by the
 * auth store on login. Default render is logged-out state, then switches to
 * logged-in UI on mount if a session cookie is present.
 *
 * This avoids the need for a server cookie read (which would opt the page
 * into dynamic rendering) while still delivering near-instant logged-in UI.
 */
export function AuthCTA({ variant }: AuthCTAProps) {
  const [auth, setAuth] = useState<AuthCookiePayload | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAuth(readAuthCookie());
    setHydrated(true);
    // Re-check on focus in case the user logged in/out in another tab
    const onFocus = () => setAuth(readAuthCookie());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const isPaid = auth && auth.p && auth.p !== "free";

  // ─────────────────────── DESKTOP NAV ───────────────────────
  if (variant === "nav-desktop") {
    if (!hydrated || !auth) {
      // Logged-out (default until hydration completes)
      return (
        <>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-stone-800"
          >
            Get Started Free
          </Link>
        </>
      );
    }
    // Logged-in: show Dashboard + Upgrade (or Manage Plan if already paid)
    return (
      <>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        {!isPaid && (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:scale-105 transition-all"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Pro
          </Link>
        )}
        {isPaid && (
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {auth.n.split(" ")[0] || "Account"}
          </Link>
        )}
      </>
    );
  }

  // ─────────────────────── HERO ───────────────────────
  if (variant === "hero") {
    if (!hydrated || !auth) {
      // Cold traffic from Google Ads needs THREE choices, not two:
      //   1. Sign up (highest commitment)
      //   2. Try the product instantly with zero commitment ← the
      //      missing link that was killing conversions. Without
      //      this, evaluators bounce because the only way to see
      //      the product is to hand over an email.
      //   3. See pricing (lower commitment than signup, higher than try)
      return (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
            <Link
              href="/register"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-base font-bold text-white shadow-md shadow-stone-200/60 hover:scale-105 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/try-questions?utm_source=hero_cta"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border-2 border-stone-300 bg-white px-6 text-base font-bold text-stone-800 hover:border-amber-400 hover:text-amber-700 transition-all"
            >
              Try 5 Questions — No Signup →
            </Link>
          </div>
          {/* Trust strip directly under the CTAs — names the
              friction-killers buyers actually wonder about (cost,
              card, refund). Single-line on desktop, wraps on mobile. */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card
            </span>
            <span className="text-stone-300">·</span>
            <span>8,800+ practice questions</span>
            <span className="text-stone-300">·</span>
            <span>Pass-or-refund on Pro</span>
          </div>
          <Link
            href="/pricing"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            View Pricing →
          </Link>
        </>
      );
    }
    return (
      <>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-stone-900 px-8 text-base font-bold text-white shadow-md hover:bg-stone-800 transition-all"
          >
            <LayoutDashboard className="h-5 w-5" />
            Continue Studying
          </Link>
          {!isPaid && (
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-base font-bold text-white shadow-md hover:scale-105 transition-all"
            >
              <Crown className="h-5 w-5" />
              Upgrade to Pro
            </Link>
          )}
        </div>
        <p className="text-sm text-stone-500">
          Welcome back, <span className="font-semibold text-stone-700">{auth.n}</span>
          {isPaid ? (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
              <Sparkles className="h-3 w-3" /> {auth.p.replace("_", " ")}
            </span>
          ) : null}
        </p>
      </>
    );
  }

  // ─────────────────────── CTA BANNER ───────────────────────
  if (!hydrated || !auth) {
    return (
      <>
        <Link
          href="/register"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-bold text-amber-600 shadow-md transition-all hover:scale-105"
        >
          Create Free Account
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center gap-2 justify-center rounded-lg border-2 border-white/40 px-8 text-base font-semibold text-white transition-all hover:bg-white/10"
        >
          <LogIn className="h-4 w-4" />
          Sign In to Your Account
        </Link>
      </>
    );
  }

  // Logged in CTA banner — show upgrade / continue
  return (
    <>
      {!isPaid ? (
        <Link
          href="/pricing"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-bold text-amber-600 shadow-md hover:scale-105 transition-all"
        >
          <Crown className="h-5 w-5" />
          Upgrade to Pro Now
        </Link>
      ) : (
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-bold text-amber-600 shadow-md hover:scale-105 transition-all"
        >
          <LayoutDashboard className="h-5 w-5" />
          Open Dashboard
        </Link>
      )}
      <Link
        href="/dashboard"
        className="inline-flex h-12 items-center gap-2 justify-center rounded-lg border-2 border-white/40 px-8 text-base font-semibold text-white transition-all hover:bg-white/10"
      >
        Continue Studying
      </Link>
    </>
  );
}
