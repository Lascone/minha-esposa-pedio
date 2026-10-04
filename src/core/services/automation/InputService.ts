import { invoke } from "@tauri-apps/api/core";

export interface AutoClickNativeConfig {
  click_mode: "fixed" | "random_interval" | "base_jitter" | "random_cps";
  interval_ms: number;
  min_interval_ms: number;
  max_interval_ms: number;
  jitter_ms: number;
  target_cps: number;
  min_cps: number;
  max_cps: number;
  mouse_button: "left" | "right" | "middle";
  click_type: "single" | "double" | "triple" | "hold";
  position_mode: "current_cursor" | "fixed" | "window_relative" | "random_area";
  fixed_x: number;
  fixed_y: number;
  click_area?: { x1: number; y1: number; x2: number; y2: number };
  repeat_mode: "infinite" | "count" | "duration" | "until_time";
  repeat_count: number;
  repeat_duration_seconds: number;
  start_delay_seconds: number;
  multi_points: Array<{
    id: string;
    x: number;
    y: number;
    monitor_index: number;
    button: "left" | "right" | "middle";
    click_type: "single" | "double" | "triple" | "hold";
    delay_before_ms: number;
    delay_after_ms: number;
    repeat_times: number;
    enabled: boolean;
  }>;
  timeline_actions: Array<any>;
  simulation_mode: boolean;
  corner_failsafe: boolean;
  max_runtime_minutes: number;
}

export interface AutoClickNativeStatus {
  running: boolean;
  paused: boolean;
  click_count: number;
  real_cps: number;
  elapsed_seconds: number;
  current_action: string;
  timer_drift_ms: number;
  last_stop_reason?: string;
}

export class InputService {
  /** Throws when the native engine refuses to start, so the UI never claims it is clicking. */
  static async start(config: AutoClickNativeConfig): Promise<void> {
    await invoke("autoclick_start", { config });
  }

  static async stop(): Promise<void> {
    try {
      await invoke("autoclick_stop");
    } catch (e) {
      console.warn("[InputService] stop fallback:", e);
    }
  }

  static async pause(): Promise<void> {
    try {
      await invoke("autoclick_pause");
    } catch (e) {
      console.warn("[InputService] pause fallback:", e);
    }
  }

  static async resume(): Promise<void> {
    try {
      await invoke("autoclick_resume");
    } catch (e) {
      console.warn("[InputService] resume fallback:", e);
    }
  }

  static async getStatus(): Promise<AutoClickNativeStatus | null> {
    try {
      return await invoke<AutoClickNativeStatus>("autoclick_get_status");
    } catch (e) {
      return null;
    }
  }

  static async emergencyStop(): Promise<void> {
    try {
      await invoke("autoclick_emergency_stop");
    } catch (e) {
      console.warn("[InputService] emergencyStop fallback:", e);
    }
  }

  static async getCursorPos(): Promise<[number, number]> {
    try {
      return await invoke<[number, number]>("autoclick_get_cursor_pos");
    } catch (e) {
      return [0, 0];
    }
  }

  static async registerHotkey(key: string): Promise<void> {
    try {
      await invoke("autoclick_register_hotkey", { key });
    } catch (e) {
      console.warn("[InputService] registerHotkey fallback:", e);
    }
  }

  static async captureClick(): Promise<[number, number]> {
    return await invoke<[number, number]>("autoclick_capture_click");
  }

  static async registerPickHotkey(key: string): Promise<void> {
    try {
      await invoke("register_action_shortcut", { action: "autoclick_pick_position", key });
    } catch (e) {
      console.warn("[InputService] registerPickHotkey fallback:", e);
    }
  }

  static async registerEmergencyHotkey(key: string): Promise<void> {
    try {
      await invoke("autoclick_register_emergency_hotkey", { key });
    } catch (e) {
      console.warn("[InputService] registerEmergencyHotkey fallback:", e);
    }
  }
}
