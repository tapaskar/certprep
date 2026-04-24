import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Target,
} from "lucide-react";
import { scenarios, getScenario } from "@/lib/scenarios-data";
import { heuristics } from "@/lib/heuristics-data";
import { HomeNav } from "@/components/landing/home-nav";
import Scenario3DLoader from "@/components/scenarios/scenario-3d-loader";

export function generateStaticParams() {
  return scenarios.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = getScenario(id);
  if (!s) return { title: "Not Found" };
  return {
    title: `${s.title} — AWS Scenario | SparkUpCloud`,
    description: s.scenario,
    alternates: {
      canonical: `https://www.sparkupcloud.com/scenarios/${s.id}`,
    },
  };
}

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-rose-100 text-rose-700 border-rose-200",
};

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = getScenario(id);
  if (!s) notFound();

  const appliedHeuristics = s.solution.heuristicsApplied
    .map((hid) => heuristics.find((h) => h.id === hid))
    .filter((h): h is (typeof heuristics)[number] => !!h);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/40 via-white to-amber-50/30">
      <HomeNav />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href="/scenarios"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All Scenarios
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                difficultyColors[s.difficulty]
              }`}
            >
              {s.difficulty}
            </span>
            {s.certs.map((c) => (
              <span
                key={c}
                className="text-xs font-bold px-2 py-0.5 rounded bg-stone-900 text-white"
              >
                {c}
              </span>
            ))}
            {s.domains.map((d) => (
              <span
                key={d}
                className="text-xs font-medium px-2 py-0.5 rounded bg-violet-50 text-violet-700"
              >
                {d}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
            {s.title}
          </h1>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-5">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-base text-stone-700">{s.scenario}</p>
            </div>
          </div>
        </div>

        {/* Key constraints */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-2">
            Key Constraints
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {s.keyConstraints.map((k) => (
              <div
                key={k}
                className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-700"
              >
                <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                {k}
              </div>
            ))}
          </div>
        </div>

        {/* 3D Architecture */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-2">
            Reference Architecture (interactive 3D)
          </h2>
          <div className="text-xs text-stone-500 mb-2">
            🖱️ Drag to rotate · 📜 Scroll to zoom
          </div>
          <div className="h-[480px] rounded-xl overflow-hidden border border-stone-200 shadow-inner bg-stone-900">
            <Scenario3DLoader scenario={s} />
          </div>
        </div>

        {/* Solution */}
        <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">
              {s.solution.title}
            </h2>
          </div>
          <ol className="space-y-2 mb-4">
            {s.solution.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-stone-800">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {appliedHeuristics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Heuristics Applied
              </div>
              <div className="flex flex-wrap gap-2">
                {appliedHeuristics.map((h) => (
                  <Link
                    key={h.id}
                    href="/study/heuristics"
                    className="text-xs px-2 py-1 rounded-md bg-white border border-emerald-200 hover:border-emerald-400 font-medium text-stone-700"
                  >
                    ✓ {h.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Common traps */}
        {s.commonTraps.length > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-bold text-stone-900">
                Common Traps (Wrong Answers)
              </h2>
            </div>
            <ul className="space-y-2">
              {s.commonTraps.map((trap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-800">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{trap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
          <h3 className="text-2xl font-bold text-stone-900 mb-2">
            Try the simulator
          </h3>
          <p className="text-stone-600 mb-4">
            Build this architecture yourself in the drag-and-drop simulator.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/simulator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 font-bold"
            >
              Open Simulator →
            </Link>
            <Link
              href="/scenarios"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-stone-300 bg-white hover:border-stone-900 text-stone-700 px-6 py-3 font-bold"
            >
              More Scenarios
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
