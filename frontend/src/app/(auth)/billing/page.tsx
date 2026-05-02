"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Crown,
  Calendar,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

/**
 * Plan & billing landing page.
 *
 * Single comprehensive surface for "what plan am I on, when does it
 * end, how do I change it" — replaces the previous absence of any
 * subscription-management UI on SparkUpCloud at all (users had to
 * find their way to Gumroad's library on their own).
 *
 * Reads from /payments/me which is the single source of truth shared
 * with the /profile billing card and the dashboard plan badge.
 */

interface BillingState {
  plan: string;
  plan_label: string;
  is_paid: boolean;
  is_recurring: boolean;
  expires_at: string | null;
  days_left: number | null;
  is_expiring_soon: boolean;
  manage_url: string | null;
  upgrade_url: string | null;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "50% content of 1 exam",
    "Basic practice questions",
    "Progress tracking",
  ],
  single: [
    "Full content for 1 exam",
    "Unlimited practice questions for that exam",
    "3 timed mock exams + domain scoring",
    "AI Coach for the chosen exam",
    "6 months of access",
  ],
  pro_monthly: [
    "All 76+ certifications",
    "Unlimited practice questions + mock exams",
    "AI Coach with conversation memory per exam",
    "Bayesian Knowledge Tracing + spaced repetition",
    "Hands-on labs + learning paths",
  ],
  pro_annual: [
    "Everything in Pro Monthly",
    "Save $89.89 vs monthly",
    "Locked-in annual price",
  ],
};

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBilling();
      setBilling(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        {error ?? "Couldn't load billing details."}
        <button
          onClick={refresh}
          className="mt-3 block mx-auto rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-bold"
        >
          Try again
        </button>
      </div>
    );
  }

  const features = PLAN_FEATURES[billing.plan] ?? PLAN_FEATURES.free;
  const expiresFormatted = billing.expires_at
    ? new Date(billing.expires_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Plan & Billing</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your subscription, renewal, and payment history.
        </p>
      </div>

      {/* Current plan card */}
      <div
        className={`rounded-2xl border-2 p-6 sm:p-8 ${
          billing.is_paid
            ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-violet-50/30"
            : "border-stone-200 bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Current plan
            </div>
            <div className="flex items-center gap-3">
              {billing.is_paid && (
                <Crown className="h-7 w-7 text-amber-500 shrink-0" />
              )}
              <h2 className="text-3xl font-bold text-stone-900">
                {billing.plan_label}
              </h2>
            </div>
            {expiresFormatted && (
              <div className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                <Calendar className="h-4 w-4 text-stone-400" />
                {billing.is_recurring ? "Renews" : "Expires"} on{" "}
                <strong className="text-stone-900">{expiresFormatted}</strong>
                {billing.days_left !== null && (
                  <span className="text-stone-400">
                    · {billing.days_left} days left
                  </span>
                )}
              </div>
            )}
          </div>

          {billing.upgrade_url && (
            <Link
              href={billing.upgrade_url}
              className="self-start inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition-all"
            >
              {billing.plan === "free" ? "Upgrade" : "See higher plans"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Expiring-soon callout — fires when ≤7 days remain. Gives the
            user time to renew before access is cut off, and creates a
            soft renewal-conversion moment for recurring plans. */}
        {billing.is_expiring_soon && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-100/60 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-800">
                {billing.is_recurring
                  ? "Renewal coming up"
                  : "Access expiring soon"}
              </p>
              <p className="text-amber-700">
                Your plan {billing.is_recurring ? "renews" : "expires"} in{" "}
                {billing.days_left} day{billing.days_left === 1 ? "" : "s"}.{" "}
                {billing.is_recurring
                  ? "Your card on file will be charged automatically."
                  : "Renew now to keep your access uninterrupted."}
              </p>
            </div>
          </div>
        )}

        {/* What's included */}
        <div className="mt-6 pt-6 border-t border-stone-200">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            What&apos;s included
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-sm text-stone-700"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Manage subscription card — only shown for paid plans. */}
      {billing.is_paid && billing.manage_url && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-1">
            Manage your subscription
          </h3>
          <p className="text-sm text-stone-600 mb-4">
            Update your payment method, view invoices, or cancel from your
            Gumroad account. Cancellations take effect at the end of your
            current billing period — you keep access until then.
          </p>
          <a
            href={billing.manage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
          >
            Open Gumroad
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Refund policy reassurance — same card on /pricing, lifted
          here so a paying user can find it without scrolling pricing. */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
        <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-stone-900">
            Pass-or-refund guarantee
          </p>
          <p className="text-sm text-stone-600 leading-relaxed">
            If you complete a study plan and don&apos;t pass your certification
            exam, we refund 100% of your payment. Email{" "}
            <a
              href="mailto:support@sparkupcloud.com"
              className="text-amber-700 hover:underline"
            >
              support@sparkupcloud.com
            </a>{" "}
            with your exam result to start the refund.
          </p>
        </div>
      </div>

      {/* Refresh control — Gumroad webhooks usually land within seconds
          of payment, but if a user just paid and the dashboard hasn't
          caught up yet, this lets them poll. */}
      <div className="flex justify-center">
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh billing data
        </button>
      </div>
    </div>
  );
}
