import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  Clock,
  Target,
  ExternalLink,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  ArrowRight,
  Star,
  FileText,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getExamDetails(examId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_URL}/content/${examId}/details`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>;
}): Promise<Metadata> {
  const { examId } = await params;
  const exam = await getExamDetails(examId);
  if (!exam) return { title: "Exam Not Found" };

  const title = `${exam.code} ${exam.name} Practice Exam — Free Questions & Mock Test`;
  const description = `Free practice questions and mock exam for ${exam.code} ${exam.name}. ${exam.questions_in_bank}+ questions, ${exam.domains?.length} domains, timed mock exams with pass/fail scoring. Pass rate: ${exam.passing_score_pct}%.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.sparkupcloud.com/exams/${examId}`,
    },
    openGraph: {
      title: `${exam.code} Practice Exam | SparkUpCloud`,
      description,
      url: `https://www.sparkupcloud.com/exams/${examId}`,
    },
    twitter: {
      card: "summary",
      title: `${exam.code} ${exam.name} — Free Practice Exam`,
      description,
    },
  };
}

export default async function PublicExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = await getExamDetails(examId);

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500">
        Exam not found
      </div>
    );
  }

  const info = exam.exam_info;
  const providerLabel: Record<string, string> = {
    aws: "AWS",
    azure: "Azure",
    gcp: "Google Cloud",
    comptia: "CompTIA",
    nvidia: "NVIDIA",
  };

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${exam.code} ${exam.name} Practice Exam`,
    description: `Practice questions and mock exam for ${exam.name}`,
    provider: {
      "@type": "Organization",
      name: "SparkUpCloud",
      url: "https://www.sparkupcloud.com",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navbar */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SparkUpCloud" className="h-8 w-auto" />
            <span className="text-lg font-bold text-stone-900">
              SparkUpCloud
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/exams" className="text-sm text-stone-500 hover:text-stone-700">
              All Exams
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-stone-400">
          <Link href="/exams" className="hover:text-stone-600">
            Exams
          </Link>
          {" / "}
          <span className="text-stone-600">
            {providerLabel[exam.provider] || exam.provider}
          </span>
          {" / "}
          <span className="text-stone-900">{exam.code}</span>
        </nav>

        {/* Header */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-700">
                {providerLabel[exam.provider] || exam.provider}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-stone-900">
                {exam.name}
              </h1>
              <p className="mt-1 text-lg text-stone-500">
                {exam.code} Practice Exam &amp; Study Guide
              </p>
            </div>
            {info?.difficulty_rating && (
              <div className="flex items-center gap-1" title={`Difficulty: ${info.difficulty_rating}/5`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${s <= info.difficulty_rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-stone-50 p-4 text-center">
              <BookOpen className="mx-auto h-5 w-5 text-stone-400" />
              <p className="mt-1 text-2xl font-bold text-stone-900">
                {exam.total_questions}
              </p>
              <p className="text-xs text-stone-500">Exam Questions</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 text-center">
              <Clock className="mx-auto h-5 w-5 text-stone-400" />
              <p className="mt-1 text-2xl font-bold text-stone-900">
                {exam.time_limit_minutes}
              </p>
              <p className="text-xs text-stone-500">Minutes</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 text-center">
              <Target className="mx-auto h-5 w-5 text-stone-400" />
              <p className="mt-1 text-2xl font-bold text-stone-900">
                {exam.passing_score_pct}%
              </p>
              <p className="text-xs text-stone-500">Passing Score</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 text-center">
              <Trophy className="mx-auto h-5 w-5 text-stone-400" />
              <p className="mt-1 text-2xl font-bold text-stone-900">
                {exam.questions_in_bank}+
              </p>
              <p className="text-xs text-stone-500">Practice Questions</p>
            </div>
          </div>

          {info?.overview && (
            <p className="mt-6 text-sm leading-relaxed text-stone-600 whitespace-pre-line">
              {info.overview}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-500">
            {info?.cost_usd && <span>Cost: ${info.cost_usd}</span>}
            {info?.validity_years && (
              <span>Valid: {info.validity_years} years</span>
            )}
            {info?.average_study_weeks && (
              <span>Avg study: {info.average_study_weeks} weeks</span>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 text-center">
          <h2 className="text-xl font-bold text-stone-900">
            Take a Free {exam.code} Diagnostic Quiz
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            12 questions to assess your readiness. Get a personalized study
            plan in 5 minutes.
          </p>
          <Link
            href="/register"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-8 py-3 font-bold text-white hover:bg-amber-600"
          >
            Start Free Diagnostic
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-xs text-stone-400">
            No credit card required
          </p>
        </div>

        {/* Domain Breakdown */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <FileText className="h-5 w-5 text-amber-500" />
            Exam Domains
          </h2>
          <div className="mt-6 space-y-4">
            {exam.domains?.map(
              (d: { id: string; name: string; weight_pct: number; question_count?: number }) => (
                <div key={d.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">
                      {d.name}
                    </span>
                    <span className="text-sm font-bold text-stone-900">
                      {d.weight_pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                      style={{ width: `${d.weight_pct}%` }}
                    />
                  </div>
                  {d.question_count !== undefined && (
                    <p className="mt-1 text-xs text-stone-400">
                      {d.question_count} practice questions available
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Preparation Tips */}
        {info?.preparation_tips?.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
            <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {exam.code} Preparation Tips
            </h2>
            <div className="mt-4 space-y-3">
              {info.preparation_tips.map((tip: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-stone-100 bg-stone-50 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm text-stone-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exam Day Tips */}
        {info?.exam_day_tips?.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Exam Day Tips for {exam.code}
            </h2>
            <div className="mt-4 space-y-3">
              {info.exam_day_tips.map((tip: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-4"
                >
                  <span className="mt-0.5 font-bold text-sm text-amber-500">
                    {i + 1}.
                  </span>
                  <p className="text-sm text-stone-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Services */}
        {info?.key_services_to_know?.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
            <h2 className="text-xl font-bold text-stone-900">
              Key {providerLabel[exam.provider] || exam.provider} Services to Know
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {info.key_services_to_know.map((svc: string) => (
                <span
                  key={svc}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Official Resources */}
        {info?.official_resources?.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
            <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
              <ExternalLink className="h-5 w-5 text-amber-500" />
              Official {exam.code} Resources
            </h2>
            <div className="mt-4 space-y-2">
              {info.official_resources.map(
                (r: { title: string; url: string; type: string }, i: number) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-stone-200 p-4 transition-colors hover:border-amber-400 hover:bg-amber-50"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{r.title}</p>
                      <p className="text-xs uppercase text-stone-400">
                        {r.type}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-stone-400" />
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">
            Ready to Pass {exam.code}?
          </h2>
          <p className="mt-2 text-amber-100">
            {exam.questions_in_bank}+ practice questions, 3 full mock exams,
            AI-powered study plan.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-lg bg-white px-8 py-3 font-bold text-amber-600 hover:bg-amber-50"
            >
              Start Free — No Credit Card
            </Link>
            {exam.exam_guide_url && (
              <a
                href={exam.exam_guide_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/30 px-6 py-3 font-medium text-white hover:bg-white/10"
              >
                Official Exam Guide
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-stone-200 bg-white py-8 text-center text-sm text-stone-400">
        <p>&copy; 2026 SparkUpCloud. AI-powered certification exam prep.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/exams" className="hover:text-stone-600">All Exams</Link>
          <Link href="/pricing" className="hover:text-stone-600">Pricing</Link>
          <Link href="/blog" className="hover:text-stone-600">Blog</Link>
          <Link href="/contact" className="hover:text-stone-600">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
