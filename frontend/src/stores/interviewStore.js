/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — INTERVIEW STORE (V2)
 *  Global state management for the interview session.
 *  Includes agent states, TTS state, biometric telemetry,
 *  and session configuration.
 * ═══════════════════════════════════════════════════════════
 */
import { create } from "zustand"

const useInterviewStore = create((set, get) => ({
  // ── Agent States ────────────────────────────────────
  activeAgent: null,
  agentStates: {
    architect: "idle",
    observer: "idle",
    manager: "idle",
  },

  // ── TTS State ───────────────────────────────────────
  isSpeaking: false,
  currentSpeaker: null,

  // ── Interview Phase ─────────────────────────────────
  phase: "opening",

  // ── Session Config ──────────────────────────────────
  demoMode: false,
  questionCount: 5,

  // ── Biometric Telemetry ─────────────────────────────
  expressionLog: [],      // Array of { t, questionIndex, emotion, confidence }
  postureLog: [],         // Array of { t, questionIndex, angle, score, status }

  // ── Actions ─────────────────────────────────────────
  setPhase: (phase) => set({ phase }),

  // Session config setters
  setDemoMode: (demoMode) => set({ demoMode }),
  setQuestionCount: (questionCount) => set({ questionCount }),

  // Agent state management
  setAgentState: (agent, state) =>
    set((s) => ({
      agentStates: { ...s.agentStates, [agent]: state },
    })),

  setAgentTalking: (agent) =>
    set((s) => ({
      activeAgent: agent,
      currentSpeaker: agent,
      isSpeaking: true,
      agentStates: {
        ...s.agentStates,
        architect: agent === "architect" ? "talking" : "idle",
        observer: agent === "observer" ? "talking" : "idle",
        manager: agent === "manager" ? "talking" : "idle",
      },
    })),

  setAgentThinking: (agent) =>
    set((s) => ({
      activeAgent: agent,
      agentStates: { ...s.agentStates, [agent]: "thinking" },
    })),

  setAllThinking: () =>
    set({
      activeAgent: null,
      agentStates: {
        architect: "thinking",
        observer: "thinking",
        manager: "thinking",
      },
    }),

  setAllIdle: () =>
    set({
      activeAgent: null,
      currentSpeaker: null,
      isSpeaking: false,
      agentStates: {
        architect: "idle",
        observer: "idle",
        manager: "idle",
      },
    }),

  triggerNod: (agent) => {
    set((s) => ({
      agentStates: { ...s.agentStates, [agent]: "nodding" },
    }))
    setTimeout(() => {
      set((s) => ({
        agentStates: { ...s.agentStates, [agent]: "idle" },
      }))
    }, 1200)
  },

  stopSpeaking: () =>
    set({ isSpeaking: false, currentSpeaker: null }),

  // ── Biometric Logging ───────────────────────────────
  logExpression: (entry) =>
    set((s) => ({
      expressionLog: [...s.expressionLog, {
        t: Date.now(),
        ...entry,
      }],
    })),

  logPosture: (entry) =>
    set((s) => ({
      postureLog: [...s.postureLog, {
        t: Date.now(),
        ...entry,
      }],
    })),

  // Get all biometric data for mentor analysis
  getBiometricData: () => {
    const state = get()
    return {
      expressions: state.expressionLog,
      posture: state.postureLog,
    }
  },

  // Reset biometric data for new session
  resetBiometrics: () =>
    set({
      expressionLog: [],
      postureLog: [],
    }),

  // Full session reset
  resetSession: () =>
    set({
      activeAgent: null,
      agentStates: { architect: "idle", observer: "idle", manager: "idle" },
      isSpeaking: false,
      currentSpeaker: null,
      phase: "opening",
      expressionLog: [],
      postureLog: [],
    }),
}))

export default useInterviewStore
