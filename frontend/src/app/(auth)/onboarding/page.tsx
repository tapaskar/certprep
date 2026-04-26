"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  Exam,
  DiagnosticQuestion,
  DiagnosticSubmitResponse,
} from "@/lib/api-types";
import { ExamPicker } from "@/components/onboarding/exam-picker";
import { PreferencesForm } from "@/components/onboarding/preferences-form";
import { DiagnosticQuiz } from "@/components/onboarding/diagnostic-quiz";
import { DiagnosticResults } from "@/components/onboarding/diagnostic-results";

type Step = "exam" | "preferences" | "diagnostic" | "results";

const stepLabels: { key: Step; label: string }[] = [
  { key: "exam", label: "Exam" },
  { key: "preferences", label: "Preferences" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "results", label: "Results" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<Step>("exam");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // ?exam=<id> in the URL — pre-fill the selection and jump straight to
  // preferences. Used by the "Start preparing" CTA on /exam/[examId].
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const examId = params.get("exam");
    if (!examId) return;
    api
      .getExams()
      .then((exams) => {
        const match = exams.find((e) => e.id === examId);
        if (match) {
          setSelectedExam(match);
          setCurrentStep("preferences");
        }
      })
      .catch(() => {
        /* fall through — user can still pick manually */
      });
  }, []);
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<
    DiagnosticQuestion[]
  >([]);
  const [diagnosticResult, setDiagnosticSubmitResponse] =
    useState<DiagnosticSubmitResponse | null>(null);
  const [diagnosticId, setDiagnosticId] = useState<string>("");

  const currentStepIndex = stepLabels.findIndex((s) => s.key === currentStep);

  const handleExamSelect = (exam: Exam) => {
    setSelectedExam(exam);
  };

  const handleExamContinue = () => {
    if (selectedExam) setCurrentStep("preferences");
  };

  const [error, setError] = useState<string | null>(null);

  const handlePreferences = async (prefs: {
    examDate: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
    dailyStudyMinutes: number;
  }) => {
    if (!selectedExam) return;
    setError(null);
    try {
      await api.startOnboarding({
        exam_id: selectedExam.id,
        exam_date: prefs.examDate || null,
        experience_level: prefs.experienceLevel,
        daily_study_minutes: prefs.dailyStudyMinutes,
      });
    } catch (err) {
      // 409 = already enrolled — skip to diagnostic or dashboard
      if (err instanceof Error && err.message.includes("409")) {
        // Already enrolled, try starting diagnostic directly
        try {
          const data = await api.startDiagnostic();
          setDiagnosticId(data.diagnostic_id);
          setDiagnosticQuestions(data.questions);
          setCurrentStep("diagnostic");
          return;
        } catch {
          // Diagnostic already done too — go to dashboard
          window.location.href = "/dashboard";
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      return;
    }
    const data = await api.startDiagnostic();
    setDiagnosticId(data.diagnostic_id);
    setDiagnosticQuestions(data.questions);
    setCurrentStep("diagnostic");
  };

  const handleDiagnosticComplete = async (
    answers: { question_id: string; selected_option: string; time_seconds: number }[]
  ) => {
    if (!selectedExam || !diagnosticId) return;
    const result = await api.submitDiagnostic(diagnosticId, answers);
    setDiagnosticSubmitResponse(result);
    setCurrentStep("results");
  };

  return (
    <div className="px-4 py-10">
      {/* Step indicator */}
      <div className="mx-auto mb-10 flex max-w-md items-center justify-center">
        {stepLabels.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  i <= currentStepIndex
                    ? "bg-amber-500 text-white"
                    : "bg-stone-200 text-stone-400"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-xs",
                  i <= currentStepIndex ? "text-amber-600" : "text-stone-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-12 sm:w-20",
                  i < currentStepIndex ? "bg-amber-500" : "bg-stone-300"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-auto mb-6 max-w-2xl rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="mx-auto max-w-2xl">
        {currentStep === "exam" && (
          <div className="space-y-6">
            <ExamPicker
              selectedExamId={selectedExam?.id ?? null}
              onSelect={handleExamSelect}
            />
            {selectedExam && (
              <button
                onClick={handleExamContinue}
                className="w-full rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-400"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {currentStep === "preferences" && (
          <PreferencesForm onSubmit={handlePreferences} />
        )}

        {currentStep === "diagnostic" && diagnosticQuestions.length > 0 && (
          <DiagnosticQuiz
            questions={diagnosticQuestions}
            onComplete={handleDiagnosticComplete}
          />
        )}

        {currentStep === "results" && diagnosticResult && (
          <DiagnosticResults result={diagnosticResult} />
        )}
      </div>
    </div>
  );
}
