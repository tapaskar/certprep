import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, ThumbsUp } from "lucide-react";
import { heuristics } from "@/lib/heuristics-data";
import { LandingNav } from "@/components/study/landing-nav";

export const metadata = {
  title: "AWS Certification Heuristics — 20+ Decision Rules | SparkUpCloud",
  description:
    "Battle-tested decision rules for AWS certification exams. Multi-AZ always, least privilege, no hardcoded secrets — the heuristics that save you on exam day.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/study/heuristics",
  },
};

const severityConfig = {
  always: {
    label: "ALWAYS",
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-600",
  },
  prefer: {
    label: "PREFER",
    icon: ThumbsUp,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
  },
  avoid: {
    label: "AVOID",
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-700 border-amber-200",
    iconColor: "text-amber-600",
  },
  never: {
    label: "NEVER",
    icon: XCircle,
    color: "bg-rose-100 text-rose-700 border-rose-200",
    iconColor: "text-rose-600",
  },
};

export default function HeuristicsPage() {
  // Group by category
  const byCategory: Record<string, typeof heuristics> = {};
  for (const h of heuristics) {
    if (!byCategory[h.category]) byCategory[h.category] = [];
    byCategory[h.category].push(h);
  }
  const categoryOrder = [
    "HA/DR",
    "Security",
    "Cost",
    "Performance",
    "Architecture",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      <LandingNav />

      <section className="px-6 pt-16 pb-12 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-3 py-1 rounded-full mb-4">
            Study Guide
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-4">
            AWS Certification{" "}
            <span className="relative inline-block">
              Heuristics
              <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-amber-500" />
            </span>
          </h1>
          <p className="text-lg text-stone-600 mb-6">
            {heuristics.length} battle-tested decision rules. When an exam
            question gives you 4 plausible answers, these heuristics tell you
            which one AWS expects.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {categoryOrder.map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/[/\s]+/g, "-")}`}
                className="px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
              >
                {cat} ({byCategory[cat]?.length || 0})
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-12">
          {categoryOrder.map((cat) => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            return (
              <div
                key={cat}
                id={cat.toLowerCase().replace(/[/\s]+/g, "-")}
                className="scroll-mt-20"
              >
                <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <span className="h-1 w-8 bg-amber-500 rounded-full" />
                  {cat}
                </h2>
                <div className="space-y-3">
                  {items.map((h) => {
                    const config = severityConfig[h.severity];
                    const Icon = config.icon;
                    return (
                      <div
                        key={h.id}
                        className="rounded-xl border border-stone-200 bg-white p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <Icon
                            className={`h-6 w-6 shrink-0 ${config.iconColor} mt-0.5`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-stone-900">
                                {h.title}
                              </h3>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.color}`}
                              >
                                {config.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {h.certs.map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm font-medium text-stone-800 mb-2">
                              {h.rule}
                            </p>
                            <p className="text-sm text-stone-600 mb-2">
                              <span className="font-semibold">Why: </span>
                              {h.reasoning}
                            </p>
                            {h.example && (
                              <div className="text-sm text-emerald-700 bg-emerald-50 rounded-md p-2 mb-1">
                                <span className="font-semibold">✓ Example: </span>
                                {h.example}
                              </div>
                            )}
                            {h.antiPattern && (
                              <div className="text-sm text-rose-700 bg-rose-50 rounded-md p-2">
                                <span className="font-semibold">✗ Anti-pattern: </span>
                                {h.antiPattern}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              Test these heuristics on real exam questions
            </h3>
            <p className="text-stone-600 mb-6 max-w-xl mx-auto">
              SparkUpCloud has 3,400+ AWS practice questions with AI-powered
              adaptive learning. Your next exam is 70% heuristics + 30%
              specifics.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 font-bold"
            >
              Start Studying Free →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
