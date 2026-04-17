"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Play,
  ExternalLink,
  Loader2,
  Target,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { ConceptSummary } from "@/lib/api-types";

interface Domain {
  id: string;
  name: string;
  weight_pct: number;
}

interface ExamDetails {
  id: string;
  provider: string;
  name: string;
  code: string | null;
  total_questions: number;
  time_limit_minutes: number;
  passing_score_pct: number;
  domains: Domain[];
  exam_guide_url?: string | null;
}

interface ConceptWithMastery extends ConceptSummary {
  mastery_pct: number; // 0-100, 0 if not started
  level: string; // "not_started" | "novice" | ...
  question_count?: number;
}

interface StudyExplorerProps {
  onFocusConcept?: (conceptId: string, conceptName: string) => void;
  onFocusDomain?: (domainId: string, domainName: string) => void;
  activeConceptId?: string | null;
  className?: string;
}

/**
 * Left-side concept explorer: Exam → Domain → Topic → Concept.
 * Shows exam-official domain weights and per-concept mastery.
 */
export function StudyExplorer({
  onFocusConcept,
  onFocusDomain,
  activeConceptId,
  className,
}: StudyExplorerProps) {
  const examId = useAuthStore((s) => s.user?.active_exam_id);
  const enrolledExams = useAuthStore((s) => s.user?.enrolled_exams ?? []);

  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [concepts, setConcepts] = useState<ConceptWithMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Progress data (mastery per concept) — from /progress/:examId
  useEffect(() => {
    if (!examId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.getExamDetails(examId).catch(() => null),
      api.getConcepts(examId).catch(() => []),
      api.getProgress(examId).catch(() => null),
    ]).then(([details, conceptList, progress]) => {
      if (cancelled) return;
      setExamDetails(details);

      // Build mastery map from weakest_concepts (the only per-concept data
      // exposed today). Concepts not in the map are shown as "not started".
      const masteryMap = new Map<string, { pct: number; level: string }>();
      if (progress && typeof progress === "object" && "weakest_concepts" in progress) {
        const arr = progress.weakest_concepts ?? [];
        for (const c of arr) {
          const level =
            c.mastery_pct >= 80 ? "expert" :
            c.mastery_pct >= 60 ? "proficient" :
            c.mastery_pct >= 30 ? "novice" : "learning";
          masteryMap.set(c.id, { pct: c.mastery_pct, level });
        }
      }

      const withMastery: ConceptWithMastery[] = (conceptList ?? []).map((c) => {
        const m = masteryMap.get(c.id);
        return {
          ...c,
          mastery_pct: m?.pct ?? 0,
          level: m?.level ?? "not_started",
        };
      });

      setConcepts(withMastery);

      // Auto-expand first domain for discoverability
      if (details?.domains && details.domains.length > 0) {
        setExpandedDomains(new Set([details.domains[0].id]));
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [examId]);

  // Group concepts: domain -> topic -> concept[]
  const tree = useMemo(() => {
    const byDomain = new Map<
      string,
      { topics: Map<string, ConceptWithMastery[]>; count: number; avgMastery: number }
    >();

    for (const c of concepts) {
      if (!byDomain.has(c.domain_id)) {
        byDomain.set(c.domain_id, {
          topics: new Map(),
          count: 0,
          avgMastery: 0,
        });
      }
      const d = byDomain.get(c.domain_id)!;
      if (!d.topics.has(c.topic_id)) d.topics.set(c.topic_id, []);
      d.topics.get(c.topic_id)!.push(c);
      d.count += 1;
    }

    // Compute per-domain avg mastery
    for (const [, d] of byDomain) {
      let sum = 0;
      let n = 0;
      for (const arr of d.topics.values()) {
        for (const c of arr) {
          sum += c.mastery_pct;
          n += 1;
        }
      }
      d.avgMastery = n > 0 ? Math.round(sum / n) : 0;
    }

    return byDomain;
  }, [concepts]);

  const toggleDomain = (id: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const prettyTopic = (topicId: string): string =>
    topicId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const masteryColor = (pct: number): string => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    if (pct > 0) return "bg-orange-400";
    return "bg-stone-300";
  };

  // No exam selected
  if (!examId) {
    return (
      <div className={cn("flex flex-col gap-3 p-4", className)}>
        <div className="text-sm text-stone-500">
          Select an exam to browse its structure.
        </div>
        {enrolledExams.length > 0 && (
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700"
          >
            Go to Dashboard →
          </a>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Exam header */}
      <div className="p-4 border-b border-stone-200 bg-gradient-to-br from-amber-50/50 to-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-4 w-4 text-amber-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Exam Structure
          </span>
        </div>
        <div className="text-sm font-bold text-stone-900 leading-tight">
          {examDetails?.name ?? examId}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
          {examDetails?.code && <span>{examDetails.code}</span>}
          {examDetails?.total_questions != null && (
            <span>{examDetails.total_questions} questions</span>
          )}
          {examDetails?.time_limit_minutes != null && (
            <span>{examDetails.time_limit_minutes} min</span>
          )}
          {examDetails?.passing_score_pct != null && (
            <span>Pass: {examDetails.passing_score_pct}%</span>
          )}
        </div>
        {examDetails?.exam_guide_url && (
          <a
            href={examDetails.exam_guide_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-amber-600"
          >
            Official exam guide <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {examDetails?.domains?.map((domain) => {
          const bucket = tree.get(domain.id);
          const isExpanded = expandedDomains.has(domain.id);
          const conceptCount = bucket?.count ?? 0;
          const avgMastery = bucket?.avgMastery ?? 0;

          return (
            <div key={domain.id} className="mb-1.5">
              {/* Domain row */}
              <div
                className={cn(
                  "group flex items-center gap-1 rounded-md transition-colors",
                  "hover:bg-stone-100"
                )}
              >
                <button
                  onClick={() => toggleDomain(domain.id)}
                  className="flex-1 flex items-center gap-1.5 px-2 py-2 text-left min-w-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-stone-900 truncate">
                      {domain.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-amber-700">
                        {domain.weight_pct}%
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {conceptCount} concepts
                      </span>
                      <span className="text-[10px] text-stone-500">
                        · Mastery: {avgMastery}%
                      </span>
                    </div>
                    {/* Mastery bar */}
                    <div className="mt-1 h-1 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={cn("h-full transition-all", masteryColor(avgMastery))}
                        style={{ width: `${avgMastery}%` }}
                      />
                    </div>
                  </div>
                </button>
                {onFocusDomain && conceptCount > 0 && (
                  <button
                    onClick={() => onFocusDomain(domain.id, domain.name)}
                    title="Focus 15-min study session on this domain"
                    className="shrink-0 mr-1 inline-flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="h-2.5 w-2.5" />
                    Focus
                  </button>
                )}
              </div>

              {/* Topics */}
              {isExpanded && bucket && (
                <div className="ml-4 mt-0.5 border-l border-stone-200 pl-2">
                  {Array.from(bucket.topics.entries()).map(([topicId, items]) => {
                    const topicKey = `${domain.id}::${topicId}`;
                    const topicExpanded = expandedTopics.has(topicKey);
                    return (
                      <div key={topicKey} className="mb-0.5">
                        <button
                          onClick={() => toggleTopic(topicKey)}
                          className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-stone-50 text-left"
                        >
                          {topicExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0 text-stone-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 text-stone-400" />
                          )}
                          <span className="text-[11px] font-semibold text-stone-600 truncate">
                            {prettyTopic(topicId)}
                          </span>
                          <span className="ml-auto text-[10px] text-stone-400">
                            {items.length}
                          </span>
                        </button>

                        {/* Concepts */}
                        {topicExpanded && (
                          <div className="ml-3 border-l border-stone-100 pl-2 mt-0.5">
                            {items.map((c) => {
                              const isActive = activeConceptId === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => onFocusConcept?.(c.id, c.name)}
                                  className={cn(
                                    "group w-full flex items-center gap-2 px-1.5 py-1 rounded text-left transition-colors",
                                    isActive
                                      ? "bg-amber-100 text-amber-900"
                                      : "hover:bg-stone-50 text-stone-700"
                                  )}
                                >
                                  <Target
                                    className={cn(
                                      "h-3 w-3 shrink-0",
                                      isActive ? "text-amber-600" : "text-stone-400"
                                    )}
                                  />
                                  <span className="text-[11px] truncate flex-1">
                                    {c.name}
                                  </span>
                                  {c.mastery_pct > 0 && (
                                    <span
                                      className={cn(
                                        "text-[9px] font-bold px-1.5 rounded-sm shrink-0",
                                        c.mastery_pct >= 80
                                          ? "bg-emerald-100 text-emerald-700"
                                          : c.mastery_pct >= 50
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-orange-100 text-orange-700"
                                      )}
                                    >
                                      {c.mastery_pct}%
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {concepts.length === 0 && !loading && (
          <div className="text-center py-8 text-xs text-stone-500">
            No concepts found for this exam.
          </div>
        )}
      </div>
    </div>
  );
}
