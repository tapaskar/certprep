"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, ArrowRight, Calendar } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import type { ProgressResponse } from "@/lib/api-types";
import {
  getMasteryLevel,
  getMasteryTierName,
  masteryColors,
} from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  plan: string;
  is_email_verified: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [billing, setBilling] = useState<{
    plan: string;
    plan_label: string;
    is_paid: boolean;
    is_recurring: boolean;
    expires_at: string | null;
    days_left: number | null;
    is_expiring_soon: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const me = await api.getMe();
        setProfile(me);

        // Billing summary — non-fatal if it fails
        try {
          const b = await api.getBilling();
          setBilling(b);
        } catch {
          /* leave null; billing card just won't render */
        }

        // Try to load progress (may fail if no enrollment)
        try {
          // Attempt to get exams first to find the enrolled exam
          const exams = await api.getExams();
          if (exams.length > 0) {
            const prog = await api.getProgress(exams[0].id);
            setProgress(prog);
          }
        } catch {
          // No progress data available
        }
      } catch {
        // Failed to load profile
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Profile</h1>

      {/* User Info */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600">
            {(profile?.display_name || user?.display_name || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {profile?.display_name || user?.display_name}
            </h2>
            <p className="text-sm text-stone-500">
              {profile?.email || user?.email}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Member since {memberSince}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {/* Plan badge sources from /payments/me when available so the
              label matches what /billing shows. Falls back to the user
              row's plan field if billing didn't load. */}
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            {billing?.plan_label ??
              (profile?.plan === "pro_annual"
                ? "Pro Annual"
                : profile?.plan === "pro_monthly"
                  ? "Pro Monthly"
                  : profile?.plan === "single"
                    ? "Single Exam"
                    : "Free")}
          </span>
          {profile?.is_email_verified && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Email Verified
            </span>
          )}
        </div>
      </div>

      {/* Plan & Billing card — replaces the previous absence of any
          subscription surface on /profile. Links out to the dedicated
          /billing page for full management (cancel / update payment
          method). Renders even on the Free plan as an upgrade prompt. */}
      {billing && (
        <Link
          href="/billing"
          className="block rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60 transition-all hover:border-amber-300 hover:shadow-lg group"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  billing.is_paid
                    ? "bg-gradient-to-br from-amber-100 to-amber-200"
                    : "bg-stone-100"
                }`}
              >
                <Crown
                  className={`h-6 w-6 ${
                    billing.is_paid ? "text-amber-600" : "text-stone-400"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-stone-900">
                  {billing.plan_label}
                </h3>
                {billing.expires_at && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {billing.is_recurring ? "Renews" : "Expires"} in{" "}
                    {billing.days_left} day
                    {billing.days_left === 1 ? "" : "s"}
                  </div>
                )}
                {!billing.expires_at && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    {billing.is_paid
                      ? "Lifetime access"
                      : "No expiration · upgrade anytime"}
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          {billing.is_expiring_soon && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
              ⚠ {billing.is_recurring ? "Renews" : "Expires"} in{" "}
              {billing.days_left} day{billing.days_left === 1 ? "" : "s"} —{" "}
              {billing.is_recurring
                ? "card on file will be charged"
                : "renew to keep access"}
            </div>
          )}
        </Link>
      )}

      {/* Study Progress */}
      {progress && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <h2 className="mb-4 text-lg font-bold text-stone-900">
            Study Progress
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Overall Readiness */}
            <div className="flex flex-col items-center rounded-lg border border-stone-200 p-4">
              <div className="relative mb-2 h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e7e5e4"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray={`${progress.readiness.overall_pct}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-stone-900">
                  {Math.round(progress.readiness.overall_pct)}%
                </div>
              </div>
              <p className="text-sm font-medium text-stone-600">
                Overall Readiness
              </p>
            </div>

            {/* Total Study Time */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200 p-4">
              <p className="text-2xl font-bold text-stone-900">
                {Math.round(progress.study_stats.total_study_minutes / 60)}h{" "}
                {progress.study_stats.total_study_minutes % 60}m
              </p>
              <p className="text-sm text-stone-500">Total Study Time</p>
            </div>

            {/* Questions Answered */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200 p-4">
              <p className="text-2xl font-bold text-stone-900">
                {progress.study_stats.total_questions_answered}
              </p>
              <p className="text-sm text-stone-500">Questions Answered</p>
            </div>

            {/* Accuracy */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200 p-4">
              <p className="text-2xl font-bold text-stone-900">
                {Math.round(progress.study_stats.overall_accuracy_pct)}%
              </p>
              <p className="text-sm text-stone-500">Accuracy</p>
            </div>
          </div>

          {/* Streak */}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3">
            <span className="text-2xl">&#128293;</span>
            <span className="font-medium text-stone-700">
              {progress.streak.current_days} day streak
            </span>
            <span className="text-sm text-stone-400">
              (longest: {progress.streak.longest_days} days)
            </span>
          </div>
        </div>
      )}

      {/* Exam Info */}
      {progress && progress.readiness.days_until_exam !== null && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <h2 className="mb-4 text-lg font-bold text-stone-900">
            Exam Enrollment
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Days until exam</p>
              <p className="text-3xl font-bold text-stone-900">
                {progress.readiness.days_until_exam}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-500">Concepts mastered</p>
              <p className="text-lg font-bold text-stone-900">
                {progress.readiness.concepts_mastered} /{" "}
                {progress.readiness.concepts_total}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weakest Concepts */}
      {progress && progress.weakest_concepts.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
          <h2 className="mb-4 text-lg font-bold text-stone-900">
            Mastery Breakdown
          </h2>
          <div className="space-y-3">
            {progress.weakest_concepts.map((concept) => {
              const level = getMasteryLevel(concept.mastery_pct);
              const colors = masteryColors[level];
              const tierName = getMasteryTierName(level);
              return (
                <div
                  key={concept.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">
                      {concept.name}
                    </p>
                    <div className="mt-1 h-2 w-full rounded-full bg-stone-100">
                      <div
                        className={`h-2 rounded-full ${colors.bar}`}
                        style={{ width: `${concept.mastery_pct}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                  >
                    {tierName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
        <h2 className="mb-4 text-lg font-bold text-stone-900">
          Account Settings
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Change Password
          </button>

          {showChangePassword && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm text-stone-500">
                To change your password, use the{" "}
                <a
                  href="/forgot-password"
                  className="text-amber-600 hover:text-amber-700"
                >
                  forgot password
                </a>{" "}
                flow.
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
