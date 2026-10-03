import { describe, it, expect } from "vitest";
import {
  buildCustomWidgetAiPrompt,
  looksTruncated,
  parseAiWidgetResponse,
  REFERENCE_WIDGET,
} from "../src/projects/widgets/custom/aiPrompt";
import { buildWidgetUserTurn, geminiCandidateText } from "../src/core/services/aiService";
import { WIDGET_ECOSYSTEM_BRAIN } from "../src/core/services/widgetBrain";

const fencedAnswer = [
  "Mds amor, tu me pede cada coisa kkkk mas tá pronto! 💖",
  "",
  "```json",
  '{ "id": "Relógio Fofo", "name": "Relógio Fofo", "category": "time", "icon": "⏰", "defaultWidth": 300, "defaultHeight": 200 }',
  "```",
  "",
  "```html",
  '<main class="card"><p id="t">00:00</p></main>',
  "```",
  "",
  "```css",
  '.card { color: "pink"; }',
  "```",
  "",
  "```javascript",
  "const s = `template ${1}`;",
  "WidgetAPI.emitReady();",
  "```",
].join("\n");

describe("AI widget answers", () => {
  it("reads one fenced block per file without any escaping", () => {
    const r = parseAiWidgetResponse(fencedAnswer);
    expect(r.manifest.id).toBe("relogio-fofo");
    expect(r.manifest.defaultWidth).toBe(300);
    expect(r.html).toContain('<main class="card">');
    expect(r.css).toContain('color: "pink"');
    expect(r.js).toContain("`template ${1}`");
    expect(r.message).toBe("Mds amor, tu me pede cada coisa kkkk mas tá pronto! 💖");
  });

  it("still accepts the old single-JSON answers", () => {
    const old = JSON.stringify({ manifest: { name: "Antigo" }, html: "<div></div>", css: "", js: "" });
    const r = parseAiWidgetResponse(old);
    expect(r.manifest.name).toBe("Antigo");
    expect(r.html).toBe("<div></div>");
  });

  it("detects an answer cut in the middle of a code block", () => {
    const cut = fencedAnswer.slice(0, fencedAnswer.indexOf("```javascript") + 30);
    expect(looksTruncated(cut)).toBe(true);
    expect(looksTruncated(fencedAnswer)).toBe(false);
    expect(() => parseAiWidgetResponse("```css\n.a{}\n```\n```html\n<div>")).toThrow(/cortada/);
  });

  it("ignores Gemini thinking parts", () => {
    const data = {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: "pensando...", thought: true }, { text: "resposta " }, { text: "final" }] },
        },
      ],
    };
    expect(geminiCandidateText(data)).toEqual({ text: "resposta final", finishReason: "STOP" });
  });

  it("sends the current widget as four separate files", () => {
    const turn = buildWidgetUserTurn("deixa rosa", { currentError: "x is null" }, {
      manifest: { ...REFERENCE_WIDGET.manifest, version: "1", author: "IA", description: "", entry: "index.html" } as any,
      html: "<p>oi</p>",
      css: "p{}",
      js: "WidgetAPI.emitReady();",
      createdAt: 0,
      updatedAt: 0,
    });
    expect(turn).toContain("index.html:\n```html\n<p>oi</p>\n```");
    expect(turn).toContain("style.css:\n```css\np{}\n```");
    expect(turn).toContain("script.js:\n```js\nWidgetAPI.emitReady();\n```");
    expect(turn).toContain("[PEDIDO DA USUÁRIA]\ndeixa rosa");
    expect(turn).toContain("x is null");
  });

  it("uses the same rules in the chat and in the copy-paste prompt", () => {
    const copy = buildCustomWidgetAiPrompt({ description: "um relógio" });
    for (const text of [copy, WIDGET_ECOSYSTEM_BRAIN]) {
      expect(text).toContain("PADRÃO VISUAL");
      expect(text).toContain("EXEMPLO DE REFERÊNCIA");
      expect(text).toContain("```html");
      expect(text).toContain("data-theme");
    }
  });

  it("the reference widget itself parses and calls emitReady", () => {
    const answer = ["```json", JSON.stringify(REFERENCE_WIDGET.manifest), "```", "```html", REFERENCE_WIDGET.html, "```", "```css", REFERENCE_WIDGET.css, "```", "```js", REFERENCE_WIDGET.js, "```"].join("\n");
    const r = parseAiWidgetResponse(answer);
    expect(r.manifest.name).toBe("Dias Juntos");
    expect(r.js).toContain("WidgetAPI.emitReady()");
  });
});
