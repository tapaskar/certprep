"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, X, Shield, Zap, BookOpen, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  readAuthCookie,
  setPendingPlan,
  readPendingPlan,
  clearPendingPlan,
} from "@/lib/auth-cookie";

type Billing = "monthly" | "annual";

interface Feature {
  text: string;
  included: boolean;
}

interface Tier {
  name: string;
  tagline: string;
  icon: typeof Zap;
  iconBg: string;
  iconColor: string;
  price: string | ((billing: Billing) => string);
  priceNote: string | ((billing: Billing) => string);
  highlighted: boolean;
  badge?: string;
  features: Feature[];
  cta: string;
  ctaHref: string;
  ctaStyle: "primary" | "secondary" | "outline";
  showToggle?: boolean;
}

const tiers: Tier[] = [
  {
    name: "Free",
    tagline: "Explore at your own pace",
    icon: BookOpen,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-500",
    price: "$0",
    priceNote: "forever",
    highlighted: false,
    features: [
      { text: "50% content of 1 exam", included: true },
      { text: "Basic practice questions", included: true },
      { text: "Progress tracking", included: true },
      { text: "Community access", included: true },
      { text: "Full exam content", included: false },
      { text: "AI-powered explanations", included: false },
      { text: "Mock exams", included: false },
      { text: "Smart spaced repetition", included: false },
    ],
    cta: "Get Started Free",
    ctaHref: "/register?plan=free",
    ctaStyle: "secondary",
  },
  {
    name: "Single Exam",
    tagline: "Master one certification",
    icon: Zap,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
    price: "$9.99",
    priceNote: "one-time / 6 months access",
    highlighted: false,
    features: [
      { text: "Full content of 1 exam", included: true },
      { text: "Unlimited practice questions", included: true },
      { text: "AI-powered explanations", included: true },
      { text: "Smart spaced repetition", included: true },
      { text: "Mock exams for 1 cert", included: true },
      { text: "Readiness score tracking", included: true },
      { text: "6-month access duration", included: true },
      { text: "All certifications", included: false },
    ],
    cta: "Buy Now",
    ctaHref: "/register?plan=single",
    ctaStyle: "outline",
  },
  {
    name: "Pro",
    tagline: "Completely unlocked",
    icon: Crown,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-500",
    price: (billing) => (billing === "annual" ? "$12.50" : "$19.99"),
    priceNote: (billing) =>
      billing === "annual" ? "per month, billed at $149.99/year" : "per month",
    highlighted: true,
    badge: "Most Popular",
    showToggle: true,
    features: [
      { text: "All 76+ certifications (AWS, Azure, GCP, CompTIA, NVIDIA)", included: true },
      { text: "Unlimited practice questions", included: true },
      { text: "AI-powered explanations", included: true },
      { text: "Smart spaced repetition (SM-2)", included: true },
      { text: "Unlimited mock exams", included: true },
      { text: "Real-time readiness scores", included: true },
      { text: "AI-generated study plans", included: true },
      { text: "Weekly reports & analytics", included: true },
    ],
    // CTA was "Start Free Trial" — misleading because Gumroad charges
    // immediately and there is no actual trial period. Truthful copy
    // first; we'll reintroduce a real trial only if/when we wire
    // Gumroad's free-trial product setting.
    cta: "Get Pro",
    ctaHref: "/register?plan=pro",
    ctaStyle: "primary",
  },
];

// Map our internal plan names to the visual tier name in the cards.
// A user on `pro_annual` or `pro_monthly` is on the Pro tier; on
// `single` they're on Single Exam; everything else is Free. This lets
// us put the "Current Plan" check on the right card instead of always
// on Free.
function planToTierName(plan: string | undefined): string {
  if (!plan) return "Free";
  if (plan === "pro_annual" || plan === "pro_monthly") return "Pro";
  if (plan === "single") return "Single Exam";
  return "Free";
}

export default function PricingCards() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>("Free");
  const autoCheckoutTriggered = useRef(false);

  // Open Gumroad checkout for the given plan.
  //
  // Same-tab navigation (window.location.href) instead of a new tab
  // (window.open). Two reasons:
  //   1. Most browsers popup-block window.open when not triggered by a
  //      direct user gesture. The auto-checkout path on this page fires
  //      from a useEffect — guaranteed to be popup-blocked, which silently
  //      killed the entire post-signup conversion path.
  //   2. The user's payment journey is linear (cart → pay → return). A
  //      new tab fragments their attention; same-tab keeps the back
  //      button working and hands them a clean return-to-dashboard
  //      flow when Gumroad redirects after purchase.
  const openCheckout = async (plan: string) => {
    let url: string | null = null;
    try {
      const { checkout_url } = await api.createCheckout(plan);
      url = checkout_url;
    } catch {
      const urls: Record<string, string> = {
        single: "https://tapasaurus.gumroad.com/l/eutwyu",
        pro_monthly: "https://tapasaurus.gumroad.com/l/arfrcr",
        pro_annual: "https://tapasaurus.gumroad.com/l/zpchn",
      };
      if (urls[plan]) url = urls[plan];
    }
    if (url) {
      window.location.href = url;
    }
  };

  useEffect(() => {
    // Prefer cookie (faster, no race with zustand hydration)
    const cookie = readAuthCookie();
    const tokenInStorage =
      typeof window !== "undefined"
        ? localStorage.getItem("sparkupcloud_token")
        : null;
    const loggedIn = !!cookie || !!tokenInStorage;
    setIsLoggedIn(loggedIn);

    // Pull the user's current plan from the auth cookie so we can put
    // the "Current Plan" check on the right card. Was always landing
    // on Free regardless of what they actually paid for.
    if (cookie?.p) {
      setCurrentTier(planToTierName(cookie.p));
    }

    // If user just logged in/registered with a pending plan, auto-trigger checkout
    if (loggedIn && !autoCheckoutTriggered.current) {
      const pending = readPendingPlan();
      if (pending) {
        autoCheckoutTriggered.current = true;
        clearPendingPlan();
        // Small delay so the page has time to render
        setTimeout(() => openCheckout(pending), 300);
      }
    }
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
      {/* Pricing cards (Pro tier has inline annual/monthly selector) */}
      <div className="grid gap-8 lg:grid-cols-3">
        {tiers.map((tier) => {
          const price =
            typeof tier.price === "function"
              ? tier.price(billing)
              : tier.price;
          const priceNote =
            typeof tier.priceNote === "function"
              ? tier.priceNote(billing)
              : tier.priceNote;

          return (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-xl p-8 transition-all duration-200",
                tier.highlighted
                  ? "border-2 border-amber-400 bg-white shadow-lg shadow-amber-100/50 ring-1 ring-amber-400/20 lg:scale-[1.03]"
                  : "border border-stone-200 bg-white shadow-md shadow-stone-200/60",
                tier.name === "Pro" && "order-first lg:order-none"
              )}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1 text-xs font-bold text-white shadow-sm">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg",
                      tier.iconBg
                    )}
                  >
                    <tier.icon className={cn("h-6 w-6", tier.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-stone-400">{tier.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                {tier.showToggle ? (
                  <div className="space-y-2">
                    {/* Both prices visible side-by-side */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBilling("annual")}
                        className={cn(
                          "rounded-lg border-2 p-3 text-left transition-all",
                          billing === "annual"
                            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Annual
                          </span>
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                            Save 37%
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-0.5">
                          <span className="text-2xl font-bold tracking-tight text-stone-900">
                            $12.50
                          </span>
                          <span className="text-xs text-stone-400">/mo</span>
                        </div>
                        <p className="text-[10px] text-stone-500">
                          $149.99/yr billed once
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBilling("monthly")}
                        className={cn(
                          "rounded-lg border-2 p-3 text-left transition-all",
                          billing === "monthly"
                            ? "border-stone-900 bg-stone-50 ring-2 ring-stone-200"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                            Monthly
                        </span>
                        <div className="mt-1 flex items-baseline gap-0.5">
                          <span className="text-2xl font-bold tracking-tight text-stone-900">
                            $19.99
                          </span>
                          <span className="text-xs text-stone-400">/mo</span>
                        </div>
                        <p className="text-[10px] text-stone-500">
                          Billed monthly
                        </p>
                      </button>
                    </div>
                    <p className="text-xs text-stone-500">
                      {billing === "annual"
                        ? "✓ Selected: Annual — save $89.89/year"
                        : "Switch to annual to save $89.89/year"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-stone-900">
                        {price}
                      </span>
                      {tier.name !== "Single Exam" && (
                        <span className="text-sm text-stone-400">/mo</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-stone-400">{priceNote}</p>
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        feature.included ? "text-stone-700" : "text-stone-400"
                      )}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA — three states:
                    1. Logged-in AND this tier is the user's CURRENT plan → "✓ Current Plan"
                    2. Logged-in AND a paid tier (not their current) → in-app checkout button
                    3. Logged-out → /register link with the plan saved for resume-checkout
                  Previously state 1 always landed on Free regardless of
                  the user's actual plan, which made a Pro user see "Current
                  Plan" on Free — directly contradicting their billing reality. */}
              {isLoggedIn && tier.name === currentTier ? (
                <Link
                  href="/dashboard"
                  className="flex h-12 items-center justify-center rounded-lg text-sm font-bold transition-all bg-emerald-50 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  ✓ Current Plan
                </Link>
              ) : isLoggedIn && tier.name !== "Free" ? (
                <button
                  onClick={() => {
                    const plan = tier.showToggle
                      ? `pro_${billing}`
                      : "single";
                    openCheckout(plan);
                  }}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-lg text-sm font-bold transition-all cursor-pointer",
                    tier.ctaStyle === "primary" &&
                      "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200/50 hover:scale-[1.02]",
                    tier.ctaStyle === "outline" &&
                      "border-2 border-stone-300 text-stone-700 hover:border-amber-400 hover:text-amber-700"
                  )}
                >
                  {tier.cta}
                </button>
              ) : (
                <Link
                  href={
                    tier.showToggle
                      ? `${tier.ctaHref}-${billing}`
                      : tier.ctaHref
                  }
                  onClick={() => {
                    // Save the plan choice so we can resume checkout after auth
                    if (tier.name !== "Free") {
                      const plan = tier.showToggle
                        ? `pro_${billing}`
                        : "single";
                      setPendingPlan(plan);
                    }
                  }}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-lg text-sm font-bold transition-all",
                    tier.ctaStyle === "primary" &&
                      "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200/50 hover:scale-[1.02]",
                    tier.ctaStyle === "secondary" &&
                      "bg-stone-900 text-white hover:bg-stone-800",
                    tier.ctaStyle === "outline" &&
                      "border-2 border-stone-300 text-stone-700 hover:border-amber-400 hover:text-amber-700"
                  )}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Guarantee */}
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-stone-500">
        <Shield className="h-4 w-4 text-green-500" />
        <span>Pass or get 100% refund. No questions asked.</span>
      </div>
    </section>
  );
}
