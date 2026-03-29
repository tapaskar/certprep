import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  Question,
  AnswerResult,
  SessionSummary,
  ConceptDetail,
} from "@/lib/api-types";

export type StudyPhase = "idle" | "learning" | "answering" | "feedback" | "summary";
export type StudyMode = "learn_practice" | "quick_quiz";

interface StudyState {
  // Session
  phase: StudyPhase;
  sessionId: string | null;
  questions: Question[];
  currentIndex: number;
  answerResult: AnswerResult | null;
  sessionSummary: SessionSummary | null;
  selectedOption: string | null;
  timerSeconds: number;
  isLoading: boolean;

  // Learning phase
  mode: StudyMode;
  conceptDetails: ConceptDetail[];
  currentConceptIndex: number;
  factsChecked: Set<number>;

  // Gamification
  xpEarned: number;

  // Actions
  setMode: (mode: StudyMode) => void;
  createSession: (examId: string, durationMinutes: number) => Promise<void>;
  markFactLearned: (index: number) => void;
  startQuiz: () => void;
  selectOption: (option: string) => void;
  submitAnswer: (confidence: number) => Promise<void>;
  nextQuestion: () => void;
  endSession: () => Promise<void>;
  resetSession: () => void;
  tick: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  phase: "idle",
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answerResult: null,
  sessionSummary: null,
  selectedOption: null,
  timerSeconds: 0,
  isLoading: false,

  mode: "learn_practice",
  conceptDetails: [],
  currentConceptIndex: 0,
  factsChecked: new Set<number>(),

  xpEarned: 0,

  setMode: (mode) => {
    set({ mode });
  },

  createSession: async (examId, durationMinutes) => {
    set({ isLoading: true });
    try {
      const data = await api.createSession(examId, durationMinutes);
      const questions = data.plan.questions.map((q) => ({
        id: q.question_id || q.id,
        stem: q.stem,
        options: q.options,
        concept_ids: q.concept_ids,
      }));

      // Extract unique concept IDs from all questions
      const conceptIdSet = new Set<string>();
      for (const q of questions) {
        if (q.concept_ids) {
          for (const cid of q.concept_ids) {
            conceptIdSet.add(cid);
          }
        }
      }

      // Fetch concept details in parallel
      const conceptIds = Array.from(conceptIdSet);
      const conceptDetails = await Promise.all(
        conceptIds.map((cid) =>
          api.getConceptDetail(examId, cid).catch(() => null)
        )
      );
      const validConcepts = conceptDetails.filter(
        (c): c is ConceptDetail => c !== null
      );

      const { mode } = get();

      set({
        sessionId: data.session_id,
        questions,
        currentIndex: 0,
        conceptDetails: validConcepts,
        currentConceptIndex: 0,
        factsChecked: new Set<number>(),
        xpEarned: 0,
        phase: mode === "learn_practice" && validConcepts.length > 0 ? "learning" : "answering",
        timerSeconds: 0,
        selectedOption: null,
        answerResult: null,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  markFactLearned: (index) => {
    const { factsChecked } = get();
    const next = new Set(factsChecked);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    set({ factsChecked: next });
  },

  startQuiz: () => {
    const { conceptDetails } = get();
    // +10 XP per concept studied
    const conceptXp = conceptDetails.length * 10;
    set((s) => ({
      phase: "answering",
      timerSeconds: 0,
      selectedOption: null,
      xpEarned: s.xpEarned + conceptXp,
    }));
  },

  selectOption: (option) => {
    set({ selectedOption: option });
  },

  submitAnswer: async (confidence) => {
    const { sessionId, questions, currentIndex, selectedOption, timerSeconds } = get();
    if (!sessionId || !selectedOption) return;
    const question = questions[currentIndex];
    if (!question) return;

    set({ isLoading: true });
    try {
      const result = await api.submitAnswer(
        sessionId,
        question.id,
        selectedOption,
        timerSeconds,
        confidence
      );

      // XP: +5 correct, +8 correct with high confidence
      let xpGain = 0;
      if (result.correct) {
        xpGain = confidence >= 4 ? 8 : 5;
      }

      set((s) => ({
        answerResult: result,
        phase: "feedback",
        isLoading: false,
        xpEarned: s.xpEarned + xpGain,
      }));
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex + 1 >= questions.length) {
      get().endSession();
      return;
    }
    set({
      currentIndex: currentIndex + 1,
      answerResult: null,
      selectedOption: null,
      phase: "answering",
      timerSeconds: 0,
    });
  },

  endSession: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    set({ isLoading: true });
    try {
      const data = await api.endSession(sessionId);
      // +20 XP for completion
      set((s) => ({
        sessionSummary: data.summary,
        phase: "summary",
        isLoading: false,
        xpEarned: s.xpEarned + 20,
      }));
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  resetSession: () => {
    set({
      phase: "idle",
      sessionId: null,
      questions: [],
      currentIndex: 0,
      answerResult: null,
      sessionSummary: null,
      selectedOption: null,
      timerSeconds: 0,
      isLoading: false,
      conceptDetails: [],
      currentConceptIndex: 0,
      factsChecked: new Set<number>(),
      xpEarned: 0,
    });
  },

  tick: () => {
    set((s) => ({ timerSeconds: s.timerSeconds + 1 }));
  },
}));
