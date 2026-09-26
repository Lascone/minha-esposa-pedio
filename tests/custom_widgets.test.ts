import { describe, it, expect, beforeEach } from "vitest";
import { useCustomWidgetsStore } from "../src/projects/widgets/custom/customWidgetsStore";
import { CustomWidgetPackage } from "../src/projects/widgets/custom/types";
import { TEMPLATE_NEON_CLOCK } from "../src/projects/widgets/custom/templates";

describe("Custom Widgets (Adicionar Personalizado) Module", () => {
  beforeEach(() => {
    useCustomWidgetsStore.setState({
      packages: [TEMPLATE_NEON_CLOCK],
    });
  });

  it("should have official default templates with valid structure", () => {
    const store = useCustomWidgetsStore.getState();
    expect(store.packages.length).toBeGreaterThanOrEqual(1);

    const clock = store.packages.find((p) => p.manifest.id === "custom-neon-clock");
    expect(clock).toBeDefined();
    expect(clock?.manifest.name).toBe("Relógio Cyber Neon");
    expect(clock?.manifest.entry).toBe("index.html");
    expect(clock?.manifest.permissions).toContain("storage");
    expect(clock?.html).toContain("time-display");
    expect(clock?.js).toContain("WidgetAPI");
  });

  it("should save a new custom widget package", () => {
    const store = useCustomWidgetsStore.getState();

    const newPkg: CustomWidgetPackage = {
      manifest: {
        id: "custom-test-notes",
        name: "Notas de Teste",
        version: "1.0.0",
        author: "Dev Teste",
        description: "Widget de notas de teste",
        category: "productivity",
        icon: "📝",
        entry: "index.html",
        defaultWidth: 240,
        defaultHeight: 200,
        minWidth: 180,
        minHeight: 150,
      },
      html: "<div class='note'>Teste</div>",
      css: ".note { color: red; }",
      js: "WidgetAPI.emitReady();",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    store.savePackage(newPkg);

    const saved = useCustomWidgetsStore.getState().getPackage("custom-test-notes");
    expect(saved).toBeDefined();
    expect(saved?.manifest.name).toBe("Notas de Teste");
    expect(useCustomWidgetsStore.getState().packages.length).toBe(2);
  });

  it("should duplicate an existing custom widget", () => {
    const store = useCustomWidgetsStore.getState();
    const duplicated = store.duplicatePackage("custom-neon-clock");

    expect(duplicated).toBeDefined();
    expect(duplicated?.manifest.id).not.toBe("custom-neon-clock");
    expect(duplicated?.manifest.name).toContain("(Cópia)");
    expect(useCustomWidgetsStore.getState().packages.length).toBe(2);
  });

  it("should export and import a widget package as json", () => {
    const store = useCustomWidgetsStore.getState();
    const jsonStr = store.exportPackageAsJson("custom-neon-clock");

    expect(jsonStr).toBeTruthy();
    expect(typeof jsonStr).toBe("string");

    const parsed = JSON.parse(jsonStr!);
    expect(parsed.manifest.name).toBe("Relógio Cyber Neon");

    // Test import
    const importRes = store.importPackageFromJson(jsonStr!);
    expect(importRes.success).toBe(true);
    expect(importRes.pkg).toBeDefined();
  });

  it("should safely reject invalid json import", () => {
    const store = useCustomWidgetsStore.getState();
    const res = store.importPackageFromJson("invalid json {}");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    const missingManifest = store.importPackageFromJson(JSON.stringify({ html: "<div></div>" }));
    expect(missingManifest.success).toBe(false);
  });

  it("should delete a custom widget package", () => {
    const store = useCustomWidgetsStore.getState();
    store.deletePackage("custom-neon-clock");
    expect(useCustomWidgetsStore.getState().getPackage("custom-neon-clock")).toBeUndefined();
    expect(useCustomWidgetsStore.getState().packages.length).toBe(0);
  });
});
