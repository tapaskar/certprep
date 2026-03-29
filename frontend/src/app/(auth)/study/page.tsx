"use client";

import { useEffect, useCallback } from "react";
import { useStudyStore } from "@/stores/study-store";
import { SessionPlan } from "@/components/study/session-plan";
import { ConceptLearn } from "@/components/study/concept-learn";
import { QuestionCard } from "@/components/study/question-card";
import { ConfidenceSelector } from "@/components/study/confidence-selector";
import { AnswerFeedback } from "@/components/study/answer-feedback";
import { SessionSummary } from "@/components/study/session-summary";
import { CheatSheet } from "@/components/study/cheat-sheet";

export default function StudyPage() {
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
    tick,
  } = useStudyStore();

  const currentQuestion = questions[currentIndex] || null;
  const totalQuestions = questions.length;

  // Find the concept for the current question
  const currentQuestionConceptId = currentQuestion?.concept_ids?.[0];
  const currentQuestionConcept = currentQuestionConceptId
    ? conceptDetails.find((c) => c.concept.id === currentQuestionConceptId)
    : null;

  // For learning phase, show the first concept (all are studied sequentially)
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

  // Phase: idle
  if (phase === "idle") {
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
        {/* Concept context banner */}
        {currentQuestionConcept && (
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
