import { describe, it, expect } from "vitest";
import { buildGoogleFontsUrl, extractCssImports, fontLinkTags, normalizeFontSpec } from "../src/projects/widgets/custom/googleFonts";
import { parseAiWidgetResponse, REFERENCE_WIDGET } from "../src/projects/widgets/custom/aiPrompt";

describe("Google Fonts (css2)", () => {
  it("monta a URL css2 com display=swap", () => {
    expect(buildGoogleFontsUrl(["Fredoka:wght@400..700", "Baloo 2"])).toBe(
      "https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Baloo+2&display=swap"
    );
  });

  it("corrige eixos fora de ordem e tuplas desordenadas, como a API exige", () => {
    expect(normalizeFontSpec("Crimson Pro:wght,ital@700,1;400,0")).toBe("Crimson+Pro:ital,wght@0,400;1,700");
    expect(normalizeFontSpec("Nunito:wght@800;500;500")).toBe("Nunito:wght@500;800");
  });

  it("ignora nomes inválidos", () => {
    expect(normalizeFontSpec('Evil"><script>')).toBeNull();
    expect(buildGoogleFontsUrl(["<x>"])).toBeNull();
  });

  it("tira o @import do CSS para carregar como <link> (no meio do CSS ele seria ignorado)", () => {
    const { imports, css } = extractCssImports(
      "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');\n.a{font-family:'Cinzel'}"
    );
    expect(imports).toEqual(["https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap"]);
    expect(css).not.toContain("@import");
    expect(css).toContain(".a{");
  });

  it("gera as tags <link> escapando a URL", () => {
    const tags = fontLinkTags(["Pacifico"], ["https://fonts.googleapis.com/css2?family=Caveat&display=swap"]);
    expect(tags).toContain('href="https://fonts.googleapis.com/css2?family=Pacifico&amp;display=swap"');
    expect(tags).toContain("preconnect");
    expect(fontLinkTags(undefined, [])).toBe("");
  });

  it("a resposta da IA mantém as fontes do manifest", () => {
    const raw = [
      "```json",
      '{ "name": "Teste", "fonts": ["Fredoka:wght@400..700"] }',
      "```",
      "```html",
      "<main></main>",
      "```",
    ].join("\n");
    expect(parseAiWidgetResponse(raw).manifest.fonts).toEqual(["Fredoka:wght@400..700"]);
    expect(REFERENCE_WIDGET.css).not.toContain("@import");
  });
});
