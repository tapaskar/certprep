import Link from "next/link";
import { BookOpen, Clock, Target, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { CertBadge } from "@/components/cert-badge";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "76+ Certification Practice Exams — Free Mock Tests",
  description:
    "Free practice exams for AWS, Azure, GCP, CompTIA, and NVIDIA certifications. 8,800+ questions, timed mock exams, and AI-powered adaptive study.",
  alternates: { canonical: "https://www.sparkupcloud.com/exams" },
  openGraph: {
    title: "76+ Cloud Certification Practice Exams | SparkUpCloud",
    description:
      "Free practice questions and mock exams for AWS, Azure, GCP, CompTIA, and NVIDIA certifications.",
    url: "https://www.sparkupcloud.com/exams",
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface Exam {
  id: string;
  provider: string;
  name: string;
  code: string;
  total_questions: number;
  time_limit_minutes: number;
  passing_score_pct: number;
  domains: { id: string; name: string; weight_pct: number }[];
}

async function getExams(): Promise<Exam[]> {
  try {
    const res = await fetch(`${API_URL}/content/exams`, {
      next: { revalidate: 3600 },
    });
    return res.json();
  } catch {
    return [];
  }
}

const providerMeta: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  aws: { label: "AWS", color: "text-amber-700", bg: "bg-amber-50" },
  azure: { label: "Azure", color: "text-blue-700", bg: "bg-blue-50" },
  gcp: { label: "Google Cloud", color: "text-green-700", bg: "bg-green-50" },
  comptia: { label: "CompTIA", color: "text-red-700", bg: "bg-red-50" },
  nvidia: { label: "NVIDIA", color: "text-lime-700", bg: "bg-lime-50" },
  redhat: { label: "Red Hat", color: "text-rose-700", bg: "bg-rose-50" },
};

export default async function ExamsListPage() {
  const exams = await getExams();
  const providers = [...new Set(exams.map((e) => e.provider))].sort();

  return (
    <div className="min-h-screen bg-stone-50">
      <HomeNav />

      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Practice Exams for{" "}
            <span className="text-amber-500">76+ Certifications</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
            8,800+ scenario-based questions across AWS, Azure, Google Cloud,
            CompTIA, and NVIDIA. Free diagnostic, timed mock exams, and
            AI-powered study plans.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-stone-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> 8,800+ Questions
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> Timed Mock Exams
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" /> Pass/Fail Scoring
            </span>
          </div>
        </div>

        {/* Red Hat / non-listed certs callout */}
        <div className="mt-10 rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md text-2xl">
              🎯
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
                Looking for Red Hat / Linux / Container exams?
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                Red Hat EX188V4K — Containers with Podman
              </h3>
              <p className="text-sm text-stone-600">
                Full step-by-step guided learning path — 6 modules, 22 steps,
                hands-on labs, and quizzes after each module. Coach guides you
                start to finish.
              </p>
            </div>
            <Link
              href="/paths"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 text-sm font-bold whitespace-nowrap"
            >
              View Paths
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Exam listing by provider */}
        {providers.map((prov) => {
          const meta = providerMeta[prov] || {
            label: prov,
            color: "text-stone-700",
            bg: "bg-stone-50",
          };
          const provExams = exams.filter((e) => e.provider === prov);

          return (
            <div key={prov} className="mt-12">
              <h2
                className={`text-2xl font-bold ${meta.color}`}
              >
                {meta.label} Certifications ({provExams.length})
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {provExams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/exams/${exam.id}`}
                    className="group rounded-xl border border-stone-200 bg-white p-5 transition-all hover:border-amber-400 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <CertBadge
                        code={exam.code}
                        provider={exam.provider}
                        size={64}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${meta.color} ${meta.bg}`}
                          >
                            {exam.code}
                          </span>
                          <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 mt-0.5" />
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-stone-900 group-hover:text-amber-600 leading-snug">
                          {exam.name}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-xs text-stone-500">
                      <span>{exam.total_questions} Qs</span>
                      <span>{exam.time_limit_minutes} min</span>
                      <span>{exam.passing_score_pct}% pass</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {exam.domains.slice(0, 3).map((d) => (
                        <span
                          key={d.id}
                          className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500"
                        >
                          {d.name.length > 25
                            ? d.name.slice(0, 25) + "..."
                            : d.name}
                        </span>
                      ))}
                      {exam.domains.length > 3 && (
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400">
                          +{exam.domains.length - 3} more
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">
            Ready to Start Studying?
          </h2>
          <p className="mt-2 text-amber-100">
            Take a free diagnostic quiz and get a personalized study plan.
          </p>
          <Link
            href="/register"
            className="mt-4 inline-block rounded-lg bg-white px-8 py-3 font-bold text-amber-600 hover:bg-amber-50"
          >
            Start Free — No Credit Card
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
