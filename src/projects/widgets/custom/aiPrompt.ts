import { CustomWidgetManifest } from "./types";

export interface AiWidgetRequest {
  description: string;
  backgroundImageUrl?: string;
}

export interface AiWidgetResult {
  manifest: CustomWidgetManifest;
  html: string;
  css: string;
  js: string;
  /** Text the AI wrote outside the code blocks (its chat reply). */
  message?: string;
}

const VALID_CATEGORIES: CustomWidgetManifest["category"][] = [
  "time",
  "system",
  "productivity",
  "utilities",
];

/** How the widget runs: shared by the copy-paste prompt and the in-app chat. */
export const WIDGET_TECH_RULES = `## COMO O WIDGET FUNCIONA (regras obrigatórias)
- Roda dentro de um iframe isolado (sandbox "allow-scripts"). Não existe Node.js, require, import de módulos, acesso a arquivos locais, localStorage confiável nem acesso ao Windows.
- Apenas HTML, CSS e JavaScript puro (sem React, sem bibliotecas, sem CDN de scripts).
- Fontes do Google Fonts (catálogo inteiro de fonts.google.com): liste no manifest em "fonts", no formato da API css2: "Nome da Família" ou "Nome:wght@400;700" (pesos fixos) ou "Nome:wght@300..900" (faixa, em fontes variáveis) ou "Nome:ital,wght@0,400;1,700" (eixos em ordem alfabética). Máximo de 3 famílias. O app carrega sozinho (com display=swap): NÃO use @import nem <link> para fontes. No CSS, use o nome exato da família com fallback (ex.: font-family: 'Fredoka', system-ui, sans-serif).
- html e body já vêm com margin 0, 100% de largura/altura, overflow hidden e fundo TRANSPARENTE. Não pinte o body: todo o visual fica num container principal que ocupa 100% x 100%.
- O tamanho da janela pode mudar: use unidades relativas (%, clamp(), cqmin com container-type: size) e flex/grid para nada estourar nem ficar cortado.
- O tema atual fica em <html data-theme="aero-glass | cute-pastel | dark-modern | cyber-neon"> e muda ao vivo. Defina as cores em variáveis CSS e ajuste por tema com seletores [data-theme="dark-modern"] etc.
- Objeto global WidgetAPI:
  - WidgetAPI.getConfig(chave, valorPadrao) → lê uma preferência salva
  - WidgetAPI.setConfig(chave, valor) → salva uma preferência (contadores, textos, escolhas)
  - WidgetAPI.requestResize(largura, altura) → pede para redimensionar
  - WidgetAPI.getTheme() / WidgetAPI.onThemeChange(function (tema) { ... })
  - WidgetAPI.emitReady() → OBRIGATÓRIO no final, quando o widget terminar de carregar
- JavaScript defensivo: comece numa função start() chamada quando o DOM estiver pronto, confira se cada elemento existe antes de usar e nunca deixe um erro quebrar o widget.
- Nunca invente dados falsos (temperatura, CPU, notícias...). Se algo depende da internet e falhar, mostre uma mensagem amigável.
- Nunca invente URLs de imagens (imgur e afins quebram). Prefira desenhar com SVG/CSS. Use uma URL de imagem só se a usuária enviar uma.
- Imagens que a usuária enviar são obrigatórias no resultado. No app elas chegam como endereços pmm-asset://nome, que funcionam como uma URL normal em url(...) e em src.
- Toda resposta traz os 4 arquivos completos, mesmo para uma mudança pequena. Nunca responda só com texto.
- Datas "AAAA-MM-DD" de APIs: new Date("2026-10-03") vira UTC e mostra o dia anterior no Brasil. Monte com new Date(ano, mes - 1, dia) ou acrescente "T12:00".
- Para dados da internet, mostre um estado de carregamento bonito (skeleton ou spinner suave) enquanto espera, esconda-o assim que os dados chegarem (ou der erro) e atualize sozinho de tempos em tempos com setInterval (nunca loops infinitos).
- Textos visíveis em português do Brasil.`;

/** What makes a widget look premium instead of "default HTML". */
export const WIDGET_DESIGN_GUIDE = `## PADRÃO VISUAL (o widget precisa parecer de um app profissional, nunca um HTML cru)
- Hierarquia clara: UM elemento principal grande (número, relógio, personagem...) e informações secundárias menores e mais suaves. Nada de tudo do mesmo tamanho.
- Tipografia: uma fonte do Google Fonts com personalidade e que combine com o tema (fofas: Fredoka, Quicksand, Nunito, Baloo 2, Comfortaa; elegantes: Playfair Display, Cormorant Garamond; modernas: Outfit, Poppins, Space Grotesk; góticas/dark: Cinzel, UnifrakturMaguntia, Creepster; tech: Orbitron, Audiowide, JetBrains Mono; manuscritas: Pacifico, Caveat, Dancing Script), declarada em "fonts" no manifest, com pesos variados (800 no destaque, 500–600 no resto), letter-spacing ajustado e font-variant-numeric: tabular-nums em números que mudam.
- Profundidade: fundo em camadas (gradiente + brilho radial + leve textura/padrão), vidro fosco com backdrop-filter, borda interna clara (inset box-shadow) e sombra externa suave. Cantos de 20–28px.
- Paleta coesa de 2–3 cores por tema, com contraste legível (texto claro em fundo escuro ou o contrário). Nunca use azul/cinza padrão do navegador.
- Controles bonitos: botões arredondados com gradiente ou vidro, ícones em SVG inline (nunca emojis como único ícone de botão), estados :hover e :active (scale 0.96), cursor pointer, foco visível.
- Vida: micro-animações suaves (entrada com fade/slide, transições de 200–300ms, um detalhe animado sutil como brilho, partículas ou respiração). Respeite prefers-reduced-motion.
- Espaçamento generoso e consistente (múltiplos de 4px), alinhamentos perfeitos, nada encostado na borda.
- Decoração com propósito: SVGs desenhados à mão (corações, estrelas, flores, personagens) combinando com o tema do pedido.
- Ícones precisam representar o que significam (sol = círculo com raios, nuvem, gotas de chuva, floco de neve, raio...). Cada situação tem o seu ícone; nunca repita um ícone genérico (✓, círculo) para coisas diferentes. Se um SVG bom ficar difícil, um emoji grande e bem posicionado é melhor do que um ícone errado.
- Relógio analógico e outros itens em volta de um círculo: mostrador redondo de verdade (aspect-ratio: 1, centralizado, manifest quadrado como 260x260), números posicionados com Math.sin/Math.cos e sempre EM PÉ (nunca girados junto com o ângulo), ponteiros com tamanhos e espessuras diferentes (horas curto e grosso, minutos longo, segundos fino) e um pino no centro. Com imagem de fundo, ponha o mostrador num vidro fosco semitransparente por cima dela.
- Tudo cabe no tamanho do manifest sem rolagem nem corte: conte os itens e escolha o layout (ex.: 3 dias = grid-template-columns: repeat(3, 1fr) numa linha), reduza fontes com clamp() e esconda detalhes secundários com @container quando o espaço for pequeno.
- Antes de responder, revise mentalmente: está bonito em 280x180 e em 500x350? O texto está legível nos 4 temas? Algum elemento ficou com cara de padrão do navegador? Corrija antes de entregar.`;

/** A finished widget at the expected quality bar, shown to the model as a reference. */
export const REFERENCE_WIDGET = {
  manifest: {
    id: "dias-juntos",
    name: "Dias Juntos",
    category: "time",
    icon: "💞",
    defaultWidth: 300,
    defaultHeight: 200,
    fonts: ["Nunito:wght@500;700;800;900"],
  },
  html: `<main class="card">
  <svg class="glow-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3.1 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>
  <p class="label">Juntos há</p>
  <p class="days"><span id="days">0</span><small>dias</small></p>
  <p class="since" id="since"></p>
  <button class="pill" id="change" type="button">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>
    Mudar data
  </button>
  <input type="date" id="picker" hidden />
</main>`,
  css: `:root { --bg1:#ffd6e7; --bg2:#e9d5ff; --ink:#5b2245; --soft:rgba(91,34,69,.62); --accent:#ff5c9a; --glass:rgba(255,255,255,.45); }
[data-theme="dark-modern"] { --bg1:#1e1b2e; --bg2:#2a1f3d; --ink:#fbe7f3; --soft:rgba(251,231,243,.62); --accent:#ff7ab6; --glass:rgba(255,255,255,.08); }
[data-theme="cyber-neon"] { --bg1:#0b1026; --bg2:#1a0b2e; --ink:#e0f7ff; --soft:rgba(224,247,255,.6); --accent:#22d3ee; --glass:rgba(34,211,238,.08); }
[data-theme="aero-glass"] { --bg1:rgba(255,255,255,.55); --bg2:rgba(186,230,253,.45); --ink:#0f2a44; --soft:rgba(15,42,68,.6); --accent:#ec4899; --glass:rgba(255,255,255,.35); }
.card { container-type: size; position: relative; width: 100%; height: 100%; box-sizing: border-box; padding: 8cqmin 9cqmin;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqmin; overflow: hidden;
  font-family: 'Nunito', system-ui, sans-serif; color: var(--ink); border-radius: 24px;
  background: radial-gradient(120% 90% at 15% 0%, rgba(255,255,255,.55), transparent 55%), linear-gradient(145deg, var(--bg1), var(--bg2));
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.6), inset 0 0 0 1px rgba(255,255,255,.25), 0 12px 32px rgba(40,10,40,.25);
  animation: rise .5s cubic-bezier(.2,.8,.2,1) both; }
.glow-heart { position: absolute; width: 60cqmin; right: -14cqmin; top: -16cqmin; fill: var(--accent); opacity: .14; animation: beat 2.4s ease-in-out infinite; }
.label { margin: 0; font-size: clamp(10px, 7cqmin, 16px); font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--soft); }
.days { margin: 0; display: flex; align-items: baseline; gap: 2cqmin; line-height: 1; }
.days span { font-size: clamp(28px, 30cqmin, 84px); font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -.02em;
  background: linear-gradient(180deg, var(--ink), var(--accent)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.days small { font-size: clamp(11px, 8cqmin, 20px); font-weight: 800; color: var(--accent); }
.since { margin: 0; font-size: clamp(9px, 5.5cqmin, 13px); font-weight: 600; color: var(--soft); }
.pill { margin-top: 2cqmin; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 0; border-radius: 999px; cursor: pointer;
  font: 700 clamp(9px, 5cqmin, 12px) 'Nunito', system-ui, sans-serif; color: var(--ink); background: var(--glass);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); transition: transform .2s, background .2s; }
.pill svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.pill:hover { background: rgba(255,255,255,.6); } .pill:active { transform: scale(.96); }
@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@keyframes beat { 50% { transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`,
  js: `function start() {
  var daysEl = document.getElementById("days");
  var sinceEl = document.getElementById("since");
  var picker = document.getElementById("picker");
  var button = document.getElementById("change");
  if (!daysEl || !sinceEl || !picker || !button) return WidgetAPI.emitReady();

  var start = WidgetAPI.getConfig("since", new Date().toISOString().slice(0, 10));

  function render() {
    var from = new Date(start + "T00:00:00");
    var days = Math.max(0, Math.floor((Date.now() - from.getTime()) / 86400000));
    daysEl.textContent = days.toLocaleString("pt-BR");
    sinceEl.textContent = "desde " + from.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }

  button.addEventListener("click", function () {
    picker.value = start;
    if (picker.showPicker) picker.showPicker(); else picker.click();
  });
  picker.addEventListener("change", function () {
    if (!picker.value) return;
    start = picker.value;
    WidgetAPI.setConfig("since", start);
    render();
  });

  render();
  setInterval(render, 60000);
  WidgetAPI.emitReady();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();`,
};

/** How the answer must be laid out: one fenced block per file, nothing to escape. */
export const WIDGET_RESPONSE_FORMAT = `## FORMATO DA RESPOSTA (muito importante)
Responda com UM bloco de código para cada arquivo, nesta ordem, cada um com o código COMPLETO (nunca "..." nem "resto igual"):

\`\`\`json
{ "id": "id-em-minusculas-com-hifens", "name": "Nome bonito", "description": "Frase curta", "category": "time | system | productivity | utilities (escolha UM)", "icon": "um emoji", "defaultWidth": 300, "defaultHeight": 200, "minWidth": 180, "minHeight": 120, "fonts": ["Fredoka:wght@400..700"], "tags": ["palavras", "chave"] }
\`\`\`

\`\`\`html
apenas o conteúdo de dentro do <body>
\`\`\`

\`\`\`css
todo o CSS
\`\`\`

\`\`\`js
todo o JavaScript, terminando com WidgetAPI.emitReady();
\`\`\``;

function fenced(lang: string, code: string): string {
  return "```" + lang + "\n" + code.trim() + "\n```";
}

/** Shows a widget to the model as its four files, clearly separated. */
export function formatWidgetFiles(widget: { manifest: object; html: string; css: string; js: string }): string {
  return [
    "manifest.json:",
    fenced("json", JSON.stringify(widget.manifest, null, 2)),
    "index.html:",
    fenced("html", widget.html || ""),
    "style.css:",
    fenced("css", widget.css || ""),
    "script.js:",
    fenced("js", widget.js || ""),
  ].join("\n");
}

export const REFERENCE_WIDGET_BLOCK = `## EXEMPLO DE REFERÊNCIA (nível de qualidade esperado; não copie o tema, copie o capricho)
${formatWidgetFiles(REFERENCE_WIDGET)}`;

export function buildCustomWidgetAiPrompt({ description, backgroundImageUrl }: AiWidgetRequest): string {
  const wish = description.trim() || "(descreva aqui o widget que você quer)";
  const image = backgroundImageUrl?.trim();

  const imageBlock = image
    ? `- Use esta imagem como fundo do widget (no CSS, com background-image: url("${image}"), background-size: cover e background-position: center). Coloque uma camada semitransparente por cima para o texto continuar legível.`
    : "- Não há imagem de fundo: crie um fundo em camadas (gradiente, brilho e vidro fosco) que combine com o pedido.";

  return `Você é um designer de interfaces e desenvolvedor front-end sênior. Crie um WIDGET DE DESKTOP lindo e caprichado para o aplicativo "Pedi para meu marido".

## O QUE EU QUERO
${wish}

## IMAGEM DE FUNDO
${imageBlock}

${WIDGET_TECH_RULES}

${WIDGET_DESIGN_GUIDE}

${REFERENCE_WIDGET_BLOCK}

${WIDGET_RESPONSE_FORMAT}`;
}

function extractJsonObject(raw: string): string {
  let text = raw.trim();

  const fencedJson = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedJson) {
    text = fencedJson[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Não encontrei o código do widget na resposta. Copie a resposta inteira da IA.");
  }
  return text.slice(start, end + 1);
}

const LANG_ALIASES: Record<string, "manifest" | "html" | "css" | "js"> = {
  json: "manifest",
  html: "html",
  htm: "html",
  css: "css",
  js: "js",
  javascript: "js",
};

/** Reads the "one fenced block per file" answer; null when the text has no such blocks. */
export function parseFencedWidgetResponse(raw: string): { manifest: any; html: string; css: string; js: string; message: string } | null {
  const blocks: Partial<Record<"manifest" | "html" | "css" | "js", string>> = {};
  const re = /```([a-zA-Z]+)[^\n]*\n([\s\S]*?)\n?```/g;
  let firstIndex = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const kind = LANG_ALIASES[m[1].toLowerCase()];
    if (!kind || blocks[kind] !== undefined) continue;
    if (firstIndex === -1) firstIndex = m.index;
    blocks[kind] = m[2];
  }
  if (blocks.html === undefined) return null;
  let manifest: any = {};
  if (blocks.manifest) {
    try {
      manifest = JSON.parse(blocks.manifest);
      if (manifest && typeof manifest.manifest === "object") manifest = manifest.manifest;
    } catch {
      manifest = {};
    }
  }
  const message = (firstIndex > 0 ? raw.slice(0, firstIndex) : "")
    .replace(/(?:manifest\.json|index\.html|style\.css|script\.js):?\s*$/i, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
  return { manifest, html: blocks.html, css: blocks.css ?? "", js: blocks.js ?? "", message };
}

/** A truncated answer leaves an unclosed code block: better to say so than to show half a widget. */
export function looksTruncated(raw: string): boolean {
  const fences = raw.match(/```/g)?.length ?? 0;
  return fences % 2 === 1;
}

/** True when the answer carries the gadget's files (or got cut while sending them). */
export function hasWidgetCode(raw: string): boolean {
  return /```\s*html?\b/i.test(raw) || /"html"\s*:/.test(raw) || looksTruncated(raw);
}

/** The chat part of an answer, short enough to quote back to the user. */
export function chatTextOnly(raw: string): string {
  const text = raw.replace(/```[\s\S]*?(```|$)/g, " ").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\s+/g, " ").trim();
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

export const MISSING_CODE_REMINDER =
  "[ATENÇÃO] Sua resposta anterior veio sem os arquivos do widget. Responda AGORA com o texto curto e os 4 blocos de código completos (```json, ```html, ```css e ```js), já com o pedido aplicado.";

export function fontsFrom(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fonts = value.filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 6);
  return fonts.length > 0 ? fonts : undefined;
}

export function parseAiWidgetResponse(raw: string): AiWidgetResult {
  if (!raw.trim()) {
    throw new Error("Cole a resposta da IA antes de continuar.");
  }

  let parsed: any = parseFencedWidgetResponse(raw);
  if (parsed) {
    parsed = { manifest: parsed.manifest, html: parsed.html, css: parsed.css, js: parsed.js, assistantMessage: parsed.message };
    if (!parsed.manifest.name) parsed.manifest.name = "Widget da IA";
  } else {
    if (looksTruncated(raw)) {
      throw new Error("A resposta da IA veio cortada no meio. Peça de novo (ou peça para ela mandar o código completo).");
    }
    try {
      parsed = JSON.parse(extractJsonObject(raw));
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        throw new Error("Não consegui ler a resposta da IA. Peça para ela responder com os blocos ```json, ```html, ```css e ```js.");
      }
      throw e;
    }
    if (!parsed || typeof parsed !== "object" || !parsed.manifest || typeof parsed.manifest !== "object") {
      throw new Error("A resposta não tem o manifesto do widget. Use o prompt completo copiado do app.");
    }
  }

  if (!parsed.manifest.name || !String(parsed.manifest.name).trim()) {
    throw new Error("O manifest precisa ter um \"name\".");
  }
  if (typeof parsed.html !== "string" || !parsed.html.trim()) {
    throw new Error("A resposta não tem o HTML do widget.");
  }

  const m = parsed.manifest;
  const category = VALID_CATEGORIES.includes(m.category) ? m.category : "utilities";
  const slug = String(m.id || m.name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const manifest: CustomWidgetManifest = {
    id: slug || `custom-${Date.now()}`,
    name: String(m.name).trim(),
    version: m.version || "1.0.0",
    author: m.author || "IA",
    description: m.description || "Widget criado com ajuda de IA.",
    category,
    icon: m.icon || "🧩",
    entry: "index.html",
    defaultWidth: Number(m.defaultWidth) || 280,
    defaultHeight: Number(m.defaultHeight) || 180,
    minWidth: Number(m.minWidth) || 180,
    minHeight: Number(m.minHeight) || 120,
    resizable: m.resizable !== false,
    permissions: Array.isArray(m.permissions) ? m.permissions : ["storage", "theme"],
    configFields: Array.isArray(m.configFields) ? m.configFields : [],
    tags: Array.isArray(m.tags) ? m.tags : ["ia", "custom"],
    fonts: fontsFrom(m.fonts),
  };

  return {
    manifest,
    html: parsed.html,
    css: typeof parsed.css === "string" ? parsed.css : "",
    js: typeof parsed.js === "string" ? parsed.js : "",
    message: typeof parsed.assistantMessage === "string" ? parsed.assistantMessage.trim() : undefined,
  };
}
