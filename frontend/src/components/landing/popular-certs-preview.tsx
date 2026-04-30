import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CertBadge } from "@/components/cert-badge";

/**
 * Compact "popular certs" surface for the homepage.
 *
 * Replaces the old <CertTabs /> which rendered all 76 cert cards on
 * the homepage — overwhelming for a landing page and ~70 unnecessary
 * DOM nodes for visitors who'd never scroll through them anyway.
 *
 * Hand-picked the six entry-level associate-tier certs that drive the
 * majority of cert-prep traffic across the three major clouds. Anyone
 * looking for a specialty / professional cert clicks "View all 76 →"
 * and lands on /exams.
 *
 * Server component — fetches the exam catalog at build time so the
 * cards render in the static HTML (SEO-friendly, zero client-side JS
 * for the listing).
 */

const POPULAR_EXAM_IDS = [
  "aws-clf-c02",
  "aws-saa-c03",
  "azure-az900",
  "azure-az104",
  "gcp-cdl",
  "gcp-ace",
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface ApiExam {
  id: string;
  provider: string;
  name: string;
  code: string;
  total_questions: number;
  time_limit_minutes: number;
  passing_score_pct: number;
}

const providerMeta: Record<
  string,
  { label: string; tone: string; bg: string }
> = {
  aws: { label: "AWS", tone: "text-amber-700", bg: "bg-amber-50" },
  azure: { label: "Azure", tone: "text-blue-700", bg: "bg-blue-50" },
  gcp: { label: "Google Cloud", tone: "text-green-700", bg: "bg-green-50" },
};

async function getExams(): Promise<ApiExam[]> {
  try {
    const res = await fetch(`${API_URL}/content/exams`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function PopularCertsPreview() {
  const all = await getExams();
  // Preserve the curated order rather than the order the API returns.
  const popular = POPULAR_EXAM_IDS.map((id) =>
    all.find((e) => e.id === id),
  ).filter((e): e is ApiExam => e !== undefined);

  if (popular.length === 0) {
    // API offline at build time — render nothing rather than show a broken
    // placeholder. The homepage still works without this section.
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center mb-10">
        <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-3">
          Popular certifications
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          76+ certifications.{" "}
          <span className="text-stone-500 font-medium">
            Here&apos;s where most people start.
          </span>
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {popular.map((exam) => {
          const meta = providerMeta[exam.provider] ?? {
            label: exam.provider,
            tone: "text-stone-700",
            bg: "bg-stone-50",
          };
          return (
            <Link
              key={exam.id}
              href={`/exams/${exam.id}`}
              className="group flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-amber-400 hover:shadow-md"
            >
              <CertBadge
                code={exam.code}
                provider={exam.provider}
                size={56}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.tone} ${meta.bg}`}
                  >
                    {exam.code}
                  </span>
                  <span className="text-[10px] text-stone-400 truncate">
                    {meta.label}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-700 transition-colors leading-snug line-clamp-2">
                  {exam.name}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500">
                  <span>{exam.total_questions} Qs</span>
                  <span>·</span>
                  <span>{exam.time_limit_minutes} min</span>
                  <span>·</span>
                  <span>{exam.passing_score_pct}% pass</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/exams"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-sm font-bold text-stone-900 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-colors shadow-sm"
        >
          View all 76+ certifications
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
