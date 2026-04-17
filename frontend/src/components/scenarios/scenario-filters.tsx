"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { scenarios, type Scenario } from "@/lib/scenarios-data";
import { ArrowRight, Clock, Target } from "lucide-react";

const difficultyColors: Record<Scenario["difficulty"], string> = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-rose-100 text-rose-700 border-rose-200",
};

export function ScenarioFilters() {
  const [cert, setCert] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  const allCerts = useMemo(() => {
    const set = new Set<string>();
    scenarios.forEach((s) => s.certs.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    return scenarios.filter((s) => {
      if (cert !== "all" && !s.certs.includes(cert)) return false;
      if (difficulty !== "all" && s.difficulty !== difficulty) return false;
      return true;
    });
  }, [cert, difficulty]);

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500">Cert:</span>
          <select
            value={cert}
            onChange={(e) => setCert(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium"
          >
            <option value="all">All ({scenarios.length})</option>
            {allCerts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500">Level:</span>
          <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
            {(["all", "easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  difficulty === d
                    ? "bg-amber-500 text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-stone-500 mb-4">
        Showing {filtered.length} of {scenarios.length} scenarios
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={`/scenarios/${s.id}`}
            className="group rounded-xl border border-stone-200 bg-white p-5 hover:border-amber-400 hover:shadow-md transition-all"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${difficultyColors[s.difficulty]}`}
              >
                {s.difficulty}
              </span>
              {s.certs.map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600"
                >
                  {c}
                </span>
              ))}
              {s.domains.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700"
                >
                  {d}
                </span>
              ))}
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-amber-600">
              {s.title}
            </h3>
            <p className="text-sm text-stone-600 mb-3 line-clamp-3">
              {s.scenario}
            </p>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-stone-500">
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {s.keyConstraints.length} constraints
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {s.solution.steps.length} steps
                </span>
              </div>
              <span className="flex items-center gap-1 font-semibold text-amber-600 group-hover:gap-2 transition-all">
                View <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-500">
          No scenarios match this filter.
        </div>
      )}
    </>
  );
}
