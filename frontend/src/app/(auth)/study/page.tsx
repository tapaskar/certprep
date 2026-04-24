"use client";

import { Suspense, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStudyStore } from "@/stores/study-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCoachStore } from "@/stores/coach-store";
import { SessionPlan } from "@/components/study/session-plan";
import { ConceptLearn } from "@/components/study/concept-learn";
import { QuestionCard } from "@/components/study/question-card";
import { ConfidenceSelector } from "@/components/study/confidence-selector";
import { AnswerFeedback } from "@/components/study/answer-feedback";
import { SessionSummary } from "@/components/study/session-summary";
import { CheatSheet } from "@/components/study/cheat-sheet";
import { CoachInterventionBanner } from "@/components/tutor/coach-intervention-banner";

export default function StudyPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    }>
      <StudyPageInner />
    </Suspense>
  );
}

function StudyPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlMode = searchParams.get("mode");
  const examId = useAuthStore((s) => s.user?.active_exam_id);

  const {
    phase,
    questions,
    currentIndex,
    answerResult,
    sessionSummary,
    selectedOption,
    timerSeconds,
    conceptDetails,
    factsChecked,
    selectOption,
    submitAnswer,
    nextQuestion,
    markFactLearned,
    startQuiz,
    setMode,
    createSession,
    isLoading,
    tick,
  } = useStudyStore();

  // Auto-start a short review session if URL has ?mode=review.
  // Real mock exams use the dedicated /mock-exam route (different backend
  // endpoints, timer, flagging, pass/fail scoring). The old ?mode=mock
  // branch here was misleading — it just ran a 60-minute study session.
  // Users arriving here with ?mode=mock are redirected to the right route.
  useEffect(() => {
    if (phase !== "idle" || isLoading || !examId) return;
    if (urlMode === "review") {
      setMode("quick_quiz");
      createSession(examId, 15);
    } else if (urlMode === "mock") {
      router.replace("/mock-exam");
    }
  }, [urlMode, phase, isLoading, examId, setMode, createSession, router]);

  const currentQuestion = questions[currentIndex] || null;
  const totalQuestions = questions.length;

  const currentQuestionConceptId = currentQuestion?.concept_ids?.[0];
  const currentQuestionConcept = currentQuestionConceptId
    ? conceptDetails.find((c) => c.concept.id === currentQuestionConceptId)
    : null;

  const learningConcept = conceptDetails[0] || null;

  useEffect(() => {
    if (phase !== "answering") return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);

  // ── Coach scope wiring ──
  const setCoachScope = useCoachStore((s) => s.setScope);
  const recordCoachEvent = useCoachStore((s) => s.recordEvent);
  const resetCoach = useCoachStore((s) => s.reset);

  useEffect(() => {
    setCoachScope({
      examId: examId ?? undefined,
      conceptId: currentQuestionConceptId ?? undefined,
      pathId: undefined,
      stepId: undefined,
    });
  }, [examId, currentQuestionConceptId, setCoachScope]);

  useEffect(() => {
    // New session starts → wipe Coach event window
    if (phase === "idle") resetCoach();
  }, [phase, resetCoach]);

  // Detect when an answer was just submitted: feedback phase fires once.
  const lastFeedbackKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "feedback" || !currentQuestion || !answerResult) return;
    const key = `${currentQuestion.id}-${selectedOption}`;
    if (lastFeedbackKeyRef.current === key) return;
    lastFeedbackKeyRef.current = key;
    recordCoachEvent({
      kind: "answered",
      concept_id: currentQuestionConceptId,
      concept_name: currentQuestionConcept?.concept.name,
      is_correct: !!answerResult.correct,
      time_seconds: timerSeconds,
    });
  }, [
    phase,
    currentQuestion,
    answerResult,
    selectedOption,
    currentQuestionConceptId,
    currentQuestionConcept,
    timerSeconds,
    recordCoachEvent,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== "answering" || !currentQuestion) return;
      const keyMap: Record<string, string> = {
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
      };
      const optionId = keyMap[e.key];
      if (optionId) {
        selectOption(optionId);
      }
    },
    [phase, currentQuestion, selectOption]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Phase-driven content. The persistent sidebar lives in the layout.
  if (phase === "idle") {
    if (urlMode === "review" || urlMode === "mock") {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
          <p className="text-sm text-stone-500">
            {urlMode === "review"
              ? "Loading review queue..."
              : "Redirecting to Mock Exams..."}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            Start a study session
          </h1>
          <p className="text-sm text-stone-600 mb-4">
            Browse the exam structure on the left to focus on a specific
            concept or domain, or start an adaptive session below — our AI
            will pick what you need to study next.
          </p>
        </div>
        <SessionPlan />
      </div>
    );
  }

  if (phase === "learning" && learningConcept) {
    return (
      <ConceptLearn
        concept={learningConcept}
        factsChecked={factsChecked}
        onFactCheck={markFactLearned}
        onReady={startQuiz}
        onSkip={startQuiz}
      />
    );
  }

  if (phase === "answering" && currentQuestion) {
    return (
      <div className="space-y-4">
        <CoachInterventionBanner />
        {urlMode === "review" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Review Queue — Spaced Repetition
          </div>
        )}
        {currentQuestionConcept && !urlMode && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Testing: <strong>{currentQuestionConcept.concept.name}</strong>
          </div>
        )}

        <QuestionCard
          question={currentQuestion}
          selectedOption={selectedOption}
          onSelect={selectOption}
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
          timerSeconds={timerSeconds}
        />

        {selectedOption && <ConfidenceSelector onSelect={submitAnswer} />}

        {currentQuestionConcept && (
          <CheatSheet concept={currentQuestionConcept} collapsible />
        )}
      </div>
    );
  }

  if (phase === "feedback" && currentQuestion && answerResult && selectedOption) {
    return (
      <AnswerFeedback
        question={currentQuestion}
        selectedOption={selectedOption}
        result={answerResult}
        onNext={nextQuestion}
      />
    );
  }

  if (phase === "summary" && sessionSummary) {
    return <SessionSummary summary={sessionSummary} />;
  }

  return null;
}
