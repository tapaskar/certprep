"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Attempt {
  session_id: string;
  exam_id: string;
  exam_code: string | null;
  exam_name: string;
  mock_number: number;
  started_at: string | null;
  ended_at: string | null;
  completed: boolean;
  score_pct: number | null;
  passed: boolean | null;
  passing_score_pct: number | null;
  questions_answered: number;
  total_questions: number;
}

export function RecentMockExams() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getRecentMockExams(6)
      .then((r) => {
        if (!cancelled) setAttempts(r.attempts);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Trophy className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Recent Mock Exams</h3>
        </div>
        <Link
          href="/mock-exam"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
        >
          Take a mock <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center py-6 px-4">
          <p className="text-sm text-stone-500 mb-3">
            No mock exams yet. Take your first timed full-length exam to see
            your domain-by-domain breakdown.
          </p>
          <Link
            href="/mock-exam"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold"
          >
            Browse mock exams
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {attempts.map((a) => (
            <Row key={a.session_id} attempt={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ attempt: a }: { attempt: Attempt }) {
  const date = a.started_at
    ? new Date(a.started_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "—";

  // Display state buckets
  const status = !a.completed
    ? "in-progress"
    : a.passed === true
    ? "passed"
    : "failed";

  const linkHref = a.completed
    ? `/mock-exam?examId=${a.exam_id}`
    : `/mock-exam?examId=${a.exam_id}`;

  return (
    <li className="py-3">
      <Link
        href={linkHref}
        className="flex items-center gap-3 hover:bg-stone-50 -mx-2 px-2 py-1 rounded-md transition-colors"
      >
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-700">
          {a.exam_code ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-stone-900 truncate">
            Mock {a.mock_number} · {a.exam_name}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {date}
            </span>
            <span>·</span>
            <span>
              {a.questions_answered}/{a.total_questions} answered
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {status === "in-progress" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
              In progress
            </span>
          ) : (
            <>
              <div
                className={cn(
                  "text-base font-bold tabular-nums",
                  status === "passed" ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {a.score_pct != null ? `${Math.round(a.score_pct)}%` : "—"}
              </div>
              <div className="flex items-center justify-end gap-1 text-[10px] font-semibold mt-0.5">
                {status === "passed" ? (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                    <span className="text-emerald-700">PASSED</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-2.5 w-2.5 text-rose-500" />
                    <span className="text-rose-700">
                      FAILED · need {a.passing_score_pct ?? "—"}%
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
