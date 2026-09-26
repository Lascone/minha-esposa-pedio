import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetInstance } from "../types";
import { CONSOLE_SNES_TYPE, consoleWidgetGameId, isConsoleWidgetType } from "./types";

export interface ConsoleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BOUNDS_KEY = "pmm_console_bounds";
/** All games share the window of the single Mini Console widget. */
const BOUNDS_SLOT = "snes";
export const CONSOLE_DEFAULT_SIZE = { width: 520, height: 470 };
export const CONSOLE_MIN_SIZE = { width: 320, height: 300 };

function readAllBounds(): Record<string, ConsoleBounds> {
  try {
    return JSON.parse(localStorage.getItem(BOUNDS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function validBounds(b: ConsoleBounds | undefined): ConsoleBounds | null {
  if (!b || [b.x, b.y, b.width, b.height].some((v) => typeof v !== "number" || !isFinite(v))) return null;
  return b;
}

export function loadConsoleBounds(): ConsoleBounds | null {
  const all = readAllBounds();
  return validBounds(all[BOUNDS_SLOT]) || validBounds(Object.values(all)[0]);
}

export function saveConsoleBounds(bounds: ConsoleBounds): void {
  const all = readAllBounds();
  all[BOUNDS_SLOT] = {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(CONSOLE_MIN_SIZE.width, Math.round(bounds.width)),
    height: Math.max(CONSOLE_MIN_SIZE.height, Math.round(bounds.height)),
  };
  localStorage.setItem(BOUNDS_KEY, JSON.stringify(all));
}

export function findConsoleWidget(): WidgetInstance | undefined {
  return useWidgetsStore.getState().activeWidgets.find((w) => isConsoleWidgetType(w.type));
}

/**
 * Opens (or focuses) the Mini Console SNES window. With a `gameId` it switches straight to that game;
 * without one it keeps the current game, or shows the library when none is selected.
 */
export function openConsole(gameId?: string | null): WidgetInstance {
  const store = useWidgetsStore.getState();
  const existing = findConsoleWidget();
  if (existing) {
    const settings = { ...(existing.settings || {}) };
    if (gameId !== undefined) settings.gameId = gameId || null;
    const shown: WidgetInstance = { ...existing, type: CONSOLE_SNES_TYPE, visible: true, title: "Mini Console SNES", settings };
    useWidgetsStore.setState((s) => ({
      activeWidgets: s.activeWidgets.map((w) => (w.id === existing.id ? shown : w)),
    }));
    store.launchNativeWidgetWindow(shown);
    return shown;
  }
  const bounds = loadConsoleBounds();
  return store.addWidget(CONSOLE_SNES_TYPE, {
    title: "Mini Console SNES",
    width: bounds?.width ?? CONSOLE_DEFAULT_SIZE.width,
    height: bounds?.height ?? CONSOLE_DEFAULT_SIZE.height,
    ...(bounds ? { x: bounds.x, y: bounds.y } : {}),
    opacity: 1,
    scale: 1,
    settings: { gameId: gameId || null },
  });
}

/** Changes the game shown in an open console widget (null = back to the library). */
export function selectConsoleGame(widgetId: string, gameId: string | null): void {
  useWidgetsStore.setState((s) => ({
    activeWidgets: s.activeWidgets.map((w) => (w.id === widgetId ? { ...w, settings: { ...(w.settings || {}), gameId } } : w)),
  }));
}

/** Called when a game is removed from the library: the console falls back to its library screen. */
export function forgetConsoleGame(gameId: string): void {
  const existing = findConsoleWidget();
  if (existing && consoleWidgetGameId(existing) === gameId) selectConsoleGame(existing.id, null);
}
