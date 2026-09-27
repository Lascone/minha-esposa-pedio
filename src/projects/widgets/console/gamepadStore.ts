import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_DEADZONE, DEFAULT_PROFILE, PadBindings, PadProfile, resolveBindings } from "./gamepad";

export const GAMEPAD_STORAGE_KEY = "pmm_console_gamepads";

interface GamepadState {
  enabled: boolean;
  /** "any" = every connected controller plays as player 1; otherwise a profile key. */
  selected: string;
  deadzone: number;
  /** Per controller model (see `profileKey`). Missing = automatic setup. */
  profiles: Record<string, PadProfile>;
  setEnabled: (enabled: boolean) => void;
  setSelected: (selected: string) => void;
  setDeadzone: (deadzone: number) => void;
  updateProfile: (key: string, patch: Partial<PadProfile>) => void;
  setBinding: (key: string, snesIndex: number, tokens: string[] | null) => void;
  resetProfile: (key: string) => void;
}

export const useGamepadStore = create<GamepadState>()(
  persist(
    (set) => ({
      enabled: true,
      selected: "any",
      deadzone: DEFAULT_DEADZONE,
      profiles: {},
      setEnabled: (enabled) => set({ enabled }),
      setSelected: (selected) => set({ selected }),
      setDeadzone: (deadzone) => set({ deadzone: Math.max(0.15, Math.min(0.9, deadzone)) }),
      updateProfile: (key, patch) =>
        set((s) => ({ profiles: { ...s.profiles, [key]: { ...DEFAULT_PROFILE, ...s.profiles[key], ...patch } } })),
      setBinding: (key, snesIndex, tokens) =>
        set((s) => {
          const profile = { ...DEFAULT_PROFILE, ...s.profiles[key] };
          const custom = { ...profile.custom };
          if (tokens) {
            // An input drives a single SNES button: take it away from the others.
            for (const [idx, list] of Object.entries(custom)) custom[Number(idx)] = list.filter((t) => !tokens.includes(t));
            custom[snesIndex] = tokens;
          } else {
            delete custom[snesIndex];
          }
          return { profiles: { ...s.profiles, [key]: { ...profile, custom } } };
        }),
      resetProfile: (key) =>
        set((s) => {
          const profiles = { ...s.profiles };
          delete profiles[key];
          return { profiles };
        }),
    }),
    { name: GAMEPAD_STORAGE_KEY, version: 1 }
  )
);

export function profileFor(profiles: Record<string, PadProfile>, key: string): PadProfile {
  return { ...DEFAULT_PROFILE, ...profiles[key] };
}

/** What the emulator frame needs: resolved bindings per known controller plus the automatic fallback. */
export interface PlayerPadConfig {
  enabled: boolean;
  selected: string;
  deadzone: number;
  profiles: Record<string, PadBindings>;
  fallback: PadBindings;
}

export function playerPadConfig(s: Pick<GamepadState, "enabled" | "selected" | "deadzone" | "profiles">): PlayerPadConfig {
  const profiles: Record<string, PadBindings> = {};
  for (const [key, p] of Object.entries(s.profiles)) profiles[key] = resolveBindings({ ...DEFAULT_PROFILE, ...p });
  return { enabled: s.enabled, selected: s.selected, deadzone: s.deadzone, profiles, fallback: resolveBindings(DEFAULT_PROFILE) };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === GAMEPAD_STORAGE_KEY) useGamepadStore.persist.rehydrate();
  });
}
