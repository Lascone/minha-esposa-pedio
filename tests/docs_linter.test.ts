import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Documentation Linter & Consistency Validator", () => {
  it("should have all required documentation markdown files present", () => {
    const requiredDocs = [
      "README.md",
      "AGENTS.md",
      "docs/widgets/README.md",
      "docs/widgets/COMPANIONS.md",
      "docs/autoclick/README.md",
    ];

    for (const doc of requiredDocs) {
      const fullPath = path.resolve(process.cwd(), doc);
      expect(fs.existsSync(fullPath), `Documento ausente: ${doc}`).toBe(true);
    }
  });

  it("should have root AGENTS.md referencing Widgets and AutoClick", () => {
    const agentsPath = path.resolve(process.cwd(), "AGENTS.md");
    expect(fs.existsSync(agentsPath)).toBe(true);

    const content = fs.readFileSync(agentsPath, "utf-8");
    expect(content).toContain("Auto Click");
    expect(content).toContain("Widgets");
  });

  it("should have Desktop Widgets documented in docs/widgets/README.md", () => {
    const widgetsDoc = path.resolve(process.cwd(), "docs/widgets/README.md");
    expect(fs.existsSync(widgetsDoc)).toBe(true);

    const content = fs.readFileSync(widgetsDoc, "utf-8");
    expect(content).toContain("Relógio");
    expect(content).toContain("Clima");
    expect(content).toContain("Windows 7");
  });
});
