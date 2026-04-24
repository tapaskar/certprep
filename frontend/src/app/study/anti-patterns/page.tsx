import Link from "next/link";
import { XCircle, AlertTriangle } from "lucide-react";
import { heuristics } from "@/lib/heuristics-data";
import { HomeNav } from "@/components/landing/home-nav";

export const metadata = {
  title: "AWS Exam Anti-Patterns — What NEVER to Choose | SparkUpCloud",
  description:
    "The explicit 'never choose' AWS architecture patterns on certification exams. Public databases, hardcoded credentials, single-AZ production — common traps and why they're wrong.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/study/anti-patterns",
  },
};

export default function AntiPatternsPage() {
  const antiPatterns = heuristics.filter(
    (h) => h.severity === "never" || h.antiPattern
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30">
      <HomeNav />

      <section className="px-6 pt-16 pb-12 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-3 py-1 rounded-full mb-4">
            Never Do This
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-4">
            AWS Exam{" "}
            <span className="relative inline-block">
              Anti-Patterns
              <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-rose-500" />
            </span>
          </h1>
          <p className="text-lg text-stone-600">
            {antiPatterns.length} design choices that AWS certification exams
            explicitly mark as WRONG. If you see one in an answer, eliminate it.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          {antiPatterns.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border-2 border-rose-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-stone-900">
                      {h.title}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      AVOID
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                      {h.category}
                    </span>
                  </div>

                  {h.antiPattern && (
                    <div className="text-base font-semibold text-rose-900 bg-rose-50 rounded-md p-3 mb-3 border-l-4 border-rose-500">
                      ✗ {h.antiPattern}
                    </div>
                  )}

                  <div className="text-sm text-stone-700 mb-2">
                    <span className="font-semibold text-stone-900">
                      What to do instead:{" "}
                    </span>
                    {h.rule}
                  </div>

                  <div className="text-sm text-stone-600">
                    <span className="font-semibold">Why it matters: </span>
                    {h.reasoning}
                  </div>

                  {h.example && (
                    <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 rounded-md p-2 border-l-4 border-emerald-500">
                      ✓ <span className="font-semibold">Correct: </span>
                      {h.example}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-8 text-center mt-8">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              See anti-patterns in action
            </h3>
            <p className="text-stone-600 mb-6 max-w-xl mx-auto">
              Our practice questions teach you to spot anti-patterns in answer
              choices, not just memorize facts. Train the instinct to eliminate
              wrong answers fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/study/heuristics"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-stone-300 bg-white text-stone-700 hover:border-stone-900 px-6 py-3 font-bold"
              >
                ← View All Heuristics
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 font-bold"
              >
                Practice Questions →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
