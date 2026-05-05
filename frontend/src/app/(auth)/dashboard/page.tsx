"use client";

import { useEffect, useState } from "react";
import { useProgressStore } from "@/stores/progress-store";
import { useAuthStore } from "@/stores/auth-store";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { StreakCard } from "@/components/dashboard/streak-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WeakConcepts } from "@/components/dashboard/weak-concepts";
import { BadgesCard } from "@/components/dashboard/badges-card";
import { LeagueCard } from "@/components/dashboard/league-card";
import { ChallengeCard } from "@/components/dashboard/challenge-card";
import { RecentMockExams } from "@/components/dashboard/recent-mock-exams";
import { InProgressPaths } from "@/components/dashboard/in-progress-paths";
import { FirstQuestionHook } from "@/components/dashboard/first-question-hook";
import { BookOpen, Plus, Crown, Zap, Mail, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { trackPurchaseConversion } from "@/lib/analytics";

export default function DashboardPage() {
  const { progress, isLoading, error, fetchProgress } = useProgressStore();
  const user = useAuthStore((s) => s.user);
  const setActiveExam = useAuthStore((s) => s.setActiveExam);
  const examId = user?.active_exam_id;
  const enrolledExams = user?.enrolled_exams ?? [];

  useEffect(() => {
    if (examId) fetchProgress(examId);
  }, [examId, fetchProgress]);

  // If a Learning Path covers the user's active exam, suggest it from the
  // WeakConcepts card so a struggling user can switch from MCQ drilling
  // to a guided lesson on the same material. Empty when no path matches.
  const [pathSuggestion, setPathSuggestion] = useState<{
    id: string;
    title: string;
  } | null>(null);
  useEffect(() => {
    if (!examId) {
      setPathSuggestion(null);
      return;
    }
    let cancelled = false;
    api
      .listLearningPaths({ exam_id: examId })
      .then((paths) => {
        if (cancelled) return;
        const first = paths?.[0];
        if (first?.id && first?.title) {
          setPathSuggestion({ id: first.id, title: first.title });
        } else {
          setPathSuggestion(null);
        }
      })
      .catch(() => {
        if (!cancelled) setPathSuggestion(null);
      });
    return () => {
      cancelled = true;
    };
  }, [examId]);

  if (!examId && enrolledExams.length === 0) {
    // Empty state for brand-new users (and anyone without an exam
    // enrolled). Was previously a wall: "Welcome! Pick an exam." that
    // required 5+ clicks before any value landed. Engagement audit
    // showed real-user activation at ~0% — most signups bounced here.
    //
    // New empty state drops a real practice question on the dashboard
    // so the user can see what the product actually does within 3
    // seconds, then routes to /onboarding with context once they've
    // seen the gameplay.
    //
    // InProgressPaths still renders above for users who have a path
    // started but no MCQ exam enrolled (covers the EX188 case).
    return (
      <div className="space-y-8">
        <InProgressPaths />
        <FirstQuestionHook />
      </div>
    );
  }

  const activeExam = enrolledExams.find((e) => e.exam_id === examId);
  const userPlan = user?.plan ?? "free";
  const isFreePlan = userPlan === "free";
  const loadUser = useAuthStore((s) => s.loadUser);

  // Persistent (but dismissible per session) nudge to verify the
  // email address. We unblocked checkout-before-verify (hard gate
  // moved to a soft prompt) so this banner is the way we actually
  // get users to complete verification. Doesn't block any feature —
  // just a friendly recurring reminder.
  const isUnverified = user && user.is_email_verified === false;
  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const [resentVerifyMessage, setResentVerifyMessage] = useState<string | null>(
    null,
  );
  useEffect(() => {
    // Dismiss state per browser session — user gets the nudge again
    // tomorrow or after navigating away/back.
    if (typeof window !== "undefined") {
      setVerifyDismissed(
        sessionStorage.getItem("sparkupcloud_verify_dismissed") === "1",
      );
    }
  }, []);
  const dismissVerify = () => {
    setVerifyDismissed(true);
    sessionStorage.setItem("sparkupcloud_verify_dismissed", "1");
  };
  const resendVerifyCode = async () => {
    if (!user?.email || resendingVerify) return;
    setResendingVerify(true);
    setResentVerifyMessage(null);
    try {
      const res = await api.resendVerificationCode();
      setResentVerifyMessage(res.message);
    } catch (err) {
      // Surface the real backend message — covers the 60s cooldown
      // ("Please wait a minute…"), already-verified case, etc. The
      // previous swallow-all-errors behavior misled users into
      // thinking a code was sent when it wasn't.
      const msg =
        err instanceof Error
          ? // The api client throws "API <status>: <body>" — strip the prefix
            err.message.replace(/^API \d+:\s*/, "").replace(/^"|"$/g, "")
          : "Couldn't send code. Try again in a moment.";
      setResentVerifyMessage(msg);
    } finally {
      setResendingVerify(false);
    }
  };

  // Two URL signals from the upgrade flow:
  //   ?upgrade=<plan>   set by older pricing-banner clicks; user
  //                     hasn't paid yet, this is a "resume" hint.
  //   ?upgraded=<plan>  set by Gumroad's post-purchase redirect; user
  //                     has just paid, show success + refresh user.
  const [upgradeParam, setUpgradeParam] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    const upgraded = params.get("upgraded");
    if (upgrade) setUpgradeParam(upgrade);
    if (upgraded) {
      setJustUpgraded(upgraded);
      // Refresh the user's plan from the backend — the Gumroad webhook
      // typically lands within ~1-3s of the redirect. Wait briefly so
      // the webhook has time to update the user row, then reload. Without
      // this, the dashboard renders the user's stale Free plan even
      // though they just paid for Pro.
      setTimeout(() => loadUser(), 2000);
      // Fire Google Ads "Purchase" conversion event with Enhanced
      // Conversions (hashed email passed via gtag user_data). Idempotent
      // per session — refreshes don't double-count. transaction_id is
      // stable across refreshes for additional dedupe on Google's side.
      trackPurchaseConversion(upgraded, user?.id, user?.email);
      // Strip ?upgraded= from the URL so a refresh doesn't re-trigger
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadUser]);

  return (
    <div className="space-y-6">
      {/* Post-purchase success banner — shown when Gumroad redirects
          back here with ?upgraded=<plan>. This was missing entirely:
          a user paid via Gumroad, returned, and got zero acknowledgment
          that anything happened. Now they get an unmissable celebration
          banner and the dashboard auto-refreshes their plan. */}
      {justUpgraded && (
        <div className="flex items-center justify-between rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-amber-50/40 to-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Crown className="h-7 w-7 text-amber-500" />
            <div>
              <p className="font-bold text-stone-900">
                You&apos;re on {justUpgraded.replace("_", " ").replace(/\bpro\b/i, "Pro")} now —
                welcome aboard
              </p>
              <p className="text-sm text-stone-600">
                Plan unlocked. If your dashboard still looks the same in a
                few seconds, try a hard refresh.
              </p>
            </div>
          </div>
          <button
            onClick={() => setJustUpgraded(null)}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Got it
          </button>
        </div>
      )}

      {/* Upgrade prompt from pricing page (PRE-purchase resume hint) */}
      {upgradeParam && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-bold text-stone-900">
                Upgrade to {upgradeParam.replace("_", " ").replace("pro", "Pro")}
              </p>
              <p className="text-sm text-stone-500">
                Complete your purchase to unlock full access.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                // Same-tab navigation — popup blockers were killing this
                // exact path before because the click came after an
                // async fetch (browsers consider that a programmatic
                // open, not a user gesture).
                try {
                  const { checkout_url } = await api.createCheckout(upgradeParam);
                  window.location.href = checkout_url;
                } catch {
                  window.location.href = "/pricing";
                }
              }}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white hover:scale-[1.02] transition-all"
            >
              Buy Now
            </button>
            <button
              onClick={() => setUpgradeParam(null)}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Verify-email nudge — replaces the previous hard gate at
          /verify-email that blocked paid checkout. Soft, dismissible,
          re-appears next session. */}
      {isUnverified && !verifyDismissed && !justUpgraded && (
        <div className="flex items-start sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              {resentVerifyMessage ? (
                <p className="text-sm text-stone-700">
                  <strong>{resentVerifyMessage}</strong> Check your inbox (and
                  spam folder) — paste the 6-digit code on the verify page.
                </p>
              ) : (
                <p className="text-sm text-stone-700">
                  <strong>Verify your email</strong> — required to upgrade
                  your plan or reset your password. Takes 30 seconds.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/verify-email"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold whitespace-nowrap"
            >
              Verify now
            </Link>
            <button
              onClick={resendVerifyCode}
              disabled={resendingVerify}
              className="rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 text-xs font-bold whitespace-nowrap disabled:opacity-50"
            >
              {resendingVerify ? "Sending…" : "Resend code"}
            </button>
            <button
              onClick={dismissVerify}
              aria-label="Dismiss"
              className="rounded-md p-1 text-blue-400 hover:text-blue-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Free plan upgrade banner */}
      {isFreePlan && !upgradeParam && !justUpgraded && (
        <Link
          href="/pricing"
          className="flex items-center justify-between rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-stone-900">Unlock full access</p>
              <p className="text-xs text-stone-500">Upgrade to Pro for unlimited questions, mock exams, and AI study plans</p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white">
            View Plans
          </span>
        </Link>
      )}

      {/* Paid-plan badge — small unobtrusive indicator showing the
          user what they're paying for + when it ends. Replaces the
          previous absence of any plan-status surface on the dashboard
          (users could pay $150/yr and the dashboard never acknowledged
          it). Links to /billing for full management. */}
      {!isFreePlan && !justUpgraded && (
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition-colors"
        >
          <Crown className="h-3 w-3" />
          {userPlan === "pro_annual"
            ? "Pro Annual"
            : userPlan === "pro_monthly"
              ? "Pro Monthly"
              : userPlan === "single"
                ? "Single Exam"
                : "Premium"}
          {user?.enrolled_exams && user.enrolled_exams.length > 0 && (
            <span className="text-amber-600">· Manage →</span>
          )}
        </Link>
      )}

      {/* Exam selector */}
      <div className="flex flex-wrap items-center gap-3">
        {enrolledExams.map((exam) => (
          <button
            key={exam.exam_id}
            onClick={() => {
              setActiveExam(exam.exam_id);
              fetchProgress(exam.exam_id);
            }}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
              exam.exam_id === examId
                ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50/50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>{exam.exam_code}</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
              {Math.round(exam.readiness_pct)}%
            </span>
          </button>
        ))}
        <Link
          href={
            (isFreePlan || userPlan === "single") && enrolledExams.length >= 1
              ? "/pricing"
              : "/onboarding"
          }
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:border-amber-400 hover:text-amber-600"
        >
          <Plus className="h-4 w-4" />
          {(isFreePlan || userPlan === "single") && enrolledExams.length >= 1
            ? "Upgrade to Add Exam"
            : "Add Exam"}
        </Link>
      </div>

      {/* Active exam name */}
      {activeExam && (
        <p className="text-sm text-stone-500">
          Studying: <span className="font-semibold text-stone-700">{activeExam.exam_name}</span>
        </p>
      )}

      {/* Learning paths in progress (e.g. Red Hat EX188 guided path) */}
      <InProgressPaths />

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
        </div>
      )}

      {error && (
        <div className="flex h-48 flex-col items-center justify-center gap-3">
          <p className="text-stone-500">Could not load progress.</p>
          <button
            onClick={() => examId && fetchProgress(examId)}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && progress && (
        <>
          {/* Top row */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ReadinessCard
                overallPct={progress.readiness.overall_pct}
                passProbability={progress.readiness.pass_probability_pct}
                daysUntilExam={progress.readiness.days_until_exam}
                conceptsMastered={progress.readiness.concepts_mastered}
                conceptsTotal={progress.readiness.concepts_total}
              />
            </div>
            <StreakCard
              currentDays={progress.streak.current_days}
              longestDays={progress.streak.longest_days}
              freezesRemaining={progress.streak.freezes_remaining}
            />
          </div>

          {/* Badges */}
          <BadgesCard />

          {/* League & Challenge */}
          <div className="grid gap-6 lg:grid-cols-2">
            <LeagueCard />
            <ChallengeCard />
          </div>

          {/* Quick actions */}
          <QuickActions reviewCount={progress.upcoming_reviews.overdue} />

          {/* Recent mock exam attempts + weak concepts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentMockExams />
            {progress.weakest_concepts.length > 0 ? (
              <WeakConcepts
                concepts={progress.weakest_concepts}
                pathSuggestion={pathSuggestion ?? undefined}
              />
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 flex items-center justify-center text-sm text-stone-500">
                Answer a few questions to surface your weak concepts.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
