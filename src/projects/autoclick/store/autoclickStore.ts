import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AutoClickTab,
  MouseButton,
  ClickType,
  ClickMode,
  PositionMode,
  RepeatMode,
  ClickPoint,
  AutomationAction,
  AutoClickProfile,
  HistoryEntry,
  DeveloperDiagnostics,
  KeyClickerConfig,
} from "../types";
import { InputService } from "@/core/services/automation/InputService";

/** Bumped by stop/emergency so a pending start countdown gives up instead of starting late. */
let countdownToken = 0;

/** Quick click must not inherit the multi-point list, or a fixed coordinate is never used. */
export function autoclickRunMode(tab: string): "quick" | "multipoint" | "timeline" {
  if (tab === "multipoint") return "multipoint";
  if (tab === "builder") return "timeline";
  return "quick";
}

export const AUTOCLICK_SCHEMA_VERSION = 1;

export const AUTOCLICK_PRESETS: Partial<AutoClickProfile>[] = [
  {
    name: "Normal (10 CPS)",
    description: "Equilíbrio perfeito para cliques constantes e suaves",
    cps: 10,
    intervalMs: 100,
    mouseButton: "left",
    clickType: "single",
    clickMode: "fixed",
  },
  {
    name: "Rápido (20 CPS)",
    description: "Ideal para minigames e cliques ágeis sem sobrecarregar",
    cps: 20,
    intervalMs: 50,
    mouseButton: "left",
    clickType: "single",
    clickMode: "fixed",
  },
  {
    name: "Ultra (50 CPS)",
    description: "Máxima frequência com temporização de alta precisão",
    cps: 50,
    intervalMs: 20,
    mouseButton: "left",
    clickType: "single",
    clickMode: "fixed",
  },
  {
    name: "Clique Lento (1 CPS)",
    description: "1 clique a cada segundo para automações cadenciadas",
    cps: 1,
    intervalMs: 1000,
    mouseButton: "left",
    clickType: "single",
    clickMode: "fixed",
  },
  {
    name: "Duplo Clique Automático",
    description: "Executa double click a cada 200 milissegundos",
    cps: 5,
    intervalMs: 200,
    mouseButton: "left",
    clickType: "double",
    clickMode: "fixed",
  },
  {
    name: "Segurar Botão (Hold)",
    description: "Mantém o botão esquerdo pressionado continuamente",
    cps: 1,
    intervalMs: 1000,
    mouseButton: "left",
    clickType: "hold",
    clickMode: "fixed",
  },
];

interface AutoClickState {
  activeTab: AutoClickTab;
  setActiveTab: (tab: AutoClickTab) => void;

  // Active configuration
  clickMode: ClickMode;
  setClickMode: (mode: ClickMode) => void;
  intervalMs: number;
  setIntervalMs: (ms: number) => void;
  cps: number;
  setCps: (cps: number) => void;
  minIntervalMs: number;
  maxIntervalMs: number;
  setIntervalRange: (min: number, max: number) => void;
  jitterMs: number;
  setJitterMs: (j: number) => void;
  minCps: number;
  maxCps: number;
  setCpsRange: (min: number, max: number) => void;

  mouseButton: MouseButton;
  setMouseButton: (btn: MouseButton) => void;
  clickType: ClickType;
  setClickType: (type: ClickType) => void;

  positionMode: PositionMode;
  setPositionMode: (mode: PositionMode) => void;
  fixedX: number;
  fixedY: number;
  setFixedPosition: (x: number, y: number) => void;

  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  repeatCount: number;
  setRepeatCount: (cnt: number) => void;
  repeatDurationSeconds: number;
  setRepeatDurationSeconds: (dur: number) => void;

  startDelaySeconds: number;
  setStartDelaySeconds: (sec: number) => void;

  // Multi-point list
  multiPoints: ClickPoint[];
  addPoint: (pt: Omit<ClickPoint, "id">) => void;
  updatePoint: (id: string, updates: Partial<ClickPoint>) => void;
  removePoint: (id: string) => void;
  reorderPoints: (points: ClickPoint[]) => void;

  // Timeline actions & undo/redo
  timelineActions: AutomationAction[];
  timelineHistory: AutomationAction[][];
  timelineHistoryIndex: number;
  addAction: (action: Omit<AutomationAction, "id">) => void;
  updateAction: (id: string, updates: Partial<AutomationAction>) => void;
  removeAction: (id: string) => void;
  undoTimeline: () => void;
  redoTimeline: () => void;

  // Key clickers
  keyClickers: KeyClickerConfig[];
  addKeyClicker: (kc: KeyClickerConfig) => void;
  removeKeyClicker: (index: number) => void;

  // Hotkeys & Failsafes
  hotkeyStartStop: string;
  hotkeyEmergencyStop: string;
  hotkeyPickPosition: string;
  setHotkeys: (updates: { startStop?: string; emergency?: string; pick?: string }) => void;
  cornerFailsafe: boolean;
  setCornerFailsafe: (enabled: boolean) => void;
  simulationMode: boolean;
  setSimulationMode: (enabled: boolean) => void;

  // Execution runtime status
  isRunning: boolean;
  isPaused: boolean;
  sessionClicks: number;
  totalLifetimeClicks: number;
  realCps: number;
  elapsedSeconds: number;
  statusMessage: string;
  timerDriftMs: number;
  countdownSeconds: number | null;

  // Profiles
  profiles: AutoClickProfile[];
  activeProfileId: string | null;
  saveCurrentAsProfile: (name: string, description?: string) => void;
  loadProfile: (profile: AutoClickProfile) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  applyPreset: (preset: Partial<AutoClickProfile>) => void;

  // History
  history: HistoryEntry[];
  addHistoryEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;

  // Diagnostics
  diagnostics: DeveloperDiagnostics;

  // Execution controls
  startAutoClick: () => Promise<void>;
  stopAutoClick: (reason?: string) => Promise<void>;
  pauseAutoClick: () => Promise<void>;
  resumeAutoClick: () => Promise<void>;
  emergencyStop: () => Promise<void>;
}

export const useAutoClickStore = create<AutoClickState>()(
  persist(
    (set, get) => ({
      activeTab: "quick",
      setActiveTab: (tab) => set({ activeTab: tab }),

      clickMode: "fixed",
      setClickMode: (mode) => set({ clickMode: mode }),

      intervalMs: 100,
      cps: 10,
      setIntervalMs: (ms) => {
        const safeMs = Math.max(1, ms);
        const calcCps = Math.round((1000 / safeMs) * 10) / 10;
        set({ intervalMs: safeMs, cps: calcCps });
      },
      setCps: (cps) => {
        const safeCps = Math.max(0.1, Math.min(100, cps));
        const calcMs = Math.max(1, Math.round(1000 / safeCps));
        set({ cps: safeCps, intervalMs: calcMs });
      },

      minIntervalMs: 80,
      maxIntervalMs: 120,
      setIntervalRange: (min, max) =>
        set({ minIntervalMs: Math.max(1, min), maxIntervalMs: Math.max(min, max) }),

      jitterMs: 15,
      setJitterMs: (j) => set({ jitterMs: Math.max(0, j) }),

      minCps: 8,
      maxCps: 12,
      setCpsRange: (min, max) => set({ minCps: Math.max(0.1, min), maxCps: Math.max(min, max) }),

      mouseButton: "left",
      setMouseButton: (btn) => set({ mouseButton: btn }),
      clickType: "single",
      setClickType: (type) => set({ clickType: type }),

      positionMode: "current_cursor",
      setPositionMode: (mode) => set({ positionMode: mode }),
      fixedX: 500,
      fixedY: 400,
      setFixedPosition: (x, y) => set({ fixedX: x, fixedY: y }),

      repeatMode: "infinite",
      setRepeatMode: (mode) => set({ repeatMode: mode }),
      repeatCount: 500,
      setRepeatCount: (cnt) => set({ repeatCount: Math.max(1, cnt) }),
      repeatDurationSeconds: 60,
      setRepeatDurationSeconds: (dur) => set({ repeatDurationSeconds: Math.max(1, dur) }),

      startDelaySeconds: 0,
      setStartDelaySeconds: (sec) => set({ startDelaySeconds: Math.max(0, sec) }),

      multiPoints: [
        {
          id: "pt-1",
          name: "Ponto 1",
          x: 450,
          y: 350,
          monitorIndex: 0,
          button: "left",
          clickType: "single",
          delayBeforeMs: 100,
          delayAfterMs: 200,
          repeatTimes: 1,
          enabled: true,
        },
        {
          id: "pt-2",
          name: "Ponto 2",
          x: 650,
          y: 400,
          monitorIndex: 0,
          button: "left",
          clickType: "single",
          delayBeforeMs: 150,
          delayAfterMs: 300,
          repeatTimes: 1,
          enabled: true,
        },
      ],
      addPoint: (pt) => {
        const newPt: ClickPoint = { ...pt, id: `pt-${Date.now()}` };
        set((s) => ({ multiPoints: [...s.multiPoints, newPt] }));
      },
      updatePoint: (id, updates) => {
        set((s) => ({
          multiPoints: s.multiPoints.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },
      removePoint: (id) => {
        set((s) => ({ multiPoints: s.multiPoints.filter((p) => p.id !== id) }));
      },
      reorderPoints: (points) => set({ multiPoints: points }),

      timelineActions: [
        {
          id: "act-1",
          type: "mouse.click",
          delayBefore: 0,
          parameters: { button: "left", clickType: "single" },
          enabled: true,
        },
        {
          id: "act-2",
          type: "wait",
          delayBefore: 0,
          parameters: { minWait: 150 },
          enabled: true,
        },
      ],
      timelineHistory: [],
      timelineHistoryIndex: -1,
      addAction: (action) => {
        const newAct: AutomationAction = { ...action, id: `act-${Date.now()}` };
        const updated = [...get().timelineActions, newAct];
        set((s) => ({
          timelineActions: updated,
          timelineHistory: [...s.timelineHistory.slice(0, s.timelineHistoryIndex + 1), updated],
          timelineHistoryIndex: s.timelineHistoryIndex + 1,
        }));
      },
      updateAction: (id, updates) => {
        const updated = get().timelineActions.map((a) => (a.id === id ? { ...a, ...updates } : a));
        set({ timelineActions: updated });
      },
      removeAction: (id) => {
        const updated = get().timelineActions.filter((a) => a.id !== id);
        set({ timelineActions: updated });
      },
      undoTimeline: () => {
        const { timelineHistory, timelineHistoryIndex } = get();
        if (timelineHistoryIndex > 0) {
          const prev = timelineHistory[timelineHistoryIndex - 1];
          set({ timelineActions: prev, timelineHistoryIndex: timelineHistoryIndex - 1 });
        }
      },
      redoTimeline: () => {
        const { timelineHistory, timelineHistoryIndex } = get();
        if (timelineHistoryIndex < timelineHistory.length - 1) {
          const next = timelineHistory[timelineHistoryIndex + 1];
          set({ timelineActions: next, timelineHistoryIndex: timelineHistoryIndex + 1 });
        }
      },

      keyClickers: [
        {
          key: "E",
          modifiers: { ctrl: false, shift: false, alt: false },
          intervalMs: 500,
          holdMode: "press",
          holdDurationSeconds: 1,
          enabled: true,
        },
      ],
      addKeyClicker: (kc) => set((s) => ({ keyClickers: [...s.keyClickers, kc] })),
      removeKeyClicker: (idx) =>
        set((s) => ({ keyClickers: s.keyClickers.filter((_, i) => i !== idx) })),

      hotkeyStartStop: "Insert",
      hotkeyEmergencyStop: "Shift+Escape",
      hotkeyPickPosition: "F7",
      setHotkeys: (updates) => {
        const cleanEmergency =
          updates.emergency && (updates.emergency.toUpperCase() === "ESC" || updates.emergency.toUpperCase() === "ESCAPE")
            ? "Shift+Escape"
            : updates.emergency;

        set((s) => ({
          hotkeyStartStop: updates.startStop ?? s.hotkeyStartStop,
          hotkeyEmergencyStop: cleanEmergency ?? s.hotkeyEmergencyStop,
          hotkeyPickPosition: updates.pick ?? s.hotkeyPickPosition,
        }));
        if (updates.startStop) {
          InputService.registerHotkey(updates.startStop);
        }
        if (cleanEmergency) {
          InputService.registerEmergencyHotkey(cleanEmergency);
        }
        if (updates.pick) {
          InputService.registerPickHotkey(updates.pick);
        }
      },
      cornerFailsafe: true,
      setCornerFailsafe: (enabled) => set({ cornerFailsafe: enabled }),
      simulationMode: false,
      setSimulationMode: (enabled) => set({ simulationMode: enabled }),

      isRunning: false,
      isPaused: false,
      sessionClicks: 0,
      totalLifetimeClicks: 0,
      realCps: 0,
      elapsedSeconds: 0,
      statusMessage: "Pronto para clicar 💕",
      timerDriftMs: 0,
      countdownSeconds: null,

      profiles: [],
      activeProfileId: null,
      saveCurrentAsProfile: (name, description) => {
        const s = get();
        const newProfile: AutoClickProfile = {
          schemaVersion: AUTOCLICK_SCHEMA_VERSION,
          id: `prof-${Date.now()}`,
          name,
          description,
          clickMode: s.clickMode,
          intervalMs: s.intervalMs,
          cps: s.cps,
          minIntervalMs: s.minIntervalMs,
          maxIntervalMs: s.maxIntervalMs,
          jitterMs: s.jitterMs,
          minCps: s.minCps,
          maxCps: s.maxCps,
          mouseButton: s.mouseButton,
          clickType: s.clickType,
          positionMode: s.positionMode,
          fixedX: s.fixedX,
          fixedY: s.fixedY,
          repeatMode: s.repeatMode,
          repeatCount: s.repeatCount,
          repeatDurationSeconds: s.repeatDurationSeconds,
          startDelaySeconds: s.startDelaySeconds,
          multiPoints: s.multiPoints,
          timelineActions: s.timelineActions,
          keyClickers: s.keyClickers,
          hotkeys: {
            startStop: s.hotkeyStartStop,
            pauseResume: "F8",
            pickPosition: s.hotkeyPickPosition,
            emergencyStop: s.hotkeyEmergencyStop,
          },
          safety: {
            cornerFailsafe: s.cornerFailsafe,
            preventSelfClick: true,
            maxRuntimeMinutes: 60,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: newProfile.id,
        }));
      },
      loadProfile: (p) => {
        set({
          activeProfileId: p.id,
          clickMode: p.clickMode,
          intervalMs: p.intervalMs,
          cps: p.cps,
          minIntervalMs: p.minIntervalMs,
          maxIntervalMs: p.maxIntervalMs,
          jitterMs: p.jitterMs,
          minCps: p.minCps,
          maxCps: p.maxCps,
          mouseButton: p.mouseButton,
          clickType: p.clickType,
          positionMode: p.positionMode,
          fixedX: p.fixedX,
          fixedY: p.fixedY,
          repeatMode: p.repeatMode,
          repeatCount: p.repeatCount,
          repeatDurationSeconds: p.repeatDurationSeconds,
          startDelaySeconds: p.startDelaySeconds,
          multiPoints: p.multiPoints || [],
          timelineActions: p.timelineActions || [],
          keyClickers: p.keyClickers || [],
          cornerFailsafe: p.safety?.cornerFailsafe ?? true,
        });
      },
      deleteProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
      duplicateProfile: (id) => {
        const original = get().profiles.find((p) => p.id === id);
        if (original) {
          const dup: AutoClickProfile = {
            ...original,
            id: `prof-${Date.now()}`,
            name: `${original.name} (Cópia)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({ profiles: [...s.profiles, dup] }));
        }
      },
      applyPreset: (preset) => {
        set((s) => ({
          ...s,
          ...preset,
        }));
      },

      history: [],
      addHistoryEntry: (entry) =>
        set((s) => ({
          history: [entry, ...s.history.slice(0, 49)],
        })),
      clearHistory: () => set({ history: [] }),

      diagnostics: {
        realCps: 0,
        targetCps: 10,
        averageIntervalMs: 100,
        minIntervalMs: 98,
        maxIntervalMs: 102,
        timerDriftMs: 0,
        queueLength: 0,
      },

      startAutoClick: async () => {
        const s = get();
        if (s.isRunning) return;

        // Visual Countdown if delay configured
        const token = ++countdownToken;
        if (s.startDelaySeconds > 0) {
          for (let rem = s.startDelaySeconds; rem > 0; rem--) {
            if (token !== countdownToken) return;
            set({ countdownSeconds: rem, statusMessage: `Iniciando em ${rem}s... 💕` });
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (token !== countdownToken) return;
          set({ countdownSeconds: null });
        }

        set({
          isRunning: true,
          isPaused: false,
          sessionClicks: 0,
          statusMessage: "Comecei a clicar ✨",
        });

        const runMode = autoclickRunMode(s.activeTab);

        // Convert store state to Native engine config
        try {
          await InputService.start({
            click_mode: s.clickMode,
            interval_ms: s.intervalMs,
            min_interval_ms: s.minIntervalMs,
            max_interval_ms: s.maxIntervalMs,
            jitter_ms: s.jitterMs,
            target_cps: s.cps,
            min_cps: s.minCps,
            max_cps: s.maxCps,
            mouse_button: s.mouseButton,
            click_type: s.clickType,
            position_mode: s.positionMode,
            fixed_x: s.fixedX,
            fixed_y: s.fixedY,
            repeat_mode: s.repeatMode,
            repeat_count: s.repeatCount,
            repeat_duration_seconds: s.repeatDurationSeconds,
            start_delay_seconds: 0,
            multi_points: runMode === "multipoint" ? s.multiPoints.map((p) => ({
              id: p.id,
              x: p.x,
              y: p.y,
              monitor_index: p.monitorIndex,
              button: p.button,
              click_type: p.clickType,
              delay_before_ms: p.delayBeforeMs,
              delay_after_ms: p.delayAfterMs,
              repeat_times: p.repeatTimes,
              enabled: p.enabled,
            })) : [],
            timeline_actions: runMode === "timeline" ? s.timelineActions : [],
            simulation_mode: s.simulationMode,
            corner_failsafe: s.cornerFailsafe,
            max_runtime_minutes: 60,
          });
        } catch (e: any) {
          await InputService.stop().catch(() => {});
          set({
            isRunning: false,
            isPaused: false,
            statusMessage: `Não consegui começar a clicar: ${e?.message || e}`,
          });
          return;
        }

        // Start background status poller
        const intervalId = setInterval(async () => {
          if (!get().isRunning) {
            clearInterval(intervalId);
            return;
          }

          const status = await InputService.getStatus();
          if (status) {
            set((prev) => ({
              isRunning: status.running,
              isPaused: status.paused,
              sessionClicks: status.click_count,
              realCps: status.real_cps,
              elapsedSeconds: status.elapsed_seconds,
              timerDriftMs: status.timer_drift_ms,
              statusMessage: status.running ? "Clicando a todo vapor 💕" : "Prontinho 💕",
              diagnostics: {
                realCps: status.real_cps,
                targetCps: prev.cps,
                averageIntervalMs: status.real_cps > 0 ? 1000 / status.real_cps : prev.intervalMs,
                minIntervalMs: prev.minIntervalMs,
                maxIntervalMs: prev.maxIntervalMs,
                timerDriftMs: status.timer_drift_ms,
                queueLength: 0,
              },
            }));

            if (!status.running) {
              clearInterval(intervalId);
              // Record history entry
              get().addHistoryEntry({
                id: `run-${Date.now()}`,
                profileName: "Sessão Rápida",
                startedAt: new Date(Date.now() - status.elapsed_seconds * 1000).toLocaleTimeString(),
                finishedAt: new Date().toLocaleTimeString(),
                durationSeconds: status.elapsed_seconds,
                clickCount: status.click_count,
                targetCps: get().cps,
                status: status.last_stop_reason?.includes("Failsafe") ? "panic_stopped" : "completed",
                stopReason: status.last_stop_reason || "Concluído",
              });
              set((prev) => ({
                totalLifetimeClicks: prev.totalLifetimeClicks + status.click_count,
              }));
            }
          }
        }, 250);
      },

      stopAutoClick: async (reason = "Usuário parou") => {
        countdownToken++;
        const wasRunning = get().isRunning;
        const status = wasRunning ? await InputService.getStatus() : null;
        await InputService.stop();
        if (wasRunning && status) {
          get().addHistoryEntry({
            id: `run-${Date.now()}`,
            profileName: "Sessão Rápida",
            startedAt: new Date(Date.now() - status.elapsed_seconds * 1000).toLocaleTimeString(),
            finishedAt: new Date().toLocaleTimeString(),
            durationSeconds: status.elapsed_seconds,
            clickCount: status.click_count,
            targetCps: get().cps,
            status: "stopped",
            stopReason: reason,
          });
          set((prev) => ({ totalLifetimeClicks: prev.totalLifetimeClicks + status.click_count }));
        }
        set({
          isRunning: false,
          isPaused: false,
          statusMessage: "Prontinho 💕",
          countdownSeconds: null,
        });
      },

      pauseAutoClick: async () => {
        await InputService.pause();
        set({ isPaused: true, statusMessage: "Pausado" });
      },

      resumeAutoClick: async () => {
        await InputService.resume();
        set({ isPaused: false, statusMessage: "Retomando cliques 💕" });
      },

      emergencyStop: async () => {
        countdownToken++;
        await InputService.emergencyStop();
        set({
          isRunning: false,
          isPaused: false,
          statusMessage: "Automação interrompida.",
          countdownSeconds: null,
        });
      },
    }),
    {
      name: "pmm-autoclick-store",
      partialize: (state) => ({
        intervalMs: state.intervalMs,
        cps: state.cps,
        mouseButton: state.mouseButton,
        clickType: state.clickType,
        clickMode: state.clickMode,
        positionMode: state.positionMode,
        fixedX: state.fixedX,
        fixedY: state.fixedY,
        repeatMode: state.repeatMode,
        repeatCount: state.repeatCount,
        repeatDurationSeconds: state.repeatDurationSeconds,
        startDelaySeconds: state.startDelaySeconds,
        multiPoints: state.multiPoints,
        timelineActions: state.timelineActions,
        keyClickers: state.keyClickers,
        hotkeyStartStop: state.hotkeyStartStop,
        hotkeyEmergencyStop: state.hotkeyEmergencyStop,
        hotkeyPickPosition: state.hotkeyPickPosition,
        cornerFailsafe: state.cornerFailsafe,
        simulationMode: state.simulationMode,
        profiles: state.profiles,
        history: state.history,
        totalLifetimeClicks: state.totalLifetimeClicks,
      }),
      version: 2,
      migrate: (persistedState: any, _version: number) => {
        if (persistedState) {
          const rawEmergency = persistedState.hotkeyEmergencyStop;
          if (!rawEmergency || rawEmergency === "ESC" || rawEmergency === "Escape") {
            persistedState.hotkeyEmergencyStop = "Shift+Escape";
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const rawEmergency = state.hotkeyEmergencyStop;
          if (!rawEmergency || rawEmergency === "ESC" || rawEmergency === "Escape") {
            state.hotkeyEmergencyStop = "Shift+Escape";
          }
        }
      },
    }
  )
);
