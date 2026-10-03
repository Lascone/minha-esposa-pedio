export type AutoClickTab =
  | "quick"
  | "multipoint"
  | "builder"
  | "recorder"
  | "keyboard"
  | "profiles"
  | "history"
  | "settings";

export type MouseButton = "left" | "right" | "middle";
export type ClickType = "single" | "double" | "triple" | "hold";
export type ClickMode = "fixed" | "random_interval" | "base_jitter" | "random_cps";
export type PositionMode = "current_cursor" | "fixed" | "window_relative" | "random_area";
export type RepeatMode = "infinite" | "count" | "duration" | "until_time";

export interface ClickArea {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ClickPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  monitorIndex: number;
  button: MouseButton;
  clickType: ClickType;
  delayBeforeMs: number;
  delayAfterMs: number;
  repeatTimes: number;
  enabled: boolean;
}

export type ActionType =
  | "mouse.click"
  | "mouse.down"
  | "mouse.up"
  | "mouse.move"
  | "mouse.scroll"
  | "keyboard.press"
  | "keyboard.down"
  | "keyboard.up"
  | "wait"
  | "random_wait"
  | "loop.start"
  | "loop.end"
  | "comment";

export interface AutomationAction {
  id: string;
  type: ActionType;
  timestamp?: number;
  delayBefore: number;
  duration?: number;
  parameters: {
    button?: MouseButton;
    clickType?: ClickType;
    x?: number;
    y?: number;
    delta?: number;
    key?: string;
    iterations?: number;
    comment?: string;
    minWait?: number;
    maxWait?: number;
  };
  enabled: boolean;
}

export interface KeyClickerConfig {
  key: string;
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean };
  intervalMs: number;
  holdMode: "press" | "hold";
  holdDurationSeconds: number;
  enabled: boolean;
}

export interface AutoClickProfile {
  schemaVersion: number;
  id: string;
  name: string;
  description?: string;
  isFavorite?: boolean;
  clickMode: ClickMode;
  intervalMs: number;
  cps: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  jitterMs: number;
  minCps: number;
  maxCps: number;
  mouseButton: MouseButton;
  clickType: ClickType;
  positionMode: PositionMode;
  fixedX: number;
  fixedY: number;
  clickArea?: ClickArea;
  targetWindowHwnd?: number;
  targetWindowTitle?: string;
  repeatMode: RepeatMode;
  repeatCount: number;
  repeatDurationSeconds: number;
  startDelaySeconds: number;
  multiPoints: ClickPoint[];
  timelineActions: AutomationAction[];
  keyClickers: KeyClickerConfig[];
  hotkeys: {
    startStop: string;
    pauseResume: string;
    pickPosition: string;
    emergencyStop: string;
  };
  safety: {
    cornerFailsafe: boolean;
    preventSelfClick: boolean;
    maxRuntimeMinutes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  profileId?: string;
  profileName: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  clickCount: number;
  targetCps: number;
  status: "completed" | "stopped" | "panic_stopped" | "error";
  stopReason: string;
}

export interface DeveloperDiagnostics {
  realCps: number;
  targetCps: number;
  averageIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  timerDriftMs: number;
  queueLength: number;
}
