import { ConsoleSystemId } from "./systems";
import { PatchFormat } from "./patcher";

export interface ConsoleGamePrefs {
  volume: number;
  muted: boolean;
  slot: number;
}

export interface ConsoleGame {
  id: string;
  name: string;
  system: ConsoleSystemId;
  isBuiltin: boolean;
  romSha1?: string;
  romExt?: string;
  romFileName?: string;
  romSize?: number;
  patchSha1?: string;
  patchFormat?: PatchFormat;
  patchFileName?: string;
  /** Patched copy; the original ROM is never overwritten. */
  patchedSha1?: string;
  translatedPtBr: boolean;
  coverSha1?: string;
  coverMime?: string;
  /** Keyboard map: EmulatorJS button index -> KeyboardEvent.keyCode. */
  keys?: Record<number, number>;
  /** Legacy EmulatorJS gamepad map, no longer used (controllers are configured in `gamepadStore`). */
  pads?: Record<number, string>;
  prefs: ConsoleGamePrefs;
  createdAt: number;
  updatedAt: number;
}

export interface ConsoleLibraryFile {
  version: 1;
  games: ConsoleGame[];
}

/** Legacy per-game widget types (`console-game-<id>`), migrated to {@link CONSOLE_SNES_TYPE}. */
export const CONSOLE_WIDGET_PREFIX = "console-game-";
/** The single Mini Console SNES widget; the selected game lives in `settings.gameId`. */
export const CONSOLE_SNES_TYPE = "console-snes";

export const DEFAULT_PREFS: ConsoleGamePrefs = { volume: 0.6, muted: false, slot: 1 };

export function isConsoleWidgetType(type: string | undefined | null): boolean {
  return !!type && (type === CONSOLE_SNES_TYPE || type.startsWith(CONSOLE_WIDGET_PREFIX));
}

export function gameIdFromWidgetType(type: string): string | null {
  return type.startsWith(CONSOLE_WIDGET_PREFIX) ? type.slice(CONSOLE_WIDGET_PREFIX.length) : null;
}

/** Game selected in a console widget instance (new `settings.gameId` or legacy type suffix). */
export function consoleWidgetGameId(widget: { type: string; settings?: Record<string, any> }): string | null {
  const fromSettings = widget.settings?.gameId;
  if (typeof fromSettings === "string" && fromSettings) return fromSettings;
  return gameIdFromWidgetType(widget.type);
}

/** Converts a persisted `console-game-<id>` widget into the single `console-snes` widget. */
export function migrateConsoleWidget<T extends { type: string; settings?: Record<string, any> }>(widget: T): T {
  const legacyId = gameIdFromWidgetType(widget.type);
  if (!legacyId) return widget;
  return { ...widget, type: CONSOLE_SNES_TYPE, settings: { ...(widget.settings || {}), gameId: legacyId } };
}

export function isGameConfigured(game: ConsoleGame | undefined): boolean {
  return !!game?.romSha1;
}

export type ConsoleCardAction = "configurar" | "jogar";

export function consoleCardAction(game: ConsoleGame | undefined): ConsoleCardAction {
  return isGameConfigured(game) ? "jogar" : "configurar";
}

/** The file the emulator should load: the patched copy if present, otherwise the original. */
export function playableSha1(game: ConsoleGame): string | undefined {
  return game.patchedSha1 || game.romSha1;
}

/**
 * No game ships with the app: older libraries may contain an unconfigured "smw" placeholder,
 * which is dropped; a configured one stays as a normal game.
 */
export function sanitizeLibrary(raw: unknown): ConsoleGame[] {
  const games = (raw as { games?: unknown })?.games;
  if (!Array.isArray(games)) return [];
  return games
    .filter((g: any) => g && typeof g.id === "string" && typeof g.name === "string")
    .filter((g: any) => typeof g.romSha1 === "string" && g.romSha1)
    .map((g: any) => ({
      ...g,
      system: g.system || "snes",
      isBuiltin: false,
      translatedPtBr: !!g.translatedPtBr,
      prefs: { ...DEFAULT_PREFS, ...(g.prefs || {}) },
    }));
}
