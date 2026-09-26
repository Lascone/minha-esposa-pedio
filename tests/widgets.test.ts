import { describe, it, expect, vi } from "vitest";
import { WIDGET_REGISTRY, getWidgetDefinition } from "../src/projects/widgets/registry";
import { useWidgetsStore } from "../src/projects/widgets/store/widgetsStore";

describe("Windows Desktop Widgets Module", () => {
  it("should have all 21 standard widgets registered with complete metadata", () => {
    expect(WIDGET_REGISTRY.length).toBe(21);

    const types = [
      "analog-clock",
      "digital-clock",
      "calendar",
      "weather",
      "sticky-notes",
      "shortcuts",
      "cpu-meter",
      "ram-meter",
      "storage-meter",
      "battery-meter",
      "pomodoro",
      "countdown",
      "love-quotes",
      "photo-frame",
      "world-clock",
      "volume-meter",
      "calculator",
      "crypto-currency",
      "rss-news",
      "hydration-reminder",
      "ambient-audio",
    ];

    for (const type of types) {
      const def = getWidgetDefinition(type);
      expect(def, `Widget type ${type} should be registered`).toBeDefined();
      expect(def?.name).toBeTruthy();
      expect(def?.description).toBeTruthy();
      expect(def?.defaultWidth).toBeGreaterThan(0);
      expect(def?.defaultHeight).toBeGreaterThan(0);
      expect(def?.tags.length).toBeGreaterThan(0);
    }
  });

  it("should allow adding, configuring and removing widgets in the store", () => {
    const store = useWidgetsStore.getState();
    const initialCount = store.activeWidgets.length;

    // 1. Add analog clock
    const newWidget = store.addWidget("analog-clock");
    expect(newWidget).toBeDefined();
    expect(newWidget.type).toBe("analog-clock");
    expect(useWidgetsStore.getState().activeWidgets.length).toBe(initialCount + 1);

    // 2. Update widget settings
    store.updateWidgetSettings(newWidget.id, { showDate: false });
    const updated = useWidgetsStore.getState().activeWidgets.find((w) => w.id === newWidget.id);
    expect(updated?.settings.showDate).toBe(false);

    // 3. Update theme, scale and opacity
    store.setWidgetTheme(newWidget.id, "cute-pastel");
    store.setWidgetScale(newWidget.id, 1.2);
    store.setWidgetOpacity(newWidget.id, 0.85);

    const styledWidget = useWidgetsStore.getState().activeWidgets.find((w) => w.id === newWidget.id);
    expect(styledWidget?.theme).toBe("cute-pastel");
    expect(styledWidget?.scale).toBe(1.2);
    expect(styledWidget?.opacity).toBe(0.85);

    // 4. Toggle visibility
    store.toggleWidgetVisibility(newWidget.id);
    const hiddenWidget = useWidgetsStore.getState().activeWidgets.find((w) => w.id === newWidget.id);
    expect(hiddenWidget?.visible).toBe(false);

    // 5. Remove widget
    store.removeWidget(newWidget.id);
    expect(useWidgetsStore.getState().activeWidgets.find((w) => w.id === newWidget.id)).toBeUndefined();
  });

  it("should support resetting widget positions and toggling all widgets", () => {
    const store = useWidgetsStore.getState();

    // Toggle all off
    store.toggleAllWidgets(false);
    expect(useWidgetsStore.getState().allWidgetsVisible).toBe(false);

    // Toggle all on
    store.toggleAllWidgets(true);
    expect(useWidgetsStore.getState().allWidgetsVisible).toBe(true);

    // Reset positions
    store.resetAllPositions();
    const active = useWidgetsStore.getState().activeWidgets;
    for (const w of active) {
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.y).toBeGreaterThanOrEqual(0);
      expect(w.visible).toBe(true);
    }
  });

  it("should never invent system metrics when the native command is unavailable", async () => {
    await useWidgetsStore.getState().fetchSystemMetrics();

    const state = useWidgetsStore.getState();
    expect(state.systemMetrics).toBeNull();
    expect(state.metricsUnavailable).toBe(true);
  });

  it("should store real metrics returned by the native command", async () => {
    const real = {
      cpu_percent: 37.5,
      cpu_name: "Test CPU",
      ram: { total_mb: 8192, used_mb: 4096, free_mb: 4096, used_percent: 50 },
      disks: [{ drive: "C:", total_gb: 100, free_gb: 40, used_gb: 60, used_percent: 60 }],
      battery: { has_battery: false, is_on_battery: false, is_charging: false, percentage: 0 },
    };
    vi.doMock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(real) }));
    vi.resetModules();
    const { useWidgetsStore: freshStore } = await import("../src/projects/widgets/store/widgetsStore");
    await freshStore.getState().fetchSystemMetrics();

    expect(freshStore.getState().systemMetrics).toEqual(real);
    expect(freshStore.getState().metricsUnavailable).toBe(false);
    vi.doUnmock("@tauri-apps/api/core");
  });
});
