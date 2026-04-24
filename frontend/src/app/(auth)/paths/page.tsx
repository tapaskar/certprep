"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

interface PathSummary {
  id: string;
  title: string;
  exam_code: string | null;
  exam_id: string | null;
  provider: string;
  difficulty: string;
  estimated_hours: number;
  description: string;
  color: string;
  module_count: number;
  step_count: number;
}

const difficultyColor: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  intermediate: "bg-amber-100 text-amber-700 border-amber-200",
  advanced: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function PathsListPage() {
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listLearningPaths()
      .then((data) => setPaths(data as PathSummary[]))
      .catch(() => setPaths([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-100 px-3 py-1 rounded-full">
          <Sparkles className="h-3 w-3" /> New
        </div>
        <h1 className="mt-2 text-2xl font-bold text-stone-900 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-violet-600" />
          Learning Paths
        </h1>
        <p className="mt-1 text-sm text-stone-500 max-w-3xl">
          Step-by-step guided curricula with hands-on labs and quizzes after
          every module. Coach (your AI tutor) sits next to you the whole way —
          ask anything, get instant explanations, and only mark a step
          complete when you really understand it.
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : paths.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center text-stone-500">
          No learning paths available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paths.map((p) => (
            <Link
              key={p.id}
              href={`/paths/${p.id}`}
              className="group rounded-xl border-2 border-stone-200 bg-white p-5 hover:border-violet-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: p.color }}
                >
                  {p.exam_code || p.provider}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    difficultyColor[p.difficulty] ||
                    "bg-stone-100 text-stone-700 border-stone-200"
                  }`}
                >
                  {p.difficulty}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-violet-700 transition-colors">
                {p.title}
              </h3>
              <p className="mt-1 text-sm text-stone-600 line-clamp-3">
                {p.description}
              </p>
              <div className="mt-4 flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {p.module_count} modules
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {p.step_count} steps
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />~{p.estimated_hours}h
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-violet-600 font-semibold group-hover:gap-2 transition-all">
                  Start <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
