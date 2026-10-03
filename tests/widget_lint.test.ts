import { describe, it, expect } from "vitest";
import {
  REFERENCE_WIDGET,
  isNewWidgetRequest,
  lintWidget,
  looksLikeDifferentWidget,
} from "@/projects/widgets/custom/aiPrompt";
import { geminiGenerationConfig, geminiModelsToTry } from "@/core/services/aiService";

const ok = {
  html: '<div id="app"><span id="hora"></span></div>',
  css: "#app{width:100%;height:100%}",
  js: 'function start(){ var h = document.getElementById("hora"); h.textContent = "10:00"; WidgetAPI.emitReady(); }\nstart();',
};

describe("lintWidget", () => {
  it("accepts a correct gadget and the reference widget", () => {
    expect(lintWidget(ok)).toEqual([]);
    expect(lintWidget(REFERENCE_WIDGET as any)).toEqual([]);
  });

  it("finds syntax errors", () => {
    const issues = lintWidget({ ...ok, js: ok.js.replace("start();", "start(;") });
    expect(issues.some((i) => i.includes("sintaxe"))).toBe(true);
  });

  it("finds sandbox-blocked APIs", () => {
    const issues = lintWidget({ ...ok, js: `${ok.js}\nlocalStorage.setItem("a","1"); alert("oi");` });
    expect(issues.some((i) => i.includes("localStorage"))).toBe(true);
    expect(issues.some((i) => i.includes("alert"))).toBe(true);
  });

  it("ignores blocked words inside comments and method names", () => {
    expect(lintWidget({ ...ok, js: `// nada de localStorage aqui\n${ok.js}\nobj.alert = 1; x.prompt("a");` })).toEqual([]);
  });

  it("finds ids missing from the HTML", () => {
    const issues = lintWidget({ ...ok, js: `${ok.js}\ndocument.querySelector("#botao").onclick = null;` });
    expect(issues.some((i) => i.includes("#botao"))).toBe(true);
  });

  it("accepts ids the script creates itself", () => {
    const js = `var d = document.createElement("div"); d.id = "extra"; document.body.appendChild(d); document.getElementById("extra"); WidgetAPI.emitReady();`;
    expect(lintWidget({ ...ok, js })).toEqual([]);
  });

  it("requires emitReady and no modules or inline scripts", () => {
    const issues = lintWidget({ html: `${ok.html}<script>1</script>`, css: "", js: 'import x from "y";' });
    expect(issues.some((i) => i.includes("emitReady"))).toBe(true);
    expect(issues.some((i) => i.includes("import"))).toBe(true);
    expect(issues.some((i) => i.includes("<script>"))).toBe(true);
  });
});

describe("new gadget detection", () => {
  it("spots requests for another gadget", () => {
    expect(isNewWidgetRequest("agora cria outro gadget de clima")).toBe(true);
    expect(isNewWidgetRequest("faz um novo relógio analógico")).toBe(true);
    expect(isNewWidgetRequest("quero um widget novo de calendário")).toBe(true);
    expect(isNewWidgetRequest("cria do zero um contador de água")).toBe(true);
  });

  it("keeps changes to the current gadget as changes", () => {
    expect(isNewWidgetRequest("deixa o fundo azul")).toBe(false);
    expect(isNewWidgetRequest("coloca uma nova cor nos botões")).toBe(false);
    expect(isNewWidgetRequest("adiciona partículas de coração")).toBe(false);
  });

  it("tells a different gadget from the same one", () => {
    const cur = { id: "relogio-misa", name: "Relógio Misa" };
    expect(looksLikeDifferentWidget(cur, { id: "relogio-misa", name: "Relógio Misa Rosa" })).toBe(false);
    expect(looksLikeDifferentWidget(cur, { id: "relogio-misa-2", name: "Relógio Misa" })).toBe(false);
    expect(looksLikeDifferentWidget(cur, { id: "clima-fofo", name: "Clima Fofo" })).toBe(true);
    // Seen live: the AI kept the old id for a completely different gadget.
    expect(looksLikeDifferentWidget({ id: "relogio-rosa", name: "Relógio Rosa" }, { id: "relogio-rosa", name: "Contador de Água" })).toBe(true);
    expect(looksLikeDifferentWidget({ id: "relogio-rosa", name: "Relógio Rosa" }, { id: "relogio-rosa", name: "Relógio Rosa Neon" })).toBe(false);
  });
});

describe("Gemini model choice", () => {
  it("tries the selected model first, then only models the key has", () => {
    const list = geminiModelsToTry("gemini-3.8-flash", ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.1-pro-preview"]);
    expect(list[0]).toBe("gemini-3.8-flash");
    expect(list).toContain("gemini-2.5-flash");
    expect(list).not.toContain("gemini-3.7-flash");
    expect(list.length).toBeLessThanOrEqual(4);
  });

  it("uses Gemini 3 thinking levels without a custom temperature", () => {
    expect(geminiGenerationConfig("gemini-3.8-flash", 1000)).toEqual({ maxOutputTokens: 1000, thinkingConfig: { thinkingLevel: "medium" } });
    expect((geminiGenerationConfig("gemini-3.5-flash-lite", 1000) as any).thinkingConfig.thinkingLevel).toBe("low");
    expect(geminiGenerationConfig("gemini-2.5-flash", 1000)).toEqual({ temperature: 0.7, maxOutputTokens: 1000 });
  });
});
