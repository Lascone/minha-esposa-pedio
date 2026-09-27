import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DockAppearance, DockBehavior, DockEntry, DockLaunchItem, DockTaskbarMode, DockTheme, ResolvedDockItem } from "../types";
import { BUILTIN_THEMES, DEFAULT_APPEARANCE, pickThemeFields } from "../themes";
import {
  groupEntries,
  hasPath,
  itemFromResolved,
  moveEntry,
  newDockId,
  removeEntry,
  takeOutOfGroup,
  ungroup,
  updateItem,
} from "../logic";

export const DOCK_STORAGE_KEY = "pmm_dock";

export const DEFAULT_BEHAVIOR: DockBehavior = {
  autoHide: "never",
  reserveSpace: false,
  hideOnFullscreen: true,
  showRunning: true,
  startWithApp: true,
  startButton: false,
  trayStyle: "inDock",
  shellButtons: [],
  startMenu: "windows",
  startMenuSections: { pinned: true, allApps: true, power: true, user: true },
  trayItems: { chevron: true, language: true, quick: true, seconds: true, date: false },
};

interface DockState {
  /** The dock window is on (it opens with the app when `behavior.startWithApp`). */
  enabled: boolean;
  entries: DockEntry[];
  appearance: DockAppearance;
  behavior: DockBehavior;
  customThemes: DockTheme[];
  activeThemeId: string | null;
  taskbarMode: DockTaskbarMode;

  setEnabled: (enabled: boolean) => void;
  /** Adds resolved items (skipping duplicates); returns how many were added. */
  addItems: (items: ResolvedDockItem[], index?: number) => number;
  removeEntry: (id: string) => void;
  moveEntry: (id: string, toIndex: number) => void;
  updateItem: (id: string, patch: Partial<DockLaunchItem>) => void;
  addSeparator: (index?: number) => void;
  groupItems: (sourceId: string, targetId: string) => void;
  ungroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  takeOutOfGroup: (itemId: string, toIndex: number) => void;
  setAppearance: (patch: Partial<DockAppearance>) => void;
  setBehavior: (patch: Partial<DockBehavior>) => void;
  applyTheme: (themeId: string) => void;
  saveCurrentTheme: (name: string) => DockTheme;
  deleteTheme: (themeId: string) => void;
  setTaskbarMode: (patch: Partial<DockTaskbarMode>) => void;
  resetAppearance: () => void;
}

export const useDockStore = create<DockState>()(
  persist(
    (set, get) => ({
      enabled: false,
      entries: [],
      appearance: DEFAULT_APPEARANCE,
      behavior: DEFAULT_BEHAVIOR,
      customThemes: [],
      activeThemeId: null,
      taskbarMode: { enabled: false, autohide: false, hide: false },

      setEnabled: (enabled) => set({ enabled }),

      addItems: (items, index) => {
        const fresh: DockLaunchItem[] = [];
        for (const r of items) {
          if (!r?.path || hasPath(get().entries, r.path) || fresh.some((f) => f.path.toLowerCase() === r.path.toLowerCase())) continue;
          fresh.push(itemFromResolved(r));
        }
        if (fresh.length) {
          set((s) => {
            const next = s.entries.slice();
            next.splice(index === undefined ? next.length : Math.max(0, Math.min(next.length, index)), 0, ...fresh);
            return { entries: next };
          });
        }
        return fresh.length;
      },

      removeEntry: (id) => set((s) => ({ entries: removeEntry(s.entries, id) })),
      moveEntry: (id, toIndex) => set((s) => ({ entries: moveEntry(s.entries, id, toIndex) })),
      updateItem: (id, patch) => set((s) => ({ entries: updateItem(s.entries, id, patch) })),

      addSeparator: (index) =>
        set((s) => {
          const next = s.entries.slice();
          next.splice(index === undefined ? next.length : index, 0, { id: newDockId("sep"), type: "separator" });
          return { entries: next };
        }),

      groupItems: (sourceId, targetId) => set((s) => ({ entries: groupEntries(s.entries, sourceId, targetId) })),
      ungroup: (groupId) => set((s) => ({ entries: ungroup(s.entries, groupId) })),
      renameGroup: (groupId, name) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === groupId && e.type === "group" ? { ...e, name: name.trim() || e.name } : e)),
        })),
      takeOutOfGroup: (itemId, toIndex) => set((s) => ({ entries: takeOutOfGroup(s.entries, itemId, toIndex) })),

      setAppearance: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch }, activeThemeId: touchesTheme(patch) ? null : s.activeThemeId })),
      setBehavior: (patch) => set((s) => ({ behavior: { ...s.behavior, ...patch } })),

      applyTheme: (themeId) => {
        const theme = [...BUILTIN_THEMES, ...get().customThemes].find((t) => t.id === themeId);
        if (theme) set((s) => ({ appearance: { ...s.appearance, ...theme.appearance }, activeThemeId: theme.id }));
      },

      saveCurrentTheme: (name) => {
        const theme: DockTheme = { id: newDockId("theme"), name: name.trim() || "Meu tema", appearance: pickThemeFields(get().appearance) };
        set((s) => ({ customThemes: [...s.customThemes, theme], activeThemeId: theme.id }));
        return theme;
      },

      deleteTheme: (themeId) =>
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== themeId),
          activeThemeId: s.activeThemeId === themeId ? null : s.activeThemeId,
        })),

      setTaskbarMode: (patch) => set((s) => ({ taskbarMode: { ...s.taskbarMode, ...patch } })),
      resetAppearance: () => set({ appearance: DEFAULT_APPEARANCE, activeThemeId: null }),
    }),
    {
      name: DOCK_STORAGE_KEY,
      version: 1,
      merge: (persisted: any, current) => ({
        ...current,
        ...(persisted || {}),
        appearance: { ...DEFAULT_APPEARANCE, ...(persisted?.appearance || {}) },
        behavior: {
          ...DEFAULT_BEHAVIOR,
          ...(persisted?.behavior || {}),
          startMenuSections: { ...DEFAULT_BEHAVIOR.startMenuSections, ...(persisted?.behavior?.startMenuSections || {}) },
          trayItems: { ...DEFAULT_BEHAVIOR.trayItems, ...(persisted?.behavior?.trayItems || {}) },
        },
        taskbarMode: { enabled: false, autohide: false, hide: false, ...(persisted?.taskbarMode || {}) },
      }),
    }
  )
);

function touchesTheme(patch: Partial<DockAppearance>): boolean {
  const themed = pickThemeFields(DEFAULT_APPEARANCE);
  return Object.keys(patch).some((k) => k in themed);
}

// The dock runs in its own webview; pick up changes made in the main window (and vice versa).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === DOCK_STORAGE_KEY) useDockStore.persist.rehydrate();
  });
}
