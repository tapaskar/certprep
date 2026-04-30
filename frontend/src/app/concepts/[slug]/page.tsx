import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Layers,
  Lightbulb,
  Tag,
} from "lucide-react";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import {
  JsonLd,
  breadcrumbSchema,
  faqSchema,
} from "@/components/seo/json-ld";

/**
 * Programmatic SEO landing page per concept — `/concepts/<concept_id>`.
 *
 * Targets the "what is X" / "how does X work" long-tail. Tutorials Dojo
 * doesn't do this; it's the cheapest moat we can build because every
 * page is generated from existing DB content with zero new writing
 * required (the descriptions, key facts, and misconceptions are already
 * authored as part of the question bank).
 *
 * What lives on each page:
 *   - H1: "What is <Name>?" (the actual search query users type)
 *   - Description (1 paragraph)
 *   - Key facts (bulleted list — Google often lifts these into PAA boxes)
 *   - Common misconceptions ("X is NOT Y because…")
 *   - Prerequisite + lateral-related concepts (internal links)
 *   - "Practice questions on this concept" CTA → /exams/<exam_id>
 *   - BreadcrumbList + FAQ JSON-LD
 *
 * Pre-rendered: top 200 popular concepts at build time via
 * generateStaticParams. Rest fall through to ISR.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface ConceptDetail {
  id: string;
  name: string;
  domain_id: string;
  topic_id: string;
  description: string | null;
  exam_weight: number;
  difficulty_tier: number | null;
  key_facts: string[];
  common_misconceptions: string[];
  aws_services: string[];
  prerequisites: { id: string; name: string }[];
  lateral_relations: { id: string; name: string }[];
}

interface ApiResponse {
  concept: ConceptDetail;
  exam: {
    id: string;
    name: string;
    code: string;
    provider: string;
  } | null;
  question_count: number;
}

const providerLabel: Record<string, string> = {
  aws: "AWS",
  azure: "Microsoft Azure",
  gcp: "Google Cloud",
  comptia: "CompTIA",
  nvidia: "NVIDIA",
  redhat: "Red Hat",
};

async function getConcept(slug: string): Promise<ApiResponse | null> {
  try {
    const res = await fetch(`${API_URL}/content/concepts/${slug}`, {
      next: { revalidate: 86400 }, // refresh daily
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface PopularConcept {
  id: string;
}

async function getPopularConcepts(): Promise<PopularConcept[]> {
  try {
    const res = await fetch(`${API_URL}/content/concepts/popular?limit=200`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const concepts = await getPopularConcepts();
  return concepts.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getConcept(slug);
  if (!data) return { title: "Concept Not Found" };

  const { concept, exam } = data;
  const examLabel = exam ? `${exam.code} ${exam.name}` : "Cloud Certification";
  const title = `What is ${concept.name}? — ${exam?.code ?? "Cloud Cert"} Study Guide`;
  const description =
    (concept.description?.slice(0, 130) ?? `${concept.name}: study guide for ${examLabel}.`)
      .replace(/\s+/g, " ")
      .trim() +
    ` Free practice questions and explanation.`;

  return {
    title: title.slice(0, 65),
    description: description.slice(0, 158),
    alternates: {
      canonical: `https://www.sparkupcloud.com/concepts/${slug}`,
    },
    openGraph: {
      title: `${concept.name} — ${exam?.code ?? "Cloud Cert"} Study Guide`,
      description,
      url: `https://www.sparkupcloud.com/concepts/${slug}`,
    },
  };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getConcept(slug);
  if (!data) notFound();

  const { concept, exam, question_count } = data;
  const examLabel = exam
    ? `${providerLabel[exam.provider] ?? exam.provider} ${exam.code}`
    : "Cloud Certification";

  // BreadcrumbList for richer SERP rendering
  const breadcrumbLd = breadcrumbSchema([
    { name: "Home", url: "https://www.sparkupcloud.com" },
    { name: "Concepts", url: "https://www.sparkupcloud.com/concepts" },
    ...(exam
      ? [
          {
            name: exam.code,
            url: `https://www.sparkupcloud.com/exams/${exam.id}`,
          },
        ]
      : []),
    {
      name: concept.name,
      url: `https://www.sparkupcloud.com/concepts/${slug}`,
    },
  ]);

  // FAQPage schema — feeds the misconceptions as Q&As. Google often
  // surfaces these in the People-Also-Ask carousel which is one of
  // the highest-CTR SERP features.
  const faqItems: { question: string; answer: string }[] = [];
  if (exam) {
    faqItems.push({
      question: `Does ${concept.name} appear on the ${exam.code} exam?`,
      answer: `Yes — ${concept.name} is part of the ${exam.code} ${exam.name} exam, with an exam weight of approximately ${(concept.exam_weight * 100).toFixed(0)}%.`,
    });
  }
  if (question_count > 0) {
    faqItems.push({
      question: `How many practice questions exist for ${concept.name}?`,
      answer: `SparkUpCloud has ${question_count} practice questions tagged to ${concept.name}, all with full explanations.`,
    });
  }
  for (const m of concept.common_misconceptions.slice(0, 3)) {
    // Misconceptions are typically authored as "X is not Y. It is Z because…"
    // Treat the whole string as the answer to a generic Q.
    faqItems.push({
      question: `What's a common misconception about ${concept.name}?`,
      answer: m,
    });
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <JsonLd data={breadcrumbLd} />
      {faqItems.length > 0 && <JsonLd data={faqSchema(faqItems)} />}

      <HomeNav />

      <article className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        {/* Breadcrumb (visible) */}
        <nav className="text-sm text-stone-400">
          <Link href="/" className="hover:text-stone-600">
            Home
          </Link>
          {" / "}
          {exam && (
            <>
              <Link
                href={`/exams/${exam.id}`}
                className="hover:text-stone-600"
              >
                {exam.code}
              </Link>
              {" / "}
            </>
          )}
          <span className="text-stone-900">{concept.name}</span>
        </nav>

        {/* Header */}
        <header className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {exam && (
              <Link
                href={`/exams/${exam.id}`}
                className="inline-block rounded-full bg-amber-100 px-3 py-1 font-bold uppercase text-amber-700 hover:bg-amber-200"
              >
                {exam.code}
              </Link>
            )}
            <span className="text-stone-500">{examLabel} study topic</span>
            <span className="ml-auto text-stone-400">
              Exam weight ~{(concept.exam_weight * 100).toFixed(0)}%
            </span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
            What is <span className="text-amber-600">{concept.name}</span>?
          </h1>
          {concept.description && (
            <p className="mt-4 text-base text-stone-700 leading-relaxed">
              {concept.description}
            </p>
          )}
        </header>

        {/* Key facts */}
        {concept.key_facts.length > 0 && (
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 mb-3">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Key facts you need to know
            </h2>
            <ul className="space-y-2">
              {concept.key_facts.map((fact, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="leading-relaxed">{fact}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Common misconceptions — high-value content for "X vs Y" /
            "is X the same as Y" queries that often hit People-Also-Ask. */}
        {concept.common_misconceptions.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Common misconceptions
            </h2>
            <ul className="space-y-3">
              {concept.common_misconceptions.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700 leading-relaxed">
                  <span className="font-bold text-amber-700 shrink-0">
                    {i + 1}.
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Related services / technologies */}
        {concept.aws_services.length > 0 && (
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 mb-3">
              <Tag className="h-5 w-5 text-amber-600" />
              Related services
            </h2>
            <div className="flex flex-wrap gap-2">
              {concept.aws_services.map((svc) => (
                <span
                  key={svc}
                  className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {svc}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Prerequisites + lateral concepts — internal-linking surface. */}
        {(concept.prerequisites.length > 0 ||
          concept.lateral_relations.length > 0) && (
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 mb-4">
              <Layers className="h-5 w-5 text-amber-600" />
              How {concept.name} connects to other topics
            </h2>
            {concept.prerequisites.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Learn these first
                </h3>
                <div className="flex flex-wrap gap-2">
                  {concept.prerequisites.map((p) => (
                    <Link
                      key={p.id}
                      href={`/concepts/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                    >
                      {p.name}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {concept.lateral_relations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Closely related
                </h3>
                <div className="flex flex-wrap gap-2">
                  {concept.lateral_relations.map((r) => (
                    <Link
                      key={r.id}
                      href={`/concepts/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                    >
                      {r.name}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* CTA — the conversion moment */}
        {exam && (
          <section className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-center text-white">
            <Lightbulb className="mx-auto h-8 w-8 text-amber-100" />
            <h2 className="mt-3 text-2xl font-bold">
              Ready to master {concept.name}?
            </h2>
            <p className="mt-2 text-amber-100">
              {question_count > 0
                ? `${question_count} practice questions on this concept, all with full explanations.`
                : "Practice this concept inside the full exam study plan."}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/exams/${exam.id}`}
                className="rounded-lg bg-white px-6 py-3 text-sm font-bold text-amber-600 hover:bg-amber-50"
              >
                See the {exam.code} exam page
              </Link>
              <Link
                href="/register?utm_source=concept_page"
                className="rounded-lg border border-white/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Start practicing free
              </Link>
            </div>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
