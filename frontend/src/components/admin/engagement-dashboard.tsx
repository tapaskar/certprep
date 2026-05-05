"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  MailCheck,
  BookOpen,
  CheckCircle,
  TrendingUp,
  ClipboardList,
  MessageCircle,
  Crown,
  Loader2,
  RefreshCw,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";

/**
 * Engagement Dashboard — answers "is anyone actually using the product?"
 *
 * Six panels, all backed by the single GET /admin/engagement endpoint
 * for one round-trip. Refreshes on user click; no auto-poll because
 * the data doesn't change fast enough to warrant it.
 */

const ICON_MAP: Record<string, LucideIcon> = {
  "user-plus": UserPlus,
  "mail-check": MailCheck,
  book: BookOpen,
  "check-circle": CheckCircle,
  "trending-up": TrendingUp,
  "clipboard-list": ClipboardList,
  "message-circle": MessageCircle,
  crown: Crown,
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-stone-200 text-stone-700",
  single: "bg-violet-200 text-violet-800",
  pro_monthly: "bg-amber-200 text-amber-800",
  pro_annual: "bg-emerald-200 text-emerald-800",
};

interface Engagement {
  generated_at: string;
  funnel: { label: string; count: number; icon: string }[];
  plan_distribution: { plan: string; count: number }[];
  daily_activity: {
    day: string;
    signups: number;
    answers: number;
    sessions: number;
    mocks: number;
    coach: number;
  }[];
  top_users: {
    email: string;
    display_name: string | null;
    plan: string;
    signup_day: string | null;
    answers_14d: number;
    sessions_14d: number;
    mocks_14d: number;
    coach_msgs_14d: number;
  }[];
  llm_usage_7d: {
    endpoint: string;
    calls: number;
    total_tokens: number;
    cached_tokens: number;
    cost_usd: number;
    avg_latency_ms: number;
    errors: number;
  }[];
  llm_total_cost_7d: number;
  feature_usage: { label: string; count: number }[];
}

export function EngagementDashboard() {
  const [data, setData] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getAdminEngagement();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load engagement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
        {error}
      </div>
    );
  }

  const totalSignups = data.funnel[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Engagement</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real user activity across all features. Updated{" "}
            {new Date(data.generated_at).toLocaleTimeString()}.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-amber-400 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Activation funnel — the headline view */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-bold text-stone-900 mb-1">
          Activation funnel
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          What fraction of your users actually reach each step.
        </p>
        <div className="space-y-2">
          {data.funnel.map((step, i) => {
            const Icon = ICON_MAP[step.icon] ?? CheckCircle;
            const pctOfTotal = totalSignups
              ? (step.count / totalSignups) * 100
              : 0;
            const drop =
              i > 0 && data.funnel[i - 1].count > 0
                ? 100 - (step.count / data.funnel[i - 1].count) * 100
                : 0;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-stone-700">
                      {step.label}
                    </span>
                    <span className="text-xs text-stone-500 font-mono tabular-nums">
                      <strong className="text-stone-900">{step.count}</strong>
                      <span className="text-stone-400"> · {pctOfTotal.toFixed(1)}%</span>
                      {i > 0 && drop > 0 && (
                        <span
                          className={`ml-2 ${
                            drop > 50
                              ? "text-rose-600"
                              : drop > 20
                                ? "text-amber-600"
                                : "text-stone-400"
                          }`}
                        >
                          ↓{drop.toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                      style={{ width: `${pctOfTotal}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column: plan dist + LLM cost */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="text-sm font-bold text-stone-900 mb-3">
            Plan distribution
          </h3>
          <div className="space-y-2">
            {data.plan_distribution.map((p) => {
              const pct = totalSignups ? (p.count / totalSignups) * 100 : 0;
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PLAN_COLORS[p.plan] ?? "bg-stone-100 text-stone-600"}`}
                  >
                    {p.plan.replace("_", " ")}
                  </span>
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono tabular-nums text-stone-700 w-16 text-right">
                    {p.count} <span className="text-stone-400">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            LLM API spend (last 7 days)
          </h3>
          <p className="text-xs text-stone-500 mb-3">
            Total: <strong className="text-stone-900">${data.llm_total_cost_7d.toFixed(4)}</strong>
          </p>
          {data.llm_usage_7d.length === 0 ? (
            <p className="text-xs text-stone-400 italic">
              No LLM activity in the last 7 days.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-stone-500 tracking-wider border-b border-stone-200">
                  <th className="pb-2">Endpoint</th>
                  <th className="pb-2 text-right">Calls</th>
                  <th className="pb-2 text-right">Tokens</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2 text-right">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.llm_usage_7d.map((row) => (
                  <tr key={row.endpoint}>
                    <td className="py-1.5 text-stone-700 font-mono text-[11px]">
                      {row.endpoint}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{row.calls}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {(row.total_tokens / 1000).toFixed(1)}k
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      ${row.cost_usd.toFixed(4)}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${row.errors > 0 ? "text-rose-600 font-bold" : "text-stone-400"}`}
                    >
                      {row.errors > 0 ? `⚠ ${row.errors}` : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* 14-day activity chart (CSS bars, no chart lib) */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-bold text-stone-900 mb-3">
          Daily activity (last 14 days)
        </h3>
        <div className="grid grid-cols-14 gap-1 sm:gap-2 items-end h-40">
          {(() => {
            const max = Math.max(
              ...data.daily_activity.map(
                (d) => d.signups + d.answers + d.sessions + d.mocks + d.coach,
              ),
              1,
            );
            return data.daily_activity.map((d) => {
              const total =
                d.signups + d.answers + d.sessions + d.mocks + d.coach;
              const heightPct = (total / max) * 100;
              return (
                <div
                  key={d.day}
                  className="flex flex-col items-center justify-end h-full"
                  title={`${d.day}\nSignups: ${d.signups}\nAnswers: ${d.answers}\nSessions: ${d.sessions}\nMocks: ${d.mocks}\nCoach: ${d.coach}`}
                >
                  {total > 0 ? (
                    <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${heightPct}%` }}>
                      {d.signups > 0 && <div className="bg-amber-500" style={{ flex: d.signups }} />}
                      {d.answers > 0 && <div className="bg-emerald-500" style={{ flex: d.answers }} />}
                      {d.sessions > 0 && <div className="bg-blue-500" style={{ flex: d.sessions }} />}
                      {d.mocks > 0 && <div className="bg-violet-500" style={{ flex: d.mocks }} />}
                      {d.coach > 0 && <div className="bg-rose-500" style={{ flex: d.coach }} />}
                    </div>
                  ) : (
                    <div className="w-full h-1 bg-stone-100 rounded-full" />
                  )}
                  <div className="text-[9px] text-stone-400 mt-1 -rotate-45 origin-top-left whitespace-nowrap">
                    {d.day.slice(5)}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-stone-600">
          <Legend color="bg-amber-500" label="Signups" />
          <Legend color="bg-emerald-500" label="Answers" />
          <Legend color="bg-blue-500" label="Sessions" />
          <Legend color="bg-violet-500" label="Mocks" />
          <Legend color="bg-rose-500" label="Coach" />
        </div>
      </section>

      {/* Top users */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-bold text-stone-900 mb-1">
          Top engaged users (last 14 days)
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          Sorted by total answers. Includes only users with any 14-day activity.
        </p>
        {data.top_users.length === 0 ||
        data.top_users.every((u) => u.answers_14d + u.sessions_14d + u.mocks_14d + u.coach_msgs_14d === 0) ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>Zero engagement in the last 14 days.</strong> No user has
              answered a question, started a session, or messaged the Coach.
              Activation flow needs work — see the funnel above.
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-stone-500 tracking-wider border-b border-stone-200">
                <th className="pb-2">User</th>
                <th className="pb-2">Plan</th>
                <th className="pb-2 text-right">Answers</th>
                <th className="pb-2 text-right">Sessions</th>
                <th className="pb-2 text-right">Mocks</th>
                <th className="pb-2 text-right">Coach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.top_users
                .filter(
                  (u) =>
                    u.answers_14d +
                      u.sessions_14d +
                      u.mocks_14d +
                      u.coach_msgs_14d >
                    0,
                )
                .map((u) => (
                  <tr key={u.email}>
                    <td className="py-1.5 text-stone-700 truncate max-w-[200px]">
                      <span className="font-medium">{u.display_name || u.email.split("@")[0]}</span>
                      <div className="text-[10px] text-stone-400 truncate">{u.email}</div>
                    </td>
                    <td className="py-1.5">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${PLAN_COLORS[u.plan] ?? "bg-stone-100 text-stone-600"}`}
                      >
                        {u.plan.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{u.answers_14d}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.sessions_14d}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.mocks_14d}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.coach_msgs_14d}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Feature usage table */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-bold text-stone-900 mb-3">
          Feature usage breakdown
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 text-xs">
          {data.feature_usage.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between py-1.5 px-3 rounded bg-stone-50/60"
            >
              <span className="text-stone-700">{f.label}</span>
              <strong
                className={`tabular-nums ${f.count === 0 ? "text-stone-300" : "text-stone-900"}`}
              >
                {f.count.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
