import { DockAppearance, DockAutoHide, DockEntry, DockGroup, DockLaunchItem, DockMonitor, DockWindowInfo, Rect, ResolvedDockItem } from "./types";

export function newDockId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizePath(p: string | null | undefined): string {
  return (p || "").trim().replace(/^"|"$/g, "").replace(/\//g, "\\").toLowerCase();
}

export function itemFromResolved(r: ResolvedDockItem): DockLaunchItem {
  return {
    id: newDockId("item"),
    type: "item",
    path: r.path,
    name: r.name || r.path,
    kind: r.kind,
    ...(r.target ? { target: r.target } : {}),
    ...(r.args ? { args: r.args } : {}),
  };
}

/** Executable used to recognise the item's running windows. */
export function itemExe(item: DockLaunchItem): string | null {
  const candidate = normalizePath(item.target || item.path);
  return candidate.endsWith(".exe") ? candidate : null;
}

export function flattenItems(entries: DockEntry[]): DockLaunchItem[] {
  return entries.flatMap((e) => (e.type === "item" ? [e] : e.type === "group" ? e.items : []));
}

export function findItem(entries: DockEntry[], id: string): DockLaunchItem | undefined {
  return flattenItems(entries).find((i) => i.id === id);
}

export function hasPath(entries: DockEntry[], path: string): boolean {
  const n = normalizePath(path);
  return flattenItems(entries).some((i) => normalizePath(i.path) === n);
}

/** Moves a top-level entry to `toIndex` (index in the list after removal). */
export function moveEntry(entries: DockEntry[], id: string, toIndex: number): DockEntry[] {
  const from = entries.findIndex((e) => e.id === id);
  if (from < 0) return entries;
  const next = entries.slice();
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, moved);
  return next;
}

/** Removes an entry anywhere (top level or inside a group); empty groups disappear. */
export function removeEntry(entries: DockEntry[], id: string): DockEntry[] {
  return entries
    .filter((e) => e.id !== id)
    .map((e) => (e.type === "group" ? { ...e, items: e.items.filter((i) => i.id !== id) } : e))
    .filter((e) => e.type !== "group" || e.items.length > 0);
}

export function updateItem(entries: DockEntry[], id: string, patch: Partial<DockLaunchItem>): DockEntry[] {
  return entries.map((e) => {
    if (e.type === "item") return e.id === id ? { ...e, ...patch, id: e.id, type: "item" } : e;
    if (e.type === "group") return { ...e, items: e.items.map((i) => (i.id === id ? { ...i, ...patch, id: i.id, type: "item" as const } : i)) };
    return e;
  });
}

/**
 * Drops item `sourceId` onto `targetId`: into an existing group, or both items become a new group
 * at the target's position.
 */
export function groupEntries(entries: DockEntry[], sourceId: string, targetId: string, name = "Grupo"): DockEntry[] {
  if (sourceId === targetId) return entries;
  const source = findItem(entries, sourceId);
  const target = entries.find((e) => e.id === targetId);
  if (!source || !target || target.type === "separator") return entries;
  const without = removeEntry(entries, sourceId);
  if (target.type === "group") {
    return without.map((e) => (e.id === targetId && e.type === "group" ? { ...e, items: [...e.items, source] } : e));
  }
  const group: DockGroup = { id: newDockId("group"), type: "group", name, items: [target, source] };
  return without.map((e) => (e.id === targetId ? group : e));
}

/** Replaces a group with its items, in place. */
export function ungroup(entries: DockEntry[], groupId: string): DockEntry[] {
  return entries.flatMap((e) => (e.id === groupId && e.type === "group" ? e.items : [e]));
}

/** Takes an item out of its group and puts it at the top level. */
export function takeOutOfGroup(entries: DockEntry[], itemId: string, toIndex: number): DockEntry[] {
  const item = findItem(entries, itemId);
  if (!item || entries.some((e) => e.id === itemId)) return entries;
  const without = removeEntry(entries, itemId);
  const next = without.slice();
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, item);
  return next;
}

export interface RunningMatch {
  byItem: Record<string, DockWindowInfo[]>;
  unpinned: { exe: string; windows: DockWindowInfo[] }[];
}

/** Assigns open windows to pinned items by executable; the rest are grouped per app. */
export function matchWindows(entries: DockEntry[], windows: DockWindowInfo[]): RunningMatch {
  const byExe = new Map<string, string>();
  for (const item of flattenItems(entries)) {
    const exe = itemExe(item);
    if (exe && !byExe.has(exe)) byExe.set(exe, item.id);
  }
  const byItem: Record<string, DockWindowInfo[]> = {};
  const unpinned = new Map<string, DockWindowInfo[]>();
  for (const w of windows) {
    const exe = normalizePath(w.exe) || `pid:${w.pid}`;
    const itemId = byExe.get(exe);
    if (itemId) (byItem[itemId] ||= []).push(w);
    else unpinned.set(exe, [...(unpinned.get(exe) || []), w]);
  }
  return { byItem, unpinned: [...unpinned.entries()].map(([exe, ws]) => ({ exe, windows: ws })) };
}

export type DockSlot =
  | { key: string; kind: "item"; item: DockLaunchItem; windows: DockWindowInfo[] }
  | { key: string; kind: "group"; group: DockGroup; windows: DockWindowInfo[] }
  | { key: string; kind: "separator"; auto: boolean }
  | { key: string; kind: "running"; exe: string; windows: DockWindowInfo[] }
  | { key: string; kind: "start" }
  | { key: string; kind: "tray" };

/** Slots that belong to the user's saved list (can be dragged and reordered). */
export function isPinnedSlot(slot: DockSlot): boolean {
  return slot.kind === "item" || slot.kind === "group" || (slot.kind === "separator" && !slot.auto);
}

/**
 * What the bar shows, in order: Start button (optional), pinned entries, unpinned running apps (optional),
 * then the tray/clock button (optional, used when the native taskbar is hidden).
 */
export function buildSlots(
  entries: DockEntry[],
  running: RunningMatch | null | undefined,
  showRunning: boolean,
  startButton = false,
  trayButton = false
): DockSlot[] {
  const slots: DockSlot[] = [];
  if (startButton) {
    slots.push({ key: "start", kind: "start" });
    if (entries.length || (showRunning && running?.unpinned.length)) slots.push({ key: "sep-start", kind: "separator", auto: true });
  }
  slots.push(...entries.map((e): DockSlot => {
    if (e.type === "separator") return { key: e.id, kind: "separator", auto: false };
    if (e.type === "group") return { key: e.id, kind: "group", group: e, windows: e.items.flatMap((i) => running?.byItem[i.id] || []) };
    return { key: e.id, kind: "item", item: e, windows: running?.byItem[e.id] || [] };
  }));
  if (showRunning && running?.unpinned.length) {
    if (entries.length) slots.push({ key: "sep-running", kind: "separator", auto: true });
    for (const u of running.unpinned) slots.push({ key: `run-${u.exe}`, kind: "running", exe: u.exe, windows: u.windows });
  }
  if (trayButton) {
    if (slots.length && slots[slots.length - 1].kind !== "separator") slots.push({ key: "sep-tray", kind: "separator", auto: true });
    slots.push({ key: "tray", kind: "tray" });
  }
  return slots;
}

/** Physical-pixel rectangle for the tray pill: the end of the dock's edge that the dock is not aligned to. */
export function trayWindowRect(a: DockAppearance, m: DockMonitor, size: { w: number; h: number }): Rect {
  const scale = m.scale || 1;
  const w = Math.ceil(size.w * scale);
  const h = Math.ceil(size.h * scale);
  const off = Math.round(a.offset * scale);
  const atStart = a.align === "end";
  if (a.edge === "bottom" || a.edge === "top") {
    return {
      x: atStart ? m.x + off : m.x + m.width - w - off,
      y: a.edge === "bottom" ? m.y + m.height - h - off : m.y + off,
      width: w,
      height: h,
    };
  }
  return {
    x: a.edge === "left" ? m.x + off : m.x + m.width - w - off,
    y: atStart ? m.y + off : m.y + m.height - h - off,
    width: w,
    height: h,
  };
}

export function countSlots(slots: DockSlot[]): { icons: number; separators: number } {
  const separators = slots.filter((s) => s.kind === "separator").length;
  return { icons: slots.length - separators, separators };
}

/** Window to act on when an icon with open windows is clicked: cycles through them. */
export function nextWindow(windows: DockWindowInfo[]): { window: DockWindowInfo; action: "focus" | "minimize" } | null {
  if (!windows.length) return null;
  const idx = windows.findIndex((w) => w.focused && !w.minimized);
  if (idx < 0) return { window: windows.find((w) => !w.minimized) || windows[0], action: "focus" };
  if (windows.length === 1) return { window: windows[0], action: "minimize" };
  return { window: windows[(idx + 1) % windows.length], action: "focus" };
}

export function pickMonitor(monitors: DockMonitor[], index: number): DockMonitor | undefined {
  return monitors.find((m) => m.index === index) || monitors.find((m) => m.primary) || monitors[0];
}

/** macOS-like falloff: 1 at the pointer, back to 1× about `range` icons away. */
export function magnifyScale(distance: number, pitch: number, magnify: number, range = 2.2): number {
  if (magnify <= 1 || pitch <= 0) return 1;
  const d = Math.abs(distance) / (pitch * range);
  if (d >= 1) return 1;
  return 1 + (magnify - 1) * ((Math.cos(d * Math.PI) + 1) / 2);
}

export interface HideState {
  autoHide: DockAutoHide;
  hovered: boolean;
  fullscreen: boolean;
  hideOnFullscreen: boolean;
  overlap: boolean;
  busy: boolean;
}

export function shouldHide(s: HideState): boolean {
  if (s.busy) return false;
  if (s.fullscreen && s.hideOnFullscreen) return true;
  if (s.hovered) return false;
  if (s.autoHide === "auto") return true;
  if (s.autoHide === "smart") return s.overlap;
  return false;
}

export interface DockLayoutInput {
  appearance: DockAppearance;
  monitor: DockMonitor;
  /** Icons shown (items, groups, running apps). */
  slots: number;
  separators: number;
  /** Physical rectangle to dock against (reserved AppBar strip); defaults to the work area. */
  anchor?: Rect;
  /** Extra logical space on the inner side (open group popover). */
  expanded?: number;
  /** Real Windows backdrop: the window must match the bar exactly, so no magnification headroom. */
  nativeGlass?: boolean;
  /** Minimum window length in logical pixels (room for an open popover). */
  minLength?: number;
}

export interface DockLayout {
  /** Dock window, physical pixels. */
  window: Rect;
  /** Bar inside the window, logical pixels. */
  bar: Rect;
  vertical: boolean;
  barThickness: number;
  barLength: number;
  /** Physical thickness to reserve as an AppBar. */
  reserve: number;
  scale: number;
}

export function barThicknessOf(a: DockAppearance): number {
  return a.iconSize + a.padding * 2 + (a.indicator === "none" ? 0 : 4);
}

export function contentLength(a: DockAppearance, slots: number, separators: number): number {
  const n = Math.max(1, slots);
  const gaps = Math.max(0, n + separators - 1);
  return n * a.iconSize + gaps * a.spacing + separators * 2;
}

export function computeDockLayout(input: DockLayoutInput): DockLayout {
  const { appearance: a, monitor } = input;
  const s = monitor.scale || 1;
  const vertical = a.edge === "left" || a.edge === "right";
  const anchor = input.anchor || { x: monitor.workX, y: monitor.workY, width: monitor.workWidth, height: monitor.workHeight };
  const mainStart = vertical ? anchor.y : anchor.x;
  const mainLenPhys = vertical ? anchor.height : anchor.width;
  const workLen = mainLenPhys / s;

  const magnify = input.nativeGlass || !a.animations ? 1 : a.magnify;
  const barThickness = barThicknessOf(a);
  const auto = contentLength(a, input.slots, input.separators) + a.padding * 2;
  const maxLen = Math.max(a.iconSize + a.padding * 2, workLen - a.offset * 2);
  const barLength = Math.min(a.length === "full" ? maxLen : auto, maxLen);

  const magExtra = a.iconSize * (magnify - 1);
  // Labels open on the inner side: short and wide for horizontal docks, long for vertical ones.
  const labelRoom = a.showLabels ? (vertical ? 200 : 36) : 10;
  const lengthRoom = a.showLabels && !vertical ? 160 : 48;
  const headroom = input.nativeGlass ? 0 : magExtra + labelRoom + (input.expanded || 0);
  const winLen = input.nativeGlass ? barLength : Math.min(workLen, Math.max(barLength + magExtra * 3 + lengthRoom, input.minLength || 0));
  const edgeGap = input.nativeGlass ? 0 : a.offset;
  const winThick = edgeGap + barThickness + headroom;

  const barLenPhys = barLength * s;
  const winLenPhys = Math.round(winLen * s);
  const margin = a.offset * s;
  const barStart =
    a.align === "start"
      ? mainStart + margin
      : a.align === "end"
      ? mainStart + mainLenPhys - margin - barLenPhys
      : mainStart + (mainLenPhys - barLenPhys) / 2;
  const desiredWin = barStart - ((winLen - barLength) / 2) * s;
  const winStart = Math.round(Math.max(mainStart, Math.min(mainStart + mainLenPhys - winLenPhys, desiredWin)));
  const barMain = (barStart - winStart) / s;

  const winThickPhys = Math.round(winThick * s);
  const glassGap = input.nativeGlass ? Math.round(a.offset * s) : 0;
  let x: number, y: number, width: number, height: number;
  let bar: Rect;
  switch (a.edge) {
    case "top":
      x = winStart;
      y = anchor.y + glassGap;
      width = winLenPhys;
      height = winThickPhys;
      bar = { x: barMain, y: edgeGap, width: barLength, height: barThickness };
      break;
    case "left":
      x = anchor.x + glassGap;
      y = winStart;
      width = winThickPhys;
      height = winLenPhys;
      bar = { x: edgeGap, y: barMain, width: barThickness, height: barLength };
      break;
    case "right":
      x = anchor.x + anchor.width - winThickPhys - glassGap;
      y = winStart;
      width = winThickPhys;
      height = winLenPhys;
      bar = { x: winThick - edgeGap - barThickness, y: barMain, width: barThickness, height: barLength };
      break;
    default:
      x = winStart;
      y = anchor.y + anchor.height - winThickPhys - glassGap;
      width = winLenPhys;
      height = winThickPhys;
      bar = { x: barMain, y: winThick - edgeGap - barThickness, width: barLength, height: barThickness };
  }
  return {
    window: { x, y, width, height },
    bar,
    vertical,
    barThickness,
    barLength,
    reserve: Math.round((a.offset + barThickness) * s),
    scale: s,
  };
}

/** Thin strip along the screen edge that reveals a hidden dock (logical, window-relative). */
export function revealStrip(layout: DockLayout, edge: DockAppearance["edge"], size = 3): Rect {
  const { bar } = layout;
  const w = layout.window.width / layout.scale;
  const h = layout.window.height / layout.scale;
  switch (edge) {
    case "top":
      return { x: bar.x, y: 0, width: bar.width, height: size };
    case "left":
      return { x: 0, y: bar.y, width: size, height: bar.height };
    case "right":
      return { x: w - size, y: bar.y, width: size, height: bar.height };
    default:
      return { x: bar.x, y: h - size, width: bar.width, height: size };
  }
}
