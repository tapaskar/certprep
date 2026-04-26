"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronRight,
  Clock,
  Loader2,
  Trophy,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { api } from "@/lib/api";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { IntegratedCoachPanel } from "@/components/tutor/integrated-coach-panel";
import { CoachInterventionBanner } from "@/components/tutor/coach-intervention-banner";
import { useCoachStore } from "@/stores/coach-store";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Path = any;

export default function PathRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pathId } = use(params);

  const [path, setPath] = useState<Path | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [coachOpenMobile, setCoachOpenMobile] = useState(false);

  // Topics sidebar collapse state — persisted across navigation so the
  // user's preference survives reloads and step changes. Mirrors the same
  // pattern as IntegratedCoachPanel's storageKey.
  const TOPICS_COLLAPSED_KEY = "sparkupcloud_path_topics_collapsed";
  const COACH_COLLAPSED_KEY = "sparkupcloud_path_coach_collapsed";
  const [topicsCollapsed, setTopicsCollapsed] = useState(false);
  // Coach owns its own collapse state (inside IntegratedCoachPanel) and
  // writes to localStorage. We mirror it here so the parent grid template
  // can give the freed space back to the middle column. Without this
  // mirror the grid kept reserving 360-400px for Coach even when it had
  // collapsed itself to a 44px sliver — the middle column never grew.
  const [coachCollapsed, setCoachCollapsed] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOPICS_COLLAPSED_KEY);
      if (stored === "1") setTopicsCollapsed(true);
      const storedCoach = localStorage.getItem(COACH_COLLAPSED_KEY);
      if (storedCoach === "1") setCoachCollapsed(true);
    } catch {
      /* SSR / disabled storage — fall through */
    }

    // Poll for Coach collapse changes — IntegratedCoachPanel writes to
    // localStorage but doesn't fire an in-tab event we can listen for.
    // Cheap and good enough; same pattern as /study/page.tsx.
    const onStorage = () => {
      try {
        setCoachCollapsed(localStorage.getItem(COACH_COLLAPSED_KEY) === "1");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    const id = setInterval(onStorage, 600);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(id);
    };
  }, []);
  const toggleTopics = () => {
    setTopicsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TOPICS_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const setCoachScope = useCoachStore((s) => s.setScope);
  const recordCoachEvent = useCoachStore((s) => s.recordEvent);

  // Update Coach scope whenever path or step changes
  useEffect(() => {
    setCoachScope({
      pathId,
      stepId: activeStepId ?? undefined,
      examId: path?.exam_id ?? undefined,
    });
  }, [pathId, activeStepId, path, setCoachScope]);

  // Record "started_step" + "viewed" events on step changes
  useEffect(() => {
    if (!activeStepId || !path) return;
    let stepTitle: string | undefined;
    for (const m of path.modules ?? []) {
      for (const s of m.steps ?? []) {
        if (s.id === activeStepId) stepTitle = s.title;
      }
    }
    recordCoachEvent({
      kind: "started_step",
      concept_id: activeStepId,
      concept_name: stepTitle,
    });
  }, [activeStepId, path, recordCoachEvent]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getLearningPath(pathId)
      .then((p) => {
        if (cancelled) return;
        setPath(p);
        // Resume at current_step if set, else first step
        const cur =
          p.progress?.current_step_id ||
          p.modules?.[0]?.steps?.[0]?.id ||
          null;
        setActiveStepId(cur);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }
  if (!path) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        Learning path not found.
      </div>
    );
  }

  const completedSteps: string[] = path.progress?.completed_steps ?? [];
  const completedSet = new Set(completedSteps);
  const totalSteps: number = path.total_steps ?? 0;
  const completedCount = completedSteps.length;
  const overallPct =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Find active step + module
  let activeStep: ReturnType<typeof flattenStep> | null = null;
  for (const m of path.modules ?? []) {
    for (const s of m.steps ?? []) {
      if (s.id === activeStepId) {
        activeStep = flattenStep(s, m);
        break;
      }
    }
    if (activeStep) break;
  }

  const handleStepComplete = async (
    stepId: string,
    quizScorePct?: number
  ) => {
    try {
      const res = await api.completePathStep(pathId, stepId, quizScorePct);
      // Update local state: append to completed_steps, advance to next
      setPath((p: Path) => {
        if (!p) return p;
        return {
          ...p,
          progress: {
            ...p.progress,
            completed_steps: res.completed_steps,
            current_step_id: res.next_step_id,
            completed: res.path_completed,
          },
        };
      });
      if (res.next_step_id) {
        setActiveStepId(res.next_step_id);
      }
    } catch (err) {
      console.error("Failed to mark step complete", err);
      alert("Couldn't save progress. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3">
        <Link
          href="/paths"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />
          All Paths
        </Link>
        <div className="text-right">
          <div className="text-xs text-stone-500 uppercase font-bold tracking-wider">
            Progress
          </div>
          <div className="text-sm font-bold text-stone-900">
            {completedCount} / {totalSteps} steps · {overallPct}%
          </div>
          <div className="mt-1 h-1.5 w-32 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${overallPct}%`,
                background: path.color || "#a855f7",
              }}
            />
          </div>
        </div>
      </div>

      {/* Path header */}
      <div
        className="rounded-xl border-2 p-5 text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${path.color || "#a855f7"}, ${path.color || "#a855f7"}cc)`,
          borderColor: path.color || "#a855f7",
        }}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-90">
          {path.exam_code || path.provider} · {path.difficulty} · ~
          {path.estimated_hours}h
        </div>
        <h1 className="mt-1 text-2xl font-bold">{path.title}</h1>
        <p className="mt-1 text-sm opacity-90">{path.description}</p>
        {path.progress?.completed && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
            <Trophy className="h-4 w-4" />
            Path complete!
          </div>
        )}
      </div>

      {/* Mobile Coach toggle */}
      <button
        onClick={() => setCoachOpenMobile((v) => !v)}
        className="lg:hidden w-full flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-violet-600" />
          {coachOpenMobile ? "Hide Coach" : "Open Coach for this step"}
        </span>
        {coachOpenMobile ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* 3-pane layout: modules | step content | Coach
          Both side panels independently collapse to a slim rail (~40-44px)
          so the middle reader column reclaims the freed horizontal space.
          Toggle states persist in localStorage. */}
      <div
        className={cn(
          "grid gap-4 transition-[grid-template-columns] duration-300",
          // Each side: full when open, slim sliver when collapsed.
          // Middle column is always 1fr → it absorbs whatever's freed up.
          topicsCollapsed && coachCollapsed
            ? "lg:grid-cols-[40px_1fr_44px]"
            : topicsCollapsed
              ? "lg:grid-cols-[40px_1fr_360px] xl:grid-cols-[40px_1fr_400px]"
              : coachCollapsed
                ? "lg:grid-cols-[280px_1fr_44px] xl:grid-cols-[300px_1fr_44px]"
                : "lg:grid-cols-[280px_1fr_360px] xl:grid-cols-[300px_1fr_400px]",
        )}
      >
        {/* Left: modules + steps (collapses to a thin rail with expand button) */}
        {topicsCollapsed ? (
          <aside className="hidden lg:flex lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] flex-col items-center gap-2 py-2">
            <button
              onClick={toggleTopics}
              title="Show topics"
              aria-label="Show topics"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-50 shadow-sm"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div
              className="text-[10px] font-bold uppercase tracking-wider text-stone-400"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Topics
            </div>
          </aside>
        ) : (
          <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto rounded-xl border border-stone-200 bg-white p-3">
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Topics
              </div>
              <button
                onClick={toggleTopics}
                title="Hide topics"
                aria-label="Hide topics"
                className="hidden lg:inline-flex items-center justify-center h-6 w-6 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
            {(path.modules ?? []).map((mod: Module) => (
              <ModuleSection
                key={mod.id}
                module={mod}
                activeStepId={activeStepId}
                completedSet={completedSet}
                onStepClick={setActiveStepId}
              />
            ))}
          </aside>
        )}

        {/* Center: active step */}
        <main className="rounded-xl border border-stone-200 bg-white p-6 min-w-0 space-y-4">
          <CoachInterventionBanner />
          {activeStep ? (
            <StepView
              step={activeStep.step}
              moduleTitle={activeStep.module.title}
              isCompleted={completedSet.has(activeStep.step.id)}
              isLast={activeStep.step.id === lastStepId(path)}
              quizResult={path.progress?.quiz_results?.[activeStep.step.id]}
              onComplete={(quizScore) =>
                handleStepComplete(activeStep!.step.id, quizScore)
              }
              onAskCoach={() => setCoachOpenMobile(true)}
              pathId={pathId}
              pathTitle={path.title}
            />
          ) : (
            <div className="text-center text-stone-500 py-12">
              Pick a step from the left to begin.
            </div>
          )}
        </main>

        {/* Right: Coach (desktop) — same panel as /study, always integrated */}
        <IntegratedCoachPanel
          pathId={pathId}
          pathTitle={path.title}
          examId={path.exam_id ?? undefined}
          stepId={activeStepId ?? undefined}
          stepTitle={activeStep?.step?.title}
          contextHint={
            activeStep?.step?.type === "hands-on"
              ? "Stuck on a command? Ask Coach for the exact syntax."
              : activeStep?.step?.type === "quiz"
              ? "Don't peek — ask Coach to walk you through the reasoning instead."
              : activeStep?.step?.type === "lecture"
              ? "Ask Coach for a concrete real-world example of this concept."
              : "Coach knows your path progress and the current step."
          }
          storageKey="sparkupcloud_path_coach_collapsed"
        />

        {/* Mobile Coach drawer — keeps the existing toggle UX on small screens */}
        {coachOpenMobile && (
          <div className="lg:hidden fixed inset-x-2 bottom-2 top-16 z-30 rounded-xl border border-stone-200 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Coach
              </span>
              <button
                onClick={() => setCoachOpenMobile(false)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <TutorChat
                pathId={pathId}
                pathTitle={path.title}
                examId={path.exam_id ?? undefined}
                stepId={activeStepId ?? undefined}
                stepTitle={activeStep?.step?.title}
                className="h-full border-0 rounded-none shadow-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers + sub-components ────────────────────────────────────────────

interface Step {
  id: string;
  title: string;
  type: "lecture" | "hands-on" | "quiz";
  duration_min?: number;
  summary?: string;
  content_md?: string;
  instructions?: string[];
  checkpoints?: string[];
  questions?: Array<{
    id: string;
    stem: string;
    options: Array<{ id: string; text: string }>;
    correct: string;
    explanation?: string;
  }>;
}

interface Module {
  id: string;
  title: string;
  summary: string;
  steps: Step[];
}

function flattenStep(step: Step, module: Module) {
  return { step, module };
}

function lastStepId(path: Path): string | null {
  const mods = path.modules ?? [];
  const last = mods[mods.length - 1];
  if (!last) return null;
  const steps = last.steps ?? [];
  return steps[steps.length - 1]?.id ?? null;
}

function ModuleSection({
  module: mod,
  activeStepId,
  completedSet,
  onStepClick,
}: {
  module: Module;
  activeStepId: string | null;
  completedSet: Set<string>;
  onStepClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const completedInModule = mod.steps.filter((s) => completedSet.has(s.id))
    .length;
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-stone-100 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-stone-500 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-stone-500 shrink-0" />
        )}
        <span className="flex-1 min-w-0">
          <div className="text-xs font-bold text-stone-900 truncate">
            {mod.title}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {completedInModule} / {mod.steps.length} done
          </div>
        </span>
      </button>
      {open && (
        <div className="ml-4 mt-1 border-l border-stone-200 pl-2">
          {mod.steps.map((s) => {
            const isActive = s.id === activeStepId;
            const isDone = completedSet.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onStepClick(s.id)}
                className={cn(
                  "w-full flex items-start gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors",
                  isActive
                    ? "bg-amber-100 text-amber-900"
                    : "hover:bg-stone-50 text-stone-700"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-stone-300 shrink-0 mt-0.5" />
                )}
                <span className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium leading-snug">
                    {s.title}
                  </div>
                  {s.duration_min && (
                    <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {s.duration_min}m · {s.type}
                    </div>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepView({
  step,
  moduleTitle,
  isCompleted,
  isLast,
  quizResult,
  onComplete,
  onAskCoach,
  pathId,
  pathTitle,
}: {
  step: Step;
  moduleTitle: string;
  isCompleted: boolean;
  isLast: boolean;
  quizResult: { score_pct?: number; correct?: number; total?: number } | undefined;
  onComplete: (quizScore?: number) => void;
  onAskCoach: () => void;
  pathId: string;
  pathTitle: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
        {moduleTitle} · {step.type}
        {step.duration_min ? ` · ~${step.duration_min}m` : ""}
      </div>
      <h2 className="text-2xl font-bold text-stone-900 mb-3">{step.title}</h2>
      {step.summary && (
        <p className="text-sm italic text-stone-600 mb-4">{step.summary}</p>
      )}

      {/* Body */}
      {step.content_md && (
        <div className="prose prose-sm max-w-none text-stone-800 mb-4">
          <Markdown text={step.content_md} />
        </div>
      )}

      {/* Hands-on instructions */}
      {step.instructions && step.instructions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
            Try it on your machine
          </div>
          <ol className="list-decimal ml-5 space-y-1.5 text-sm text-stone-800">
            {step.instructions.map((ins, i) => (
              <li key={i} className="leading-relaxed">
                {ins}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Checkpoints */}
      {step.checkpoints && step.checkpoints.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
            Check yourself before moving on
          </div>
          <ul className="space-y-1.5 text-sm text-stone-800">
            {step.checkpoints.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quiz */}
      {step.type === "quiz" && step.questions && (
        <QuizRunner
          step={step}
          pathId={pathId}
          existingResult={quizResult}
          onPassed={(scorePct) => onComplete(scorePct)}
        />
      )}

      {/* Footer actions */}
      {step.type !== "quiz" && (
        <div className="mt-6 pt-4 border-t border-stone-200 flex flex-wrap items-center gap-3">
          {!isCompleted ? (
            <button
              onClick={() => onComplete()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark step complete
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 text-emerald-800 px-5 py-2.5 text-sm font-bold">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </span>
          )}
          <button
            onClick={onAskCoach}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-sm font-bold lg:hidden"
          >
            <Lightbulb className="h-4 w-4" />
            Ask Coach
          </button>
          <span className="text-xs text-stone-500">
            Path: {pathTitle}
            {isLast && isCompleted && " · You finished the whole path 🎉"}
          </span>
        </div>
      )}
    </div>
  );
}

function QuizRunner({
  step,
  pathId,
  existingResult,
  onPassed,
}: {
  step: Step;
  pathId: string;
  existingResult: { score_pct?: number; correct?: number; total?: number } | undefined;
  onPassed: (scorePct: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{
    question_id: string;
    is_correct: boolean;
    correct: string;
    selected: string | null;
    explanation: string;
  }> | null>(null);
  const [score, setScore] = useState<{ pct: number; correct: number; total: number } | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([qid, sel]) => ({
        question_id: qid,
        selected: sel,
      }));
      const res = await api.submitPathQuiz(pathId, step.id, payload);
      setResults(res.results);
      setScore({ pct: res.score_pct, correct: res.correct, total: res.total });
      if (res.passed) {
        onPassed(res.score_pct);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered =
    step.questions?.every((q) => answers[q.id]) ?? false;

  return (
    <div className="space-y-3">
      {existingResult?.score_pct !== undefined && !results && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-600">
          Your last attempt:{" "}
          <strong className="text-stone-900">
            {existingResult.correct} / {existingResult.total} (
            {existingResult.score_pct}%)
          </strong>
        </div>
      )}

      {step.questions?.map((q, qIdx) => {
        const selected = answers[q.id];
        const result = results?.find((r) => r.question_id === q.id);
        return (
          <div
            key={q.id}
            className="rounded-lg border border-stone-200 bg-white p-4"
          >
            <div className="text-xs font-semibold text-stone-500 mb-1">
              Question {qIdx + 1}
            </div>
            <p className="text-sm font-medium text-stone-900 mb-3">{q.stem}</p>
            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const isSelected = selected === opt.id;
                let cls =
                  "border-stone-200 hover:border-amber-400 hover:bg-amber-50/50";
                let icon = null;
                if (results) {
                  if (opt.id === result?.correct) {
                    cls = "border-emerald-300 bg-emerald-50";
                    icon = (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    );
                  } else if (isSelected && !result?.is_correct) {
                    cls = "border-rose-300 bg-rose-50";
                  } else {
                    cls = "border-stone-200 opacity-70";
                  }
                } else if (isSelected) {
                  cls = "border-amber-400 bg-amber-50";
                }
                return (
                  <button
                    key={opt.id}
                    disabled={!!results}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [q.id]: opt.id }))
                    }
                    className={cn(
                      "w-full text-left rounded-md border-2 px-3 py-2 text-sm flex items-start gap-2 transition-colors",
                      cls
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold",
                        isSelected
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-stone-300 text-stone-500"
                      )}
                    >
                      {opt.id}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {icon}
                  </button>
                );
              })}
            </div>
            {result && result.explanation && (
              <div
                className={cn(
                  "mt-2 rounded p-2 text-xs",
                  result.is_correct
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                )}
              >
                <strong>{result.is_correct ? "✓" : "✗"} </strong>
                {result.explanation}
              </div>
            )}
          </div>
        );
      })}

      {!results ? (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin inline" />
          ) : (
            "Submit Quiz"
          )}
        </button>
      ) : (
        <div className="rounded-lg bg-stone-900 text-white p-4 text-center">
          <div className="text-3xl font-bold">{score?.pct}%</div>
          <div className="text-sm">
            {score?.correct} / {score?.total} correct ·{" "}
            {(score?.pct ?? 0) >= 70 ? (
              <span className="text-emerald-400">PASSED — moving on</span>
            ) : (
              <span className="text-rose-300">Below 70% — review and retry</span>
            )}
          </div>
          {(score?.pct ?? 0) < 70 && (
            <button
              onClick={() => {
                setResults(null);
                setAnswers({});
                setScore(null);
              }}
              className="mt-3 inline-block rounded-md bg-white text-stone-900 px-4 py-1.5 text-xs font-bold"
            >
              Retry quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Same lightweight markdown renderer as the tutor chat — handles
 * **bold**, `inline code`, ```code blocks```, paragraphs, and bullet/ordered lists.
 */
function Markdown({ text }: { text: string }) {
  const renderInline = (str: string, key: number) => {
    const out: React.ReactNode[] = [];
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    parts.forEach((tok, i) => {
      if (!tok) return;
      if (tok.startsWith("**")) {
        out.push(
          <strong key={`b-${key}-${i}`} className="font-bold text-stone-900">
            {tok.slice(2, -2)}
          </strong>
        );
      } else if (tok.startsWith("`")) {
        out.push(
          <code
            key={`c-${key}-${i}`}
            className="rounded bg-stone-100 text-stone-900 px-1 py-0.5 text-[0.9em] font-mono"
          >
            {tok.slice(1, -1)}
          </code>
        );
      } else {
        out.push(<span key={`s-${key}-${i}`}>{tok}</span>);
      }
    });
    return out;
  };

  const blocks: React.ReactNode[] = [];
  const sections: Array<{ kind: "code" | "text"; content: string }> = [];
  const fenceRe = /```(?:[\w-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    if (m.index > last)
      sections.push({ kind: "text", content: text.slice(last, m.index) });
    sections.push({ kind: "code", content: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length)
    sections.push({ kind: "text", content: text.slice(last) });

  // Capture optional language tag from the fence (```bash\n...```).
  // We re-scan because the section captures don't preserve it.
  const langs = Array.from(text.matchAll(/```([\w-]*)\n?[\s\S]*?```/g)).map(
    (m) => m[1] || undefined,
  );
  let codeIdx = 0;

  sections.forEach((section, sIdx) => {
    if (section.kind === "code") {
      const lang = langs[codeIdx++];
      const code = section.content.replace(/\n$/, "");
      // Mermaid fences render as actual diagrams instead of code blocks.
      if (lang === "mermaid") {
        blocks.push(<MermaidDiagram key={`mmd-${sIdx}`} source={code} />);
        return;
      }
      blocks.push(
        <CodeBlock
          key={`code-${sIdx}`}
          code={code}
          language={lang}
        />
      );
      return;
    }
    const lines = section.content.split("\n");
    let listBuf: string[] = [];
    const flushList = () => {
      if (!listBuf.length) return;
      blocks.push(
        <ul
          key={`ul-${sIdx}-${blocks.length}`}
          className="list-disc ml-5 my-2 space-y-1"
        >
          {listBuf.map((it, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(it, i)}
            </li>
          ))}
        </ul>
      );
      listBuf = [];
    };
    lines.forEach((line, i) => {
      const stripped = line.trimEnd();
      if (/^##\s+/.test(stripped)) {
        flushList();
        blocks.push(
          <h3
            key={`h3-${sIdx}-${i}`}
            className="text-base font-bold text-stone-900 mt-3 mb-1"
          >
            {stripped.replace(/^##\s+/, "")}
          </h3>
        );
      } else if (/^[-*]\s+/.test(stripped)) {
        listBuf.push(stripped.replace(/^[-*]\s+/, ""));
      } else if (stripped.startsWith(">")) {
        flushList();
        blocks.push(
          <blockquote
            key={`bq-${sIdx}-${i}`}
            className="border-l-4 border-amber-400 bg-amber-50 px-3 py-1.5 italic text-sm text-stone-700 my-2"
          >
            {renderInline(stripped.replace(/^>\s*/, ""), i)}
          </blockquote>
        );
      } else if (stripped) {
        flushList();
        blocks.push(
          <p key={`p-${sIdx}-${i}`} className="text-sm leading-relaxed my-1.5">
            {renderInline(stripped, i)}
          </p>
        );
      }
    });
    flushList();
  });

  return <div className="space-y-1">{blocks}</div>;
}
