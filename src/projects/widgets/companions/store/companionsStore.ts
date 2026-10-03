import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import {
  CompanionInstance,
  CompanionManifest,
  CompanionsSettings,
  CompanionActionState,
} from "../types";
import { DEFAULT_COMPANIONS, getCompanionManifest } from "../registry";

interface CompanionsState {
  customCompanions: CompanionManifest[];
  activeCompanions: CompanionInstance[];
  favoriteIds: string[];
  settings: CompanionsSettings;

  // Actions
  spawnCompanion: (companionId: string) => Promise<string | null>;
  removeCompanion: (instanceId: string) => void;
  removeAllCompanions: () => void;
  updateCompanionState: (instanceId: string, updates: Partial<CompanionInstance>) => void;
  setCompanionAction: (instanceId: string, action: CompanionActionState) => void;
  toggleFavorite: (companionId: string) => void;
  importCustomPackage: (manifest: CompanionManifest) => void;
  deleteCustomPackage: (id: string) => void;
  updateSettings: (newSettings: Partial<CompanionsSettings>) => void;
  launchNativeCompanionWindow: (instance: CompanionInstance) => Promise<void>;
  closeNativeCompanionWindow: (instanceId: string) => Promise<void>;
  launchAllActiveCompanions: () => void;
  resetAllPositions: () => void;
}

const DEFAULT_SETTINGS: CompanionsSettings = {
  maxCompanions: 6,
  fpsCap: 30,
  pauseOnFullscreen: true,
  soundEnabled: true,
  boundaryMargin: 20,
};

// Initial cute default instance so the user sees a pet right away
const INITIAL_ACTIVE_COMPANIONS: CompanionInstance[] = [
  {
    instanceId: "companion-waifu-sakura-1",
    companionId: "waifu-sakura",
    customName: "Sakura Chibi",
    x: 180,
    y: 380,
    scale: 1.0,
    opacity: 1.0,
    alwaysOnTop: false,
    isPaused: false,
    facing: "right",
    currentState: "idle",
    stateTimer: 0,
  },
];

export const useCompanionsStore = create<CompanionsState>()(
  persist(
    (set, get) => ({
      customCompanions: [],
      activeCompanions: INITIAL_ACTIVE_COMPANIONS,
      favoriteIds: ["waifu-sakura", "dog-akita"],
      settings: DEFAULT_SETTINGS,

      spawnCompanion: async (companionId: string) => {
        const { activeCompanions, settings, customCompanions } = get();
        if (activeCompanions.length >= settings.maxCompanions) {
          return null;
        }

        const manifest = getCompanionManifest(companionId, customCompanions);
        if (!manifest) return null;

        const count = activeCompanions.filter((c) => c.companionId === companionId).length;
        const instanceId = `companion-${companionId}-${Date.now()}`;
        const name = count > 0 ? `${manifest.name} #${count + 1}` : manifest.name;

        // Cascade position near center/bottom
        const offsetIndex = activeCompanions.length;
        const x = 120 + (offsetIndex % 5) * 160;
        const y = 320 + Math.floor(offsetIndex / 5) * 120;

        const newInstance: CompanionInstance = {
          instanceId,
          companionId,
          customName: name,
          x,
          y,
          scale: manifest.defaultScale || 1.0,
          opacity: 1.0,
          alwaysOnTop: false,
          isPaused: false,
          facing: "right",
          currentState: "idle",
          stateTimer: 0,
        };

        set((state) => ({
          activeCompanions: [...state.activeCompanions, newInstance],
        }));

        await get().launchNativeCompanionWindow(newInstance);
        return instanceId;
      },

      removeCompanion: (instanceId: string) => {
        get().closeNativeCompanionWindow(instanceId);
        set((state) => ({
          activeCompanions: state.activeCompanions.filter((c) => c.instanceId !== instanceId),
        }));
      },

      removeAllCompanions: () => {
        const list = get().activeCompanions;
        for (const item of list) {
          get().closeNativeCompanionWindow(item.instanceId);
        }
        set({ activeCompanions: [] });
      },

      updateCompanionState: (instanceId: string, updates: Partial<CompanionInstance>) => {
        set((state) => ({
          activeCompanions: state.activeCompanions.map((c) =>
            c.instanceId === instanceId ? { ...c, ...updates } : c
          ),
        }));
      },

      setCompanionAction: (instanceId: string, action: CompanionActionState) => {
        set((state) => ({
          activeCompanions: state.activeCompanions.map((c) =>
            c.instanceId === instanceId ? { ...c, currentState: action, stateTimer: 0 } : c
          ),
        }));
      },

      toggleFavorite: (companionId: string) => {
        set((state) => {
          const isFav = state.favoriteIds.includes(companionId);
          return {
            favoriteIds: isFav
              ? state.favoriteIds.filter((id) => id !== companionId)
              : [...state.favoriteIds, companionId],
          };
        });
      },

      importCustomPackage: (manifest: CompanionManifest) => {
        set((state) => ({
          customCompanions: [
            ...state.customCompanions.filter((c) => c.id !== manifest.id),
            manifest,
          ],
        }));
      },

      deleteCustomPackage: (id: string) => {
        // Also remove any active instances
        const active = get().activeCompanions.filter((c) => c.companionId === id);
        for (const act of active) {
          get().closeNativeCompanionWindow(act.instanceId);
        }
        set((state) => ({
          customCompanions: state.customCompanions.filter((c) => c.id !== id),
          activeCompanions: state.activeCompanions.filter((c) => c.companionId !== id),
        }));
      },

      updateSettings: (newSettings: Partial<CompanionsSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      launchNativeCompanionWindow: async (instance: CompanionInstance) => {
        const manifest = getCompanionManifest(instance.companionId, get().customCompanions);
        const baseWidth = manifest?.dimensions.width || 100;
        const baseHeight = manifest?.dimensions.height || 100;
        const width = Math.round(baseWidth * instance.scale * 1.3); // extra padding for context menus & speech
        const height = Math.round(baseHeight * instance.scale * 1.3);

        const posX = Math.max(20, Math.round(instance.x));
        const posY = Math.max(20, Math.round(instance.y));

        try {
          await invoke("companion_open_window", {
            companionId: instance.instanceId,
            title: instance.customName || "Desktop Companion",
            x: posX,
            y: posY,
            width: Math.max(120, width),
            height: Math.max(120, height),
            alwaysOnTop: instance.alwaysOnTop,
          });
        } catch (err) {
          console.error(`[Companions] Falha ao abrir janela do companheiro ${instance.instanceId}:`, err);
        }
      },

      closeNativeCompanionWindow: async (instanceId: string) => {
        try {
          await invoke("companion_close_window", { companionId: instanceId });
        } catch (err) {
          console.warn(`[Companions] Falha ao fechar janela do companheiro ${instanceId}:`, err);
        }
      },

      launchAllActiveCompanions: () => {
        const list = get().activeCompanions;
        for (const item of list) {
          get().launchNativeCompanionWindow(item);
        }
      },

      resetAllPositions: () => {
        set((state) => ({
          activeCompanions: state.activeCompanions.map((c, i) => ({
            ...c,
            x: 120 + (i % 4) * 140,
            y: 350 + Math.floor(i / 4) * 100,
          })),
        }));
        get().launchAllActiveCompanions();
      },
    }),
    {
      name: "pmm_desktop_companions",
      partialize: (state) => ({
        customCompanions: state.customCompanions,
        activeCompanions: state.activeCompanions,
        favoriteIds: state.favoriteIds,
        settings: state.settings,
      }),
    }
  )
);
