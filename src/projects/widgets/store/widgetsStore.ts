import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { WidgetInstance, WidgetType, WidgetTheme, SystemMetrics } from "../types";
import { getWidgetDefinition } from "../registry";

interface WidgetsState {
  activeWidgets: WidgetInstance[];
  allWidgetsVisible: boolean;
  globalTheme: WidgetTheme;
  globalScale: number;
  globalOpacity: number;
  systemMetrics: SystemMetrics | null;
  isMetricsLoading: boolean;
  selectedWidgetId: string | null;

  // Actions
  addWidget: (type: WidgetType) => WidgetInstance;
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
  resetAllPositions: () => void;
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
      selectedWidgetId: null,

      addWidget: (type: WidgetType) => {
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
        // Cascade positions nicely
        set((state) => {
          const resetList = state.activeWidgets.map((w, index) => ({
            ...w,
            x: 80 + (index % 4) * 260,
            y: 80 + Math.floor(index / 4) * 240,
            visible: true,
          }));
          return { activeWidgets: resetList, allWidgetsVisible: true };
        });

        // Tell native Rust to reposition all active widget windows onto primary monitor
        invoke("widget_reset_positions").catch(() => {});
      },

      fetchSystemMetrics: async () => {
        try {
          const metrics = await invoke<SystemMetrics>("widget_get_system_metrics");
          if (metrics) {
            set({ systemMetrics: metrics, isMetricsLoading: false });
          }
        } catch {
          // Graceful fallback for browser dev mode
          const ramTotal = 16384;
          const ramUsed = 7420;
          set({
            isMetricsLoading: false,
            systemMetrics: {
              cpu_percent: Math.round((15 + Math.random() * 20) * 10) / 10,
              cpu_name: "Intel / AMD Processor",
              ram: {
                total_mb: ramTotal,
                used_mb: ramUsed,
                free_mb: ramTotal - ramUsed,
                used_percent: 45.3,
              },
              disks: [
                {
                  drive: "C:",
                  total_gb: 476.0,
                  free_gb: 215.4,
                  used_gb: 260.6,
                  used_percent: 54.7,
                },
              ],
              battery: {
                has_battery: true,
                is_on_battery: false,
                is_charging: true,
                percentage: 92,
              },
            },
          });
        }
      },

      launchNativeWidgetWindow: async (widget: WidgetInstance) => {
        try {
          await invoke("widget_open_window", {
            widgetId: widget.id,
            title: widget.title,
            x: Math.round(widget.x),
            y: Math.round(widget.y),
            width: Math.round(widget.width),
            height: Math.round(widget.height),
            alwaysOnTop: widget.alwaysOnTop,
          });
        } catch {}
      },

      closeNativeWidgetWindow: async (widgetId: string) => {
        try {
          await invoke("widget_close_window", { widgetId });
        } catch {}
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
