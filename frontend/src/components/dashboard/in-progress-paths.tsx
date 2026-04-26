"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface InProgressPath {
  path_id: string;
  title: string;
  exam_code: string | null;
  provider: string;
  color: string;
  total_steps: number;
  completed_steps: number;
  completion_pct: number;
  completed: boolean;
}

/**
 * Dashboard surface for learning paths the user has started.
 *
 * Without this, a user who began a path (e.g. `redhat-ex188-v4k`) had no
 * way to find their way back — paths progress is stored separately from
 * exam enrollments and the /paths list page didn't differentiate started
 * from un-started.
 *
 * Renders nothing if the user has no in-progress paths (so it stays
 * invisible for users who only do MCQ exams).
 */
export function InProgressPaths() {
  const [paths, setPaths] = useState<InProgressPath[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .myInProgressPaths()
      .then((data) => {
        if (!cancelled) setPaths(data as InProgressPath[]);
      })
      .catch(() => {
        if (!cancelled) setPaths([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!paths || paths.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-amber-50/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-violet-600" />
          <h2 className="text-sm font-bold text-stone-900">
            Your Learning Paths
          </h2>
        </div>
        <Link
          href="/paths"
          className="text-xs font-semibold text-violet-700 hover:text-violet-800"
        >
          See all →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {paths.map((p) => (
          <Link
            key={p.path_id}
            href={`/paths/${p.path_id}`}
            className="group rounded-lg border border-stone-200 bg-white p-4 transition-all hover:border-violet-400 hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ background: p.color }}
              >
                {p.exam_code || p.provider}
              </span>
              {p.completed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  Resume
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-stone-900 group-hover:text-violet-700 transition-colors line-clamp-2">
              {p.title}
            </h3>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                <span>
                  {p.completed_steps} of {p.total_steps} steps
                </span>
                <span className="font-semibold text-stone-700">
                  {p.completion_pct}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-amber-500 transition-all"
                  style={{ width: `${p.completion_pct}%` }}
                />
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 group-hover:gap-2 transition-all">
              {p.completed ? "Review" : "Continue"}
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
