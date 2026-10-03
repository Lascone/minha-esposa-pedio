import { describe, it, expect } from "vitest";
import { PARTICLES_RUNTIME, PARTICLE_PRESETS } from "../src/projects/widgets/custom/particlesRuntime";
import { WIDGET_TECH_RULES } from "../src/projects/widgets/custom/aiPrompt";

describe("WidgetAPI.particles", () => {
  it("o código injetado no iframe é JavaScript válido", () => {
    expect(() => new Function(PARTICLES_RUNTIME)).not.toThrow();
    expect(PARTICLES_RUNTIME).not.toMatch(/<\/script/i);
  });

  it("registra a API e todos os presets", () => {
    const fakeWindow: any = { WidgetAPI: {} };
    new Function("window", PARTICLES_RUNTIME)(fakeWindow);
    expect(typeof fakeWindow.WidgetAPI.particles).toBe("function");
    expect(fakeWindow.WidgetAPI.particles.presets).toEqual([...PARTICLE_PRESETS]);
  });

  it("a IA conhece todos os presets", () => {
    for (const preset of PARTICLE_PRESETS) expect(WIDGET_TECH_RULES).toContain(`"${preset}"`);
  });
});
