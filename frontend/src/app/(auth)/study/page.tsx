"use client";

import { Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useStudyStore } from "@/stores/study-store";
import { SessionPlan } from "@/components/study/session-plan";
import { ConceptLearn } from "@/components/study/concept-learn";
import { QuestionCard } from "@/components/study/question-card";
import { ConfidenceSelector } from "@/components/study/confidence-selector";
import { AnswerFeedback } from "@/components/study/answer-feedback";
import { SessionSummary } from "@/components/study/session-summary";
import { CheatSheet } from "@/components/study/cheat-sheet";

const EXAM_ID = "aws-sap-c02";

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
  const urlMode = searchParams.get("mode"); // "review", "mock", or null

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

  // Auto-start session if URL has ?mode=review or ?mode=mock
  useEffect(() => {
    if (phase !== "idle" || isLoading) return;
    if (urlMode === "review") {
      setMode("quick_quiz");
      createSession(EXAM_ID, 15);
    } else if (urlMode === "mock") {
      setMode("quick_quiz");
      createSession(EXAM_ID, 60);
    }
  }, [urlMode, phase, isLoading, setMode, createSession]);

  const currentQuestion = questions[currentIndex] || null;
  const totalQuestions = questions.length;

  // Find the concept for the current question
  const currentQuestionConceptId = currentQuestion?.concept_ids?.[0];
  const currentQuestionConcept = currentQuestionConceptId
    ? conceptDetails.find((c) => c.concept.id === currentQuestionConceptId)
    : null;

  // For learning phase, show the first concept
  const learningConcept = conceptDetails[0] || null;

  // Timer tick
  useEffect(() => {
    if (phase !== "answering") return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);

  // Keyboard shortcuts
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

  // Phase: idle — show mode selector (unless URL mode is triggering auto-start)
  if (phase === "idle") {
    if (urlMode === "review" || urlMode === "mock") {
      // Loading — auto-start in progress
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
          <p className="text-sm text-stone-500">
            {urlMode === "review" ? "Loading review queue..." : "Preparing mock exam..."}
          </p>
        </div>
      );
    }
    return <SessionPlan />;
  }

  // Phase: learning
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

  // Phase: answering
  if (phase === "answering" && currentQuestion) {
    return (
      <div className="space-y-4">
        {/* Session type banner */}
        {urlMode === "mock" && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
            Mock Exam — {totalQuestions} questions
          </div>
        )}
        {urlMode === "review" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Review Queue — Spaced Repetition
          </div>
        )}

        {/* Concept context banner */}
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

        {/* Collapsible cheat sheet during quiz */}
        {currentQuestionConcept && (
          <CheatSheet concept={currentQuestionConcept} collapsible />
        )}
      </div>
    );
  }

  // Phase: feedback
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

  // Phase: summary
  if (phase === "summary" && sessionSummary) {
    return <SessionSummary summary={sessionSummary} />;
  }

  return null;
}
