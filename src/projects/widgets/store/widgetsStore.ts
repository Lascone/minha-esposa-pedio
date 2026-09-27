import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { WidgetInstance, WidgetType, WidgetTheme, SystemMetrics } from "../types";
import { getWidgetDefinition } from "../registry";
import { isConsoleWidgetType, migrateConsoleWidget } from "../console/types";
import { arrangeInArea } from "../dragLogic";
import { getPrimaryMonitorInfo } from "../monitor";

/** v2: widgets stop being always-on-top by default. v3: one Mini Console SNES widget instead of one per game. */
export function migrateWidgetsState(persistedState: any, version: number): any {
  if (!persistedState || !Array.isArray(persistedState.activeWidgets)) return persistedState;
  let widgets: any[] = persistedState.activeWidgets;
  if (version < 2) widgets = widgets.map((w) => ({ ...w, alwaysOnTop: false }));
  if (version < 3) {
    widgets = widgets.map(migrateConsoleWidget);
    const consoles = widgets.filter((w) => isConsoleWidgetType(w.type));
    const keep = consoles.find((w) => w.visible) || consoles[0];
    widgets = widgets.filter((w) => !isConsoleWidgetType(w.type) || w === keep);
  }
  return { ...persistedState, activeWidgets: widgets };
}

interface WidgetsState {
  activeWidgets: WidgetInstance[];
  allWidgetsVisible: boolean;
  globalTheme: WidgetTheme;
  globalScale: number;
  globalOpacity: number;
  systemMetrics: SystemMetrics | null;
  isMetricsLoading: boolean;
  /** The native metrics command failed; widgets must say so rather than show numbers. */
  metricsUnavailable: boolean;
  selectedWidgetId: string | null;

  // Actions
  addWidget: (type: WidgetType, overrides?: Partial<WidgetInstance>) => WidgetInstance;
  /** Stores bounds reported by the native window without moving it again. */
  recordWidgetBounds: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  removeWidget: (id: string) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
  updateWidgetSize: (id: string, width: number, height: number) => void;
  updateWidgetSettings: (id: string, settings: Record<string, any>) => void;
  toggleWidgetVisibility: (id: string) => void;
  toggleAllWidgets: (force?: boolean) => void;
  setWidgetAlwaysOnTop: (id: string, alwaysOnTop: boolean) => void;
  setWidgetTheme: (id: string, theme: WidgetTheme) => void;
  setWidgetOpacity: (id: string, opacity: number) => void;
  setWidgetScale: (id: string, scale: number) => void;
  setWidgetLocked: (id: string, locked: boolean) => void;
  setSelectedWidgetId: (id: string | null) => void;
  setGlobalTheme: (theme: WidgetTheme) => void;
  setGlobalOpacity: (opacity: number) => void;
  setGlobalScale: (scale: number) => void;
  resetAllPositions: () => Promise<void>;
  fetchSystemMetrics: () => Promise<void>;
  launchNativeWidgetWindow: (widget: WidgetInstance) => Promise<void>;
  closeNativeWidgetWindow: (widgetId: string) => Promise<void>;
  launchAllActiveWidgets: () => void;
}

// Initial default widgets presented to user
const DEFAULT_INITIAL_WIDGETS: WidgetInstance[] = [
  {
    id: "widget-analog-clock-1",
    type: "analog-clock",
    title: "Relógio Analógico",
    enabled: true,
    visible: true,
    x: 80,
    y: 80,
    width: 240,
    height: 240,
    scale: 1,
    opacity: 0.95,
    theme: "aero-glass",
    alwaysOnTop: false,
    locked: false,
    settings: {
      faceStyle: "aero",
      showDate: true,
      smoothSeconds: true,
    },
  },
  {
    id: "widget-weather-1",
    type: "weather",
    title: "Clima & Previsão",
    enabled: true,
    visible: true,
    x: 350,
    y: 80,
    width: 280,
    height: 190,
    scale: 1,
    opacity: 0.95,
    theme: "aero-glass",
    alwaysOnTop: false,
    locked: false,
    settings: {
      city: "São Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
      unit: "celsius",
    },
  },
  {
    id: "widget-cpu-meter-1",
    type: "cpu-meter",
    title: "Medidor de CPU",
    enabled: true,
    visible: true,
    x: 660,
    y: 80,
    width: 240,
    height: 220,
    scale: 1,
    opacity: 0.95,
    theme: "aero-glass",
    alwaysOnTop: false,
    locked: false,
    settings: {},
  },
  {
    id: "widget-sticky-notes-1",
    type: "sticky-notes",
    title: "Notas Rápidas",
    enabled: true,
    visible: true,
    x: 80,
    y: 350,
    width: 260,
    height: 250,
    scale: 1,
    opacity: 0.95,
    theme: "cute-pastel",
    alwaysOnTop: false,
    locked: false,
    settings: {
      noteColor: "yellow",
      title: "Recadinho com Amor 💕",
      content: "• Comprar café & pão de queijo\n• Jogar Roblox MM2 mais tarde!\n• Lembrar de beber água 💧",
      isTodoList: true,
    },
  },
];

export const useWidgetsStore = create<WidgetsState>()(
  persist(
    (set, get) => ({
      activeWidgets: DEFAULT_INITIAL_WIDGETS,
      allWidgetsVisible: true,
      globalTheme: "aero-glass",
      globalScale: 1.0,
      globalOpacity: 0.95,
      systemMetrics: null,
      isMetricsLoading: false,
      metricsUnavailable: false,
      selectedWidgetId: null,

      addWidget: (type: WidgetType, overrides?: Partial<WidgetInstance>) => {
        const def = getWidgetDefinition(type);
        const count = get().activeWidgets.filter((w) => w.type === type).length;
        const id = `widget-${type}-${Date.now()}`;
        const title = count > 0 ? `${def?.name || type} ${count + 1}` : def?.name || type;

        // Cascade position
        const existingCount = get().activeWidgets.length;
        const x = 60 + (existingCount % 4) * 260;
        const y = 80 + Math.floor(existingCount / 4) * 250;

        const newWidget: WidgetInstance = {
          id,
          type,
          title,
          enabled: true,
          visible: true,
          x,
          y,
          width: def?.defaultWidth || 260,
          height: def?.defaultHeight || 200,
          scale: get().globalScale || 1.0,
          opacity: get().globalOpacity || 0.95,
          theme: get().globalTheme || "aero-glass",
          alwaysOnTop: false,
          locked: false,
          settings: {},
          ...overrides,
        };

        set((state) => ({
          activeWidgets: [...state.activeWidgets, newWidget],
          selectedWidgetId: id,
        }));

        // Automatically launch native desktop window if running in Tauri
        get().launchNativeWidgetWindow(newWidget);

        return newWidget;
      },

      removeWidget: (id: string) => {
        get().closeNativeWidgetWindow(id);
        set((state) => ({
          activeWidgets: state.activeWidgets.filter((w) => w.id !== id),
          selectedWidgetId: state.selectedWidgetId === id ? null : state.selectedWidgetId,
        }));
      },

      updateWidgetPosition: (id: string, x: number, y: number) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, x, y } : w
          ),
        }));
        // Sync native window position if in Tauri
        invoke("widget_set_position", { widgetId: id, x: Math.round(x), y: Math.round(y) }).catch(() => {});
      },

      recordWidgetBounds: (id, bounds) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id
              ? {
                  ...w,
                  x: Math.round(bounds.x),
                  y: Math.round(bounds.y),
                  width: Math.round(bounds.width),
                  height: Math.round(bounds.height),
                }
              : w
          ),
        }));
      },

      updateWidgetSize: (id: string, width: number, height: number) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, width, height } : w
          ),
        }));
      },

      updateWidgetSettings: (id: string, newSettings: Record<string, any>) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, settings: { ...w.settings, ...newSettings } } : w
          ),
        }));
      },

      toggleWidgetVisibility: (id: string) => {
        const widget = get().activeWidgets.find((w) => w.id === id);
        if (!widget) return;
        const nextVisible = !widget.visible;

        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, visible: nextVisible } : w
          ),
        }));

        if (nextVisible) {
          get().launchNativeWidgetWindow(widget);
        } else {
          get().closeNativeWidgetWindow(id);
        }
      },

      toggleAllWidgets: (force?: boolean) => {
        const current = get().allWidgetsVisible;
        const next = force !== undefined ? force : !current;

        set((state) => ({
          allWidgetsVisible: next,
          activeWidgets: state.activeWidgets.map((w) => ({
            ...w,
            visible: next,
          })),
        }));

        stateAction: {
          const widgets = get().activeWidgets;
          for (const w of widgets) {
            if (next) {
              get().launchNativeWidgetWindow(w);
            } else {
              get().closeNativeWidgetWindow(w.id);
            }
          }
        }
      },

      setWidgetAlwaysOnTop: (id: string, alwaysOnTop: boolean) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, alwaysOnTop } : w
          ),
        }));
        invoke("widget_set_always_on_top", { widgetId: id, alwaysOnTop }).catch(() => {});
      },

      setWidgetTheme: (id: string, theme: WidgetTheme) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, theme } : w
          ),
        }));
      },

      setWidgetOpacity: (id: string, opacity: number) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, opacity } : w
          ),
        }));
      },

      setWidgetScale: (id: string, scale: number) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, scale } : w
          ),
        }));
      },

      setWidgetLocked: (id: string, locked: boolean) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, locked } : w
          ),
        }));
      },

      setSelectedWidgetId: (id: string | null) => {
        set({ selectedWidgetId: id });
      },

      setGlobalTheme: (theme: WidgetTheme) => {
        set((state) => ({
          globalTheme: theme,
          activeWidgets: state.activeWidgets.map((w) => ({ ...w, theme })),
        }));
      },

      setGlobalOpacity: (opacity: number) => {
        set((state) => ({
          globalOpacity: opacity,
          activeWidgets: state.activeWidgets.map((w) => ({ ...w, opacity })),
        }));
      },

      setGlobalScale: (scale: number) => {
        set((state) => ({
          globalScale: scale,
          activeWidgets: state.activeWidgets.map((w) => ({ ...w, scale })),
        }));
      },

      resetAllPositions: () => {
        return (async () => {
          const { work } = await getPrimaryMonitorInfo();
          // Brings back hidden/minimised windows first; the exact spots are set right after.
          await invoke("widget_reset_positions").catch(() => {});
          const widgets = get().activeWidgets;
          const spots = arrangeInArea(
            widgets.map((w) => ({ width: w.width * (w.scale || 1), height: w.height * (w.scale || 1) })),
            work
          );
          set({
            activeWidgets: widgets.map((w, i) => ({ ...w, x: spots[i].x, y: spots[i].y, visible: true })),
            allWidgetsVisible: true,
          });
          widgets.forEach((w, i) => {
            invoke("widget_set_position", { widgetId: w.id, x: spots[i].x, y: spots[i].y }).catch(() => {});
          });
        })();
      },

      fetchSystemMetrics: async () => {
        try {
          const metrics = await invoke<SystemMetrics>("widget_get_system_metrics");
          if (metrics) {
            set({ systemMetrics: metrics, isMetricsLoading: false, metricsUnavailable: false });
          }
        } catch {
          // Never invent numbers: widgets show "sem dados" instead.
          set({ isMetricsLoading: false, systemMetrics: null, metricsUnavailable: true });
        }
      },

      launchNativeWidgetWindow: async (widget: WidgetInstance) => {
        try {
          const posX = Math.max(20, Math.round(widget.x));
          const posY = Math.max(20, Math.round(widget.y));
          const scale = widget.scale || 1;
          const width = Math.max(120, Math.round(widget.width * scale));
          const height = Math.max(90, Math.round(widget.height * scale));

          console.log(`[Widgets] Lançando janela nativa para '${widget.title}' (${widget.id}) em (${posX}, ${posY})`);
          await invoke("widget_open_window", {
            widgetId: widget.id,
            title: widget.title,
            x: posX,
            y: posY,
            width,
            height,
            alwaysOnTop: widget.alwaysOnTop,
          });
        } catch (err) {
          console.error(`[Widgets] Falha ao abrir janela nativa do widget ${widget.id}:`, err);
        }
      },

      closeNativeWidgetWindow: async (widgetId: string) => {
        try {
          await invoke("widget_close_window", { widgetId });
        } catch (err) {
          console.warn(`[Widgets] Falha ao fechar janela nativa ${widgetId}:`, err);
        }
      },

      launchAllActiveWidgets: () => {
        const { activeWidgets, allWidgetsVisible } = get();
        if (!allWidgetsVisible) return;
        activeWidgets.forEach((w) => {
          if (w.visible && w.enabled) {
            get().launchNativeWidgetWindow(w);
          }
        });
      },
    }),
    {
      name: "pmm_desktop_widgets",
      version: 3,
      migrate: (persistedState: any, version: number) => migrateWidgetsState(persistedState, version),
      partialize: (state) => ({
        activeWidgets: state.activeWidgets,
        allWidgetsVisible: state.allWidgetsVisible,
        globalTheme: state.globalTheme,
        globalScale: state.globalScale,
        globalOpacity: state.globalOpacity,
      }),
    }
  )
);

// Each widget runs in its own webview; pick up writes made by other windows.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "pmm_desktop_widgets") {
      useWidgetsStore.persist.rehydrate();
    }
  });
}
