"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export interface StudyEvent {
  kind:
    | "answered"
    | "viewed"
    | "idle"
    | "started_step"
    | "completed_step"
    | "submitted_quiz"
    | "fact_reviewed";
  concept_id?: string;
  concept_name?: string;
  is_correct?: boolean;
  confidence?: number;
  time_seconds?: number;
}

export interface CoachIntervention {
  type: "nudge" | "intervene" | "celebrate" | "takeover_offer";
  title: string;
  message: string;
  action_label: string | null;
  seed_question: string | null;
  concept_id: string | null;
}

interface CoachStore {
  /** Current scope context (so the side panel knows which conversation to load) */
  examId?: string;
  pathId?: string;
  stepId?: string;
  conceptId?: string;

  /** Sliding window of recent events (last 20) */
  events: StudyEvent[];

  /** Active intervention waiting for user acceptance */
  pendingIntervention: CoachIntervention | null;

  /** Whether the side-panel chat is open */
  panelOpen: boolean;
  /** Optional seeded message to send when the panel opens */
  seedMessage: string | null;

  /** Last time we asked the backend for an intervention (debounce) */
  _lastObserveTs: number;

  // ── Actions ──
  setScope: (s: {
    examId?: string;
    pathId?: string;
    stepId?: string;
    conceptId?: string;
  }) => void;
  recordEvent: (event: StudyEvent) => void;
  observe: () => Promise<void>;
  acceptIntervention: () => void;
  dismissIntervention: () => void;
  openPanel: (seed?: string) => void;
  closePanel: () => void;
  reset: () => void;
}

const MAX_EVENTS = 20;
const MIN_OBSERVE_INTERVAL_MS = 4000; // Don't ping the backend more than once every 4s

export const useCoachStore = create<CoachStore>((set, get) => ({
  examId: undefined,
  pathId: undefined,
  stepId: undefined,
  conceptId: undefined,
  events: [],
  pendingIntervention: null,
  panelOpen: false,
  seedMessage: null,
  _lastObserveTs: 0,

  setScope: (s) => {
    set((prev) => ({
      examId: s.examId ?? prev.examId,
      pathId: s.pathId ?? prev.pathId,
      stepId: s.stepId ?? prev.stepId,
      conceptId: s.conceptId ?? prev.conceptId,
    }));
  },

  recordEvent: (event) => {
    set((state) => {
      const events = [...state.events, event].slice(-MAX_EVENTS);
      return { events };
    });
    // Try to observe shortly after — debounced inside observe()
    setTimeout(() => {
      get().observe().catch(() => {});
    }, 600);
  },

  observe: async () => {
    const state = get();
    const now = Date.now();
    if (now - state._lastObserveTs < MIN_OBSERVE_INTERVAL_MS) return;
    if (state.events.length === 0) return;
    // Skip if there's already a pending intervention the user hasn't acted on
    if (state.pendingIntervention) return;
    set({ _lastObserveTs: now });

    try {
      const resp = await api.coachObserve({
        events: state.events,
        ...(state.examId ? { exam_id: state.examId } : {}),
        ...(state.pathId ? { path_id: state.pathId } : {}),
        ...(state.stepId ? { step_id: state.stepId } : {}),
      });
      if (resp.intervention) {
        set({ pendingIntervention: resp.intervention });
      }
    } catch {
      // Silently swallow — observation failures should never disturb the user
    }
  },

  acceptIntervention: () => {
    const intv = get().pendingIntervention;
    if (!intv) return;
    set({
      panelOpen: true,
      seedMessage: intv.seed_question ?? null,
      pendingIntervention: null,
    });
  },

  dismissIntervention: () => set({ pendingIntervention: null }),

  openPanel: (seed) => set({ panelOpen: true, seedMessage: seed ?? null }),
  closePanel: () => set({ panelOpen: false, seedMessage: null }),

  reset: () =>
    set({
      events: [],
      pendingIntervention: null,
      _lastObserveTs: 0,
    }),
}));
