"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Loader2,
  BookOpen,
  ChevronRight,
  Layers,
  Star,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useStudyStore } from "@/stores/study-store";
import { cn } from "@/lib/utils";
import type { ConceptSummary } from "@/lib/api-types";

interface Domain {
  id: string;
  name: string;
  weight_pct: number;
}

interface ExamDetails {
  id: string;
  name: string;
  code: string | null;
  domains: Domain[];
}

export default function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: domainId } = use(params);
  const router = useRouter();
  const examId = useAuthStore((s) => s.user?.active_exam_id);
  const { createSession, setMode, isLoading } = useStudyStore();

  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [concepts, setConcepts] = useState<ConceptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId || !domainId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.getExamDetails(examId).catch(() => null),
      api.getConcepts(examId).catch(() => []),
    ]).then(([details, allConcepts]) => {
      if (cancelled) return;
      setExamDetails(details);
      const domainConcepts = (allConcepts ?? []).filter(
        (c) => c.domain_id === domainId
      );
      setConcepts(domainConcepts);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [examId, domainId]);

  const domain = examDetails?.domains.find((d) => d.id === domainId);

  const handleStartDomainPractice = async () => {
    if (!examId) return;
    setStarting(true);
    setPracticeError(null);
    setMode("quick_quiz");
    try {
      await createSession(examId, 20, { domain_ids: [domainId] });
      router.push("/study");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not start practice session.";
      setPracticeError(msg.replace(/^API \d+:\s*/, ""));
    } finally {
      setStarting(false);
    }
  };

  // Group by topic_id
  const byTopic = new Map<string, ConceptSummary[]>();
  for (const c of concepts) {
    if (!byTopic.has(c.topic_id)) byTopic.set(c.topic_id, []);
    byTopic.get(c.topic_id)!.push(c);
  }

  const prettyTopic = (topicId: string) =>
    topicId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  if (!examId) {
    return (
      <div className="mx-auto max-w-lg text-center py-16">
        <p className="text-stone-500">Select an exam first.</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/study"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Study Home
      </Link>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : !domain ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Domain not found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Domain header */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <Layers className="h-5 w-5 text-violet-600 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-violet-600">
                    Domain
                  </div>
                  <h1 className="text-2xl font-bold text-stone-900">
                    {domain.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-amber-100 px-3 py-0.5 font-bold text-amber-700">
                      {domain.weight_pct}% of exam
                    </span>
                    <span className="text-stone-500">
                      {concepts.length}{" "}
                      {concepts.length === 1 ? "concept" : "concepts"}
                    </span>
                    <span className="text-stone-500">
                      · {byTopic.size}{" "}
                      {byTopic.size === 1 ? "topic" : "topics"}
                    </span>
                    {examDetails && (
                      <span className="text-stone-500">
                        · {examDetails.name}{" "}
                        {examDetails.code ? `(${examDetails.code})` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleStartDomainPractice}
                    disabled={starting || isLoading || concepts.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:scale-[1.02] disabled:opacity-50 transition-all"
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start 20-min Domain Practice
                  </button>
                  <span className="text-xs text-stone-500">
                    Questions strictly from concepts in this domain.
                  </span>
                </div>
                {practiceError && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    {practiceError}
                  </div>
                )}
              </div>
            </div>

            {/* Topics → Concepts */}
            <div className="space-y-4">
              {Array.from(byTopic.entries()).map(([topicId, items]) => (
                <div
                  key={topicId}
                  className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-amber-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                      {prettyTopic(topicId)}
                    </h2>
                    <span className="text-xs text-stone-400">
                      ({items.length})
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((c) => (
                      <Link
                        key={c.id}
                        href={`/study/concept/${c.id}`}
                        className="group flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-stone-900 truncate">
                            {c.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-2.5 w-2.5",
                                    star <= (c.difficulty_tier ?? 3)
                                      ? "fill-amber-500 text-amber-500"
                                      : "text-stone-300"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-stone-500">
                              Weight: {(c.exam_weight * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-amber-600 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {concepts.length === 0 && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center text-stone-500">
                No concepts found in this domain yet.
              </div>
            )}
          </div>
        )}
    </div>
  );
}
