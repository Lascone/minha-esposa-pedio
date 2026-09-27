import { describe, it, expect } from "vitest";
import { categorizeMod } from "../src/projects/mods/services/windhawkService";
import { useModsStore } from "../src/projects/mods/store/modsStore";

describe("Windows Mods / Windhawk Module", () => {
  it("should categorize mods accurately by metadata keywords and target processes", () => {
    expect(
      categorizeMod("windows-11-taskbar-styler", "Windows 11 Taskbar Styler", "Custom styling", ["explorer.exe"])
    ).toBe("taskbar");

    expect(
      categorizeMod("windows-11-start-menu-styler", "Start Menu Styler", "Menu adjustments", ["StartMenuExperienceHost.exe"])
    ).toBe("startmenu");

    expect(
      categorizeMod("classic-file-explorer", "Classic File Explorer", "Restores folder ribbon", ["explorer.exe"])
    ).toBe("explorer");

    expect(
      categorizeMod("alt-drag", "Alt Drag", "Move window using alt key", ["*"])
    ).toBe("windows");

    expect(
      categorizeMod("aero-acrylic-glass", "Aero Acrylic Glass", "Translucent theme effect", ["dwm.exe"])
    ).toBe("aesthetics");

    expect(
      categorizeMod("custom-beep", "Volume Booster", "Sound and audio adjustments", ["audiodg.exe"])
    ).toBe("system");
  });

  it("should toggle mod active and favorite states in store", () => {
    const store = useModsStore.getState();

    // Toggle favorite
    const testModId = "test-mod-123";
    expect(store.favoriteModIds.includes(testModId)).toBe(false);

    store.toggleFavorite(testModId);
    expect(useModsStore.getState().favoriteModIds.includes(testModId)).toBe(true);

    store.toggleFavorite(testModId);
    expect(useModsStore.getState().favoriteModIds.includes(testModId)).toBe(false);

    // Toggle mod enable/disable
    expect(store.enabledModIds.includes(testModId)).toBe(false);
    store.toggleMod(testModId);
    expect(useModsStore.getState().enabledModIds.includes(testModId)).toBe(true);
    expect(useModsStore.getState().installedModIds.includes(testModId)).toBe(true);

    store.toggleMod(testModId);
    expect(useModsStore.getState().enabledModIds.includes(testModId)).toBe(false);
  });

  it("should provide C++ source code with hooks and header directives", async () => {
    const { windhawkService } = await import("../src/projects/mods/services/windhawkService");
    const source = await windhawkService.fetchModSource("taskbar-labels");
    expect(source).toContain("WindhawkMod");
    expect(source).toContain("Wh_ModInit");
  });

  it("should create custom mods in our integrated engine", async () => {
    const store = useModsStore.getState();
    await store.createCustomMod({
      id: "meu-custom-mod",
      name: "Meu Custom Mod",
      description: "Mod de teste próprio",
      targetProcess: "explorer.exe",
    });

    const currentMods = useModsStore.getState().mods;
    const found = currentMods.find((m) => m.id === "meu-custom-mod");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Meu Custom Mod");
    expect(useModsStore.getState().enabledModIds).toContain("meu-custom-mod");
  });

  it("should provide complete offline catalog fallback if remote service is unavailable", async () => {
    const { windhawkService } = await import("../src/projects/mods/services/windhawkService");
    const catalog = await windhawkService.fetchCatalog();
    expect(catalog.length).toBeGreaterThan(600);
    const focusMod = catalog.find((m) => m.id === "no-focus-rectangle");
    expect(focusMod).toBeDefined();
    expect(focusMod?.targetProcesses).toContain("explorer.exe");
  });
});
