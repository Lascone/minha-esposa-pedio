import { create } from "zustand";
import {
  WindhawkMod,
  WindhawkStatus,
  ModCategory,
  ModSortOption,
} from "../types";
import { windhawkService } from "../services/windhawkService";

interface ModsStore {
  mods: WindhawkMod[];
  status: WindhawkStatus | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isRestartingExplorer: boolean;
  /** A toggled mod only shows up after Explorer restarts; the user confirms it in the banner. */
  explorerRestartPending: boolean;
  searchQuery: string;
  selectedCategory: ModCategory;
  selectedSort: ModSortOption;
  installedModIds: string[];
  enabledModIds: string[];
  favoriteModIds: string[];
  selectedThemes: Record<string, string>;
  selectedModForModal: WindhawkMod | null;

  // Actions
  loadInitialData: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  toggleMod: (id: string, themeId?: string) => void;
  setSelectedTheme: (modId: string, themeId: string) => Promise<void>;
  installMod: (id: string) => void;
  uninstallMod: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: ModCategory) => void;
  setSelectedSort: (sort: ModSortOption) => void;
  setSelectedModForModal: (mod: WindhawkMod | null) => void;
  restartExplorer: () => Promise<boolean>;
  launchWindhawk: () => Promise<boolean>;
  openFolder: (type: "data" | "app" | "mods") => Promise<boolean>;
  compileMod: (id: string, code: string) => Promise<string>;
  saveModSource: (id: string, code: string) => Promise<boolean>;
  createCustomMod: (data: { id: string; name: string; description: string; targetProcess: string }) => Promise<void>;
}

// Local storage helper
function getStoredArray(key: string, fallback: string[] = []): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredRecord(key: string, fallback: Record<string, string> = {}): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStoredRecord(key: string, obj: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}

function setStoredArray(key: string, items: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

export const useModsStore = create<ModsStore>((set, get) => ({
  mods: [],
  status: null,
  isLoading: true,
  isRefreshing: false,
  isRestartingExplorer: false,
  explorerRestartPending: false,
  searchQuery: "",
  selectedCategory: "all",
  selectedSort: "popular",
  installedModIds: getStoredArray("pmm_windhawk_installed", []),
  enabledModIds: getStoredArray("pmm_windhawk_enabled", []),
  favoriteModIds: getStoredArray("pmm_windhawk_favorites", []),
  selectedThemes: getStoredRecord("pmm_windhawk_mod_themes", {}),
  selectedModForModal: null,

  loadInitialData: async () => {
    set({ isLoading: true });

    try {
      const [status, localMods, catalog] = await Promise.all([
        windhawkService.getStatus(),
        windhawkService.getInstalledMods(),
        windhawkService.fetchCatalog(),
      ]);

      const storedInstalled = new Set(get().installedModIds);
      const storedEnabled = new Set(get().enabledModIds);

      // Sync with any native filesystem mods found
      localMods.forEach((lm) => {
        storedInstalled.add(lm.id);
        if (lm.enabled) storedEnabled.add(lm.id);
      });

      const installedArr = Array.from(storedInstalled);
      const enabledArr = Array.from(storedEnabled);

      setStoredArray("pmm_windhawk_installed", installedArr);
      setStoredArray("pmm_windhawk_enabled", enabledArr);

      set({
        status,
        mods: catalog,
        installedModIds: installedArr,
        enabledModIds: enabledArr,
        isLoading: false,
      });
    } catch (e) {
      console.error("Error loading initial mods data:", e);
      set({ isLoading: false });
    }
  },

  refreshStatus: async () => {
    set({ isRefreshing: true });
    try {
      const status = await windhawkService.getStatus();
      set({ status, isRefreshing: false });
    } catch {
      set({ isRefreshing: false });
    }
  },

  setSelectedTheme: async (modId: string, themeId: string) => {
    const current = { ...get().selectedThemes, [modId]: themeId };
    setStoredRecord("pmm_windhawk_mod_themes", current);
    set({ selectedThemes: current });
    if (get().enabledModIds.includes(modId)) {
      await windhawkService.applyModTheme(modId, themeId);
    }
  },

  toggleMod: (id: string, themeId?: string) => {
    const currentEnabled = new Set(get().enabledModIds);
    const currentInstalled = new Set(get().installedModIds);
    const isEnabling = !currentEnabled.has(id);

    if (currentEnabled.has(id)) {
      currentEnabled.delete(id);
    } else {
      currentEnabled.add(id);
      // Auto-install if enabling
      currentInstalled.add(id);
    }

    const nextEnabled = Array.from(currentEnabled);
    const nextInstalled = Array.from(currentInstalled);

    setStoredArray("pmm_windhawk_enabled", nextEnabled);
    setStoredArray("pmm_windhawk_installed", nextInstalled);

    if (themeId) {
      const themes = { ...get().selectedThemes, [id]: themeId };
      setStoredRecord("pmm_windhawk_mod_themes", themes);
      set({ selectedThemes: themes });
    }

    set({
      enabledModIds: nextEnabled,
      installedModIds: nextInstalled,
    });

    // Notify native engine asynchronously
    windhawkService.toggleMod(id, isEnabling).then((result) => {
      if (result.needs_explorer_restart) set({ explorerRestartPending: true });
      if (isEnabling) {
        const themeToApply = themeId || get().selectedThemes[id];
        if (themeToApply) {
          windhawkService.applyModTheme(id, themeToApply).catch(() => {});
        }
      }
    }).catch((err) => {
      console.warn("Failed to notify native engine of mod toggle:", err);
    });
  },

  installMod: (id: string) => {
    const currentInstalled = new Set(get().installedModIds);
    const currentEnabled = new Set(get().enabledModIds);

    currentInstalled.add(id);
    currentEnabled.add(id);

    const nextInstalled = Array.from(currentInstalled);
    const nextEnabled = Array.from(currentEnabled);

    setStoredArray("pmm_windhawk_installed", nextInstalled);
    setStoredArray("pmm_windhawk_enabled", nextEnabled);

    set({
      installedModIds: nextInstalled,
      enabledModIds: nextEnabled,
    });
  },

  uninstallMod: (id: string) => {
    const currentInstalled = new Set(get().installedModIds);
    const currentEnabled = new Set(get().enabledModIds);

    currentInstalled.delete(id);
    currentEnabled.delete(id);

    const nextInstalled = Array.from(currentInstalled);
    const nextEnabled = Array.from(currentEnabled);

    setStoredArray("pmm_windhawk_installed", nextInstalled);
    setStoredArray("pmm_windhawk_enabled", nextEnabled);

    set({
      installedModIds: nextInstalled,
      enabledModIds: nextEnabled,
    });
  },

  toggleFavorite: (id: string) => {
    const currentFavs = new Set(get().favoriteModIds);

    if (currentFavs.has(id)) {
      currentFavs.delete(id);
    } else {
      currentFavs.add(id);
    }

    const nextFavs = Array.from(currentFavs);
    setStoredArray("pmm_windhawk_favorites", nextFavs);
    set({ favoriteModIds: nextFavs });
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setSelectedCategory: (cat: ModCategory) => set({ selectedCategory: cat }),
  setSelectedSort: (sort: ModSortOption) => set({ selectedSort: sort }),
  setSelectedModForModal: (mod: WindhawkMod | null) => set({ selectedModForModal: mod }),

  restartExplorer: async () => {
    set({ isRestartingExplorer: true });
    try {
      const res = await windhawkService.restartExplorer();
      if (res) set({ explorerRestartPending: false });
      setTimeout(() => {
        set({ isRestartingExplorer: false });
      }, 1200);
      return res;
    } catch {
      set({ isRestartingExplorer: false });
      return false;
    }
  },

  launchWindhawk: async () => {
    const res = await windhawkService.launchWindhawk();
    get().refreshStatus();
    return res;
  },

  openFolder: async (type: "data" | "app" | "mods") => {
    return await windhawkService.openFolder(type as any);
  },

  compileMod: async (id: string, code: string) => {
    const res = await windhawkService.compileMod(id, code);
    const installed = new Set(get().installedModIds);
    const enabled = new Set(get().enabledModIds);
    installed.add(id);
    enabled.add(id);
    setStoredArray("pmm_windhawk_installed", Array.from(installed));
    setStoredArray("pmm_windhawk_enabled", Array.from(enabled));
    set({
      installedModIds: Array.from(installed),
      enabledModIds: Array.from(enabled),
    });
    get().refreshStatus();
    return res;
  },

  saveModSource: async (id: string, code: string) => {
    return await windhawkService.saveModSource(id, code);
  },

  createCustomMod: async (data: { id: string; name: string; description: string; targetProcess: string }) => {
    const local = await windhawkService.createCustomMod(data);
    const newMod: WindhawkMod = {
      id: local.id,
      name: local.name,
      description: data.description,
      author: "Criado por Você",
      version: "1.0.0",
      githubUrl: "https://github.com",
      targetProcesses: [data.targetProcess],
      users: 1,
      rating: 10,
      ratingUsers: 1,
      updatedAt: Date.now(),
      category: "windows",
      isInstalled: true,
      isEnabled: true,
      isFavorite: true,
      sourceCodeUrl: "",
    };

    const nextMods = [newMod, ...get().mods];
    const installed = new Set(get().installedModIds);
    const enabled = new Set(get().enabledModIds);
    installed.add(local.id);
    enabled.add(local.id);

    setStoredArray("pmm_windhawk_installed", Array.from(installed));
    setStoredArray("pmm_windhawk_enabled", Array.from(enabled));

    set({
      mods: nextMods,
      installedModIds: Array.from(installed),
      enabledModIds: Array.from(enabled),
      selectedModForModal: newMod,
    });
    get().refreshStatus();
  },
}));
