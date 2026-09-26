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
}

const VALID_CATEGORIES: CustomWidgetManifest["category"][] = [
  "time",
  "system",
  "productivity",
  "utilities",
];

export function buildCustomWidgetAiPrompt({ description, backgroundImageUrl }: AiWidgetRequest): string {
  const wish = description.trim() || "(descreva aqui o widget que você quer)";
  const image = backgroundImageUrl?.trim();

  const imageBlock = image
    ? `- Use esta imagem como fundo do widget (no CSS, com background-image: url("${image}"), background-size: cover e background-position: center). Coloque uma camada semitransparente por cima para o texto continuar legível.`
    : "- Não há imagem de fundo: use um fundo com gradiente ou vidro fosco (backdrop-filter) bonito.";

  return `Você é um desenvolvedor front-end especialista. Crie um WIDGET DE DESKTOP para o aplicativo "Pedi para meu marido".

## O QUE EU QUERO
${wish}

## IMAGEM DE FUNDO
${imageBlock}

## COMO O WIDGET FUNCIONA (regras obrigatórias)
- O widget roda dentro de um iframe isolado (sandbox "allow-scripts"). Não existe Node.js, require, import de módulos, fetch para arquivos locais, localStorage confiável nem acesso ao Windows.
- Use apenas HTML, CSS e JavaScript puro (sem React, sem bibliotecas externas, sem CDN).
- O <body> deve ter background transparente; o visual fica dentro de um container (ex.: .card) que ocupa 100% da largura e altura.
- Tudo deve caber no tamanho do widget (defaultWidth x defaultHeight) e ser responsivo se a janela mudar de tamanho.
- Estilo fofo e elegante: cantos arredondados, sombras suaves, boa legibilidade, textos em português do Brasil.
- Existe um objeto global chamado WidgetAPI com estes métodos:
  - WidgetAPI.getConfig(chave, valorPadrao) → lê uma preferência salva
  - WidgetAPI.setConfig(chave, valor) → salva uma preferência
  - WidgetAPI.requestResize(largura, altura) → pede para redimensionar
  - WidgetAPI.getTheme() → tema atual: "aero-glass", "cute-pastel", "dark-modern" ou "cyber-neon"
  - WidgetAPI.onThemeChange(function (tema) { ... }) → avisa quando o tema muda
  - WidgetAPI.emitReady() → OBRIGATÓRIO chamar no final do JavaScript, quando o widget terminar de carregar
- Nunca invente dados falsos (ex.: temperatura, CPU, notícias). Se algo depende de internet e falhar, mostre uma mensagem amigável.

## FORMATO DA RESPOSTA (muito importante)
Responda SOMENTE com um único objeto JSON válido, sem explicações, sem markdown e sem \`\`\`. O JSON deve ter exatamente esta estrutura:

{
  "manifest": {
    "id": "id-em-minusculas-com-hifens",
    "name": "Nome bonito do widget",
    "version": "1.0.0",
    "author": "IA",
    "description": "Frase curta explicando o widget",
    "category": "time | system | productivity | utilities (escolha UM)",
    "icon": "um emoji",
    "entry": "index.html",
    "defaultWidth": 280,
    "defaultHeight": 180,
    "minWidth": 180,
    "minHeight": 120,
    "resizable": true,
    "permissions": ["storage", "theme"],
    "tags": ["palavras", "chave"]
  },
  "html": "apenas o conteúdo que vai dentro do <body> (sem <html>, <head> ou <body>)",
  "css": "todo o CSS do widget",
  "js": "todo o JavaScript do widget, terminando com WidgetAPI.emitReady();"
}

Lembre-se: html, css e js são strings JSON, então escape aspas duplas (\\") e quebras de linha (\\n) corretamente. A resposta precisa funcionar com JSON.parse.`;
}

function extractJsonObject(raw: string): string {
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    text = fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Não encontrei um JSON na resposta. Copie a resposta inteira da IA, começando em { e terminando em }.");
  }
  return text.slice(start, end + 1);
}

export function parseAiWidgetResponse(raw: string): AiWidgetResult {
  if (!raw.trim()) {
    throw new Error("Cole a resposta da IA antes de continuar.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      throw new Error("A resposta da IA não é um JSON válido. Peça para ela: \"responda só com o JSON válido, sem texto extra\".");
    }
    throw e;
  }

  if (!parsed || typeof parsed !== "object" || !parsed.manifest || typeof parsed.manifest !== "object") {
    throw new Error("A resposta não tem o campo \"manifest\". Use o prompt completo copiado do app.");
  }
  if (!parsed.manifest.name || !String(parsed.manifest.name).trim()) {
    throw new Error("O manifest precisa ter um \"name\".");
  }
  if (typeof parsed.html !== "string" || !parsed.html.trim()) {
    throw new Error("A resposta não tem o HTML do widget (campo \"html\").");
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
  };

  return {
    manifest,
    html: parsed.html,
    css: typeof parsed.css === "string" ? parsed.css : "",
    js: typeof parsed.js === "string" ? parsed.js : "",
  };
}
