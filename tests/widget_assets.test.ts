import { describe, it, expect } from "vitest";
import { findLinks, nextAssetName, resolveAssetRefs } from "../src/projects/widgets/custom/widgetAssets";
import { chatTextOnly, hasWidgetCode } from "../src/projects/widgets/custom/aiPrompt";
import { buildWidgetUserTurn } from "../src/core/services/aiService";

describe("imagens salvas no gadget", () => {
  it("acha os links da mensagem sem a pontuação do fim", () => {
    const text = "cria um relógio https://wallpapers.com/images/hd/misa.jpg, com partículas. https://x.com/a.png!";
    expect(findLinks(text)).toEqual(["https://wallpapers.com/images/hd/misa.jpg", "https://x.com/a.png"]);
  });

  it("troca pmm-asset:// pela imagem salva e mantém referências desconhecidas", () => {
    const css = '.bg { background: url("pmm-asset://imagem-1"); } .x { background: url("pmm-asset://imagem-9"); }';
    const out = resolveAssetRefs(css, { "imagem-1": "data:image/webp;base64,AAA" });
    expect(out).toContain('url("data:image/webp;base64,AAA")');
    expect(out).toContain("pmm-asset://imagem-9");
  });

  it("numera imagens novas sem repetir nomes", () => {
    expect(nextAssetName(undefined)).toBe("imagem-1");
    expect(nextAssetName({ "imagem-1": "a" }, ["imagem-2"])).toBe("imagem-3");
  });

  it("lista as imagens salvas para a IA em todo pedido", () => {
    const turn = buildWidgetUserTurn("coloca números", { assetNames: ["imagem-1"] });
    expect(turn).toContain("pmm-asset://imagem-1");
    expect(turn).toContain("[IMAGENS DA USUÁRIA]");
  });
});

describe("resposta sem código", () => {
  it("reconhece quando a IA só conversou", () => {
    expect(hasWidgetCode("Pode deixar amor, vou colocar a imagem e os números!")).toBe(false);
    expect(hasWidgetCode("Pronto!\n```html\n<main></main>\n```")).toBe(true);
    expect(hasWidgetCode("Pronto!\n```css\n.a{}")).toBe(true);
  });

  it("cita só o texto da conversa", () => {
    expect(chatTextOnly("Oi **amor**\n```css\n.a{}\n```\nbeijo")).toBe("Oi amor beijo");
  });
});
