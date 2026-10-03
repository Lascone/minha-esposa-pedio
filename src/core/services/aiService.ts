import {
  useAiStore,
  AiProvider,
  selectBestGeminiModel,
  selectBestGroqModel,
} from "../stores/aiStore";
import {
  AiWidgetResult,
  MISSING_CODE_REMINDER,
  chatTextOnly,
  formatWidgetFiles,
  hasWidgetCode,
  looksTruncated,
  parseAiWidgetResponse,
} from "@/projects/widgets/custom/aiPrompt";
import { CustomWidgetPackage, AiChatMessage } from "@/projects/widgets/custom/types";

import { WIDGET_ECOSYSTEM_BRAIN } from "./widgetBrain";

export interface WidgetAiGenerationResult {
  package: {
    manifest: CustomWidgetPackage["manifest"];
    html: string;
    css: string;
    js: string;
  };
  assistantReply: string;
}

const WIDGET_SYSTEM_PROMPT = WIDGET_ECOSYSTEM_BRAIN;

const GEMINI_CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
  "gemini-1.5-pro",
  "gemini-3.8-flash",
];

export interface GenerateWidgetOptions {
  attachedImageBase64?: string;
  attachedImageMimeType?: string;
  currentError?: string;
  /** Images saved in the gadget, available to its code as pmm-asset://name. */
  assetNames?: string[];
  currentWidgetPreview?: {
    html: string;
    css: string;
    js: string;
    name?: string;
  };
}

/**
 * Consulta a lista oficial de modelos disponíveis na chave Groq
 */
export async function fetchGroqModels(apiKey?: string): Promise<string[]> {
  const store = useAiStore.getState();
  const key = apiKey || store.groqApiKey;
  if (!key) return [];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const list: any[] = data.data || [];
    const modelIds = list
      .map((m) => m.id as string)
      .filter((id) => id && !id.includes("whisper") && !id.includes("guard") && !id.includes("tts") && id !== "llama-3.1-8b-instant" && id !== "llama-3.3-70b-versatile")
      .sort();

    if (modelIds.length > 0) {
      store.setAvailableGroqModels(modelIds);
      const current = store.groqModel;
      if (!current || current === "llama-3.1-8b-instant" || current === "llama-3.3-70b-versatile" || !modelIds.includes(current)) {
        const bestGroq = selectBestGroqModel(modelIds);
        store.setGroqModel(bestGroq);
      }
    }
    return modelIds;
  } catch {
    return [];
  }
}

/**
 * Consulta a lista oficial de modelos diretamente na API do Google AI Studio
 */
export async function fetchGeminiModels(apiKey?: string): Promise<{ id: string; displayName: string }[]> {
  const store = useAiStore.getState();
  const key = apiKey || store.geminiApiKey;
  if (!key) return [];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) return [];

    const data = await res.json();
    const list: any[] = data.models || [];

    const filtered = list
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({
        id: (m.name as string).replace(/^models\//, ""),
        displayName: m.displayName || (m.name as string).replace(/^models\//, ""),
      }))
      .filter((m) => m.id.includes("gemini") && !m.id.includes("1.5-flash") && !m.id.includes("2.0-flash") && !m.id.includes("embedding") && !m.id.includes("imagen") && !m.id.includes("aqa"))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (filtered.length > 0) {
      store.setAvailableGeminiModels(filtered);
      const bestFlash = selectBestGeminiModel(filtered);
      const current = store.geminiModel;
      if (!current || current.includes("lite") || current === "gemini-1.5-flash" || current === "gemini-2.0-flash" || !filtered.some((f) => f.id === current)) {
        store.setGeminiModel(bestFlash);
      }
    }

    return filtered;
  } catch {
    return [];
  }
}

/**
 * Testa a conexão com o provedor de IA ativo ou especificado com auto-recuperação de modelos
 */
export async function testAiConnection(provider?: AiProvider): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const store = useAiStore.getState();
  const targetProvider = provider || store.activeProvider;
  const startTime = Date.now();

  try {
    if (targetProvider === "groq") {
      const apiKey = store.groqApiKey;
      if (!apiKey) {
        throw new Error("Chave da API Groq não informada. Adicione sua chave para testar.");
      }

      // Buscar modelos suportados pela chave do usuário
      const availableModels = await fetchGroqModels(apiKey);

      // Escolher modelo para teste: o atual, ou llama-3.1-8b-instant, ou o primeiro disponível
      let modelToUse = store.groqModel;
      if (!modelToUse || (availableModels.length > 0 && !availableModels.includes(modelToUse))) {
        modelToUse = availableModels.find((m) => m.includes("8b-instant")) || availableModels[0] || "llama-3.1-8b-instant";
        store.setGroqModel(modelToUse);
      }

      let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: "user", content: "Ping! Responda apenas 'OK'." }],
          max_tokens: 10,
          temperature: 0.1,
        }),
      });

      // Se falhou por modelo inexistente, tenta com llama-3.1-8b-instant
      if (!res.ok && modelToUse !== "llama-3.1-8b-instant") {
        const fallbackModel = "llama-3.1-8b-instant";
        const fallbackRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [{ role: "user", content: "Ping! Responda apenas 'OK'." }],
            max_tokens: 10,
            temperature: 0.1,
          }),
        });

        if (fallbackRes.ok) {
          res = fallbackRes;
          modelToUse = fallbackModel;
          store.setGroqModel(fallbackModel);
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Erro HTTP ${res.status}: ${res.statusText}`);
      }

      const latencyMs = Date.now() - startTime;
      const message = `Groq conectado com sucesso! Modelo ativo: ${modelToUse} (${latencyMs}ms)`;
      store.setTestResult("success", latencyMs, message);
      return { success: true, latencyMs, message };
    } else {
      // Gemini
      const apiKey = store.geminiApiKey;
      if (!apiKey) {
        throw new Error("Chave da API Gemini não informada. Adicione sua chave para testar.");
      }

      // Tenta a lista de modelos candidatos começando pelo recomendado (gemini-3.8-flash)
      let successfulModel = "";
      let lastErrMessage = "";

      for (const candidate of GEMINI_CANDIDATE_MODELS) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Ping! Responda apenas 'OK'." }] }],
              generationConfig: { maxOutputTokens: 10 },
            }),
          });

          if (res.ok) {
            successfulModel = candidate;
            store.setGeminiModel(candidate);
            break;
          } else {
            const errData = await res.json().catch(() => ({}));
            lastErrMessage = errData?.error?.message || `HTTP ${res.status}`;
          }
        } catch (e: any) {
          lastErrMessage = e.message;
        }
      }

      if (!successfulModel) {
        throw new Error(lastErrMessage || "Não foi possível conectar com os modelos Gemini disponíveis.");
      }

      const latencyMs = Date.now() - startTime;
      store.incrementGeminiUsage();
      const message = `Google Gemini conectado com sucesso! (${successfulModel} - ${latencyMs}ms)`;
      store.setTestResult("success", latencyMs, message);
      return { success: true, latencyMs, message };
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const message = error?.message || "Falha na conexão com a IA.";
    store.setTestResult("error", latencyMs, message);
    return { success: false, latencyMs, message };
  }
}

const DEFAULT_REPLY = "Prontinho, amor! Fiz com todo o capricho. Dá uma olhada ao lado! ✨";
/** Thinking models spend part of the output budget before writing: leave plenty for the code. */
const GEMINI_MAX_OUTPUT = 65536;
const GEMINI_LEGACY_MAX_OUTPUT = 8192;
const GROQ_MAX_OUTPUT = 32768;
const GROQ_FALLBACK_OUTPUT = 8192;

/** The user's turn: the current widget as four separate files, then the request. */
export function buildWidgetUserTurn(userMessage: string, options?: GenerateWidgetOptions, currentPackage?: CustomWidgetPackage): string {
  const parts: string[] = [];
  const current = currentPackage
    ? { manifest: currentPackage.manifest, html: currentPackage.html, css: currentPackage.css, js: currentPackage.js }
    : options?.currentWidgetPreview
    ? {
        manifest: { name: options.currentWidgetPreview.name || "Widget" },
        html: options.currentWidgetPreview.html,
        css: options.currentWidgetPreview.css,
        js: options.currentWidgetPreview.js,
      }
    : null;
  if (current) {
    parts.push(`[WIDGET ATUAL]\n${formatWidgetFiles(current)}`);
  }
  parts.push(`[PEDIDO DA USUÁRIA]\n${userMessage}`);
  if (options?.currentError) {
    parts.push(`[ERRO NO CONSOLE DO WIDGET]\n"${options.currentError}"\nDescubra a causa e corrija.`);
  }
  const assetNames = options?.assetNames || [];
  if (assetNames.length > 0) {
    parts.push(
      `[IMAGENS DA USUÁRIA]\n${assetNames.map((n) => `- ${n}: pmm-asset://${n}`).join("\n")}\n` +
        'Essas imagens já estão salvas no gadget. Use o endereço exatamente assim, como uma URL normal (ex.: background-image: url("pmm-asset://imagem-1") ou <img src="pmm-asset://imagem-1">). ' +
        "Se a usuária pediu a imagem como fundo, ela precisa aparecer de verdade, ocupando o fundo inteiro (background-size: cover), com uma camada leve por cima só para o texto ficar legível."
    );
  }
  if (options?.attachedImageBase64) {
    parts.push(
      assetNames.length > 0
        ? "[IMAGEM ANEXADA]\nÉ a imagem da usuária: use as cores e o clima dela no resto do visual."
        : "[IMAGEM ANEXADA]\nUse a imagem como referência visual: cores, formas, estilo e elementos."
    );
  }
  parts.push(current ? "Devolva os 4 arquivos completos já com a mudança." : "Crie o widget completo.");
  return parts.join("\n\n");
}

/** Text of a Gemini candidate, without the model's thinking parts. */
export function geminiCandidateText(data: any): { text: string; finishReason: string } {
  const candidate = data?.candidates?.[0];
  const parts: any[] = candidate?.content?.parts || [];
  const text = parts
    .filter((p) => typeof p?.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
  return { text, finishReason: String(candidate?.finishReason || "") };
}

/**
 * Envia uma mensagem e gera ou modifica o código de um widget
 */
export async function generateOrModifyCustomWidget({
  userMessage,
  currentPackage,
  chatHistory = [],
  options,
}: {
  userMessage: string;
  currentPackage?: CustomWidgetPackage;
  chatHistory?: AiChatMessage[];
  options?: GenerateWidgetOptions;
}): Promise<WidgetAiGenerationResult> {
  const store = useAiStore.getState();
  const provider = store.activeProvider;
  const userTurn = buildWidgetUserTurn(userMessage, options, currentPackage);

  // Earlier chat lines give context; the last one is the request being sent now.
  const history = chatHistory
    .filter((m) => m.content && m.content.trim())
    .slice(0, -1)
    .slice(-6);

  const ask = async (turn: string): Promise<{ rawText: string; truncated: boolean }> => {
  let rawText = "";
  let truncated = false;

  if (provider === "groq") {
    const apiKey = store.groqApiKey;
    if (!apiKey) {
      throw new Error("Chave da API Groq não configurada. Acesse a aba 'IAs' para configurar sua chave da Groq.");
    }

    let availableGroq = store.availableGroqModels;
    if (!availableGroq || availableGroq.length === 0) {
      availableGroq = await fetchGroqModels(apiKey);
    }
    const requestedModel = store.groqModel || availableGroq[0] || "openai/gpt-oss-120b";
    const modelsToTry = Array.from(new Set([requestedModel, ...availableGroq, "openai/gpt-oss-120b"])).filter(
      (m) => m && m !== "llama-3.1-8b-instant"
    );

    const messages = [
      { role: "system", content: WIDGET_SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      { role: "user", content: turn },
    ];

    let lastGroqError = "";
    for (const model of modelsToTry) {
      try {
        const send = (maxTokens: number) =>
          fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
              max_completion_tokens: maxTokens,
            }),
          });
        let res = await send(GROQ_MAX_OUTPUT);
        if (res.status === 429) {
          // Free tier: tokens-per-minute window. Falling back to a weaker model or to the
          // model's short default output is what produced cut or ugly widgets.
          const waitS = Math.min(Number(res.headers.get("retry-after")) || 15, 30);
          await new Promise((r) => setTimeout(r, waitS * 1000));
          res = await send(GROQ_MAX_OUTPUT);
          if (res.status === 429) {
            lastGroqError =
              "A Groq gratuita tem limite de uso por minuto e ele foi atingido. Espere uns 60 segundinhos e peça de novo, amor.";
            break;
          }
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastGroqError = err?.error?.message || `HTTP ${res.status}`;
          // Some models cap the output lower than our budget.
          res = await send(GROQ_FALLBACK_OUTPUT);
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastGroqError = err?.error?.message || lastGroqError;
          continue;
        }
        const data = await res.json();
        const text: string = data.choices?.[0]?.message?.content || "";
        if (text.trim()) {
          rawText = text;
          truncated = data.choices?.[0]?.finish_reason === "length";
          store.setGroqModel(model);
          break;
        }
      } catch (e: any) {
        lastGroqError = e.message;
      }
    }

    if (!rawText.trim()) {
      throw new Error(`Erro Groq: ${lastGroqError || "Falha ao gerar com os modelos Groq disponíveis."}`);
    }
  } else {
    const apiKey = store.geminiApiKey;
    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada. Acesse a aba 'IAs' para configurar sua chave do Gemini.");
    }

    let availableGemini: string[] = store.availableGeminiModels?.map((m: { id: string }) => m.id) || [];
    if (availableGemini.length === 0) {
      const fetched = await fetchGeminiModels(apiKey);
      availableGemini = fetched.map((m) => m.id);
    }

    let requestedModel = store.geminiModel || "gemini-pro-latest";
    if (requestedModel === "gemini-1.5-flash" || requestedModel === "gemini-2.0-flash") {
      requestedModel = "gemini-pro-latest";
      store.setGeminiModel(requestedModel);
    }
    const modelsToTry = Array.from(
      new Set([requestedModel, "gemini-pro-latest", "gemini-2.5-pro", ...availableGemini, "gemini-flash-latest"])
    ).filter((m) => m && m !== "gemini-2.0-flash" && m !== "gemini-1.5-flash");

    // Gemini needs strictly alternating user/model turns.
    const contents: { role: "user" | "model"; parts: any[] }[] = [];
    for (const m of history) {
      const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
      const last = contents[contents.length - 1];
      if (last && last.role === role) last.parts[0].text += `\n\n${m.content}`;
      else contents.push({ role, parts: [{ text: m.content }] });
    }
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents.pop();
    }
    const userParts: any[] = [{ text: turn }];
    if (options?.attachedImageBase64) {
      const match = options.attachedImageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      userParts.push({
        inlineData: {
          mimeType: options.attachedImageMimeType || match?.[1] || "image/png",
          data: options.attachedImageBase64.replace(/^data:[^,]+,/, ""),
        },
      });
    }
    contents.push({ role: "user", parts: userParts });

    let lastGeminiError = "";
    for (const model of modelsToTry) {
      try {
        const send = (maxOutputTokens: number) =>
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: WIDGET_SYSTEM_PROMPT }] },
              contents,
              generationConfig: { temperature: 0.7, maxOutputTokens },
            }),
          });
        let res = await send(GEMINI_MAX_OUTPUT);
        if (!res.ok && res.status === 400) {
          // Older models reject a large output budget.
          res = await send(GEMINI_LEGACY_MAX_OUTPUT);
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastGeminiError = err?.error?.message || `HTTP ${res.status}`;
          continue;
        }
        store.incrementGeminiUsage();
        const { text, finishReason } = geminiCandidateText(await res.json());
        if (text.trim()) {
          rawText = text;
          truncated = finishReason === "MAX_TOKENS";
          break;
        }
        lastGeminiError = finishReason ? `resposta vazia (${finishReason})` : "resposta vazia";
      } catch (e: any) {
        lastGeminiError = e.message;
      }
    }

    if (!rawText.trim()) {
      throw new Error(`Erro Gemini (${requestedModel}): ${lastGeminiError || "Modelos Gemini indisponíveis. Tente novamente."}`);
    }
  }
  return { rawText, truncated };
  };

  const readWidget = ({ rawText, truncated }: { rawText: string; truncated: boolean }) => {
    if (looksTruncated(rawText)) {
      throw new Error(
        truncated
          ? "A resposta da IA ficou grande demais e veio cortada. Tente pedir de novo, ou peça algo um pouco mais simples."
          : "A resposta da IA veio incompleta. Tente pedir de novo."
      );
    }
    return parseAiWidgetResponse(rawText);
  };

  const first = await ask(userTurn);
  let parsed: AiWidgetResult;
  if (hasWidgetCode(first.rawText)) {
    parsed = readWidget(first);
  } else {
    // Models sometimes just chat ("vou colocar a imagem!") without sending the files: ask once more.
    const second = await ask(`${userTurn}\n\n${MISSING_CODE_REMINDER}`);
    if (!hasWidgetCode(second.rawText)) {
      const said = chatTextOnly(second.rawText || first.rawText);
      throw new Error(
        said
          ? `A IA respondeu sem mandar o código: "${said}". Peça de novo, amor.`
          : "A IA respondeu sem mandar o código. Peça de novo, amor."
      );
    }
    parsed = readWidget(second);
  }

  return {
    package: {
      manifest: {
        ...parsed.manifest,
        id: currentPackage?.manifest.id || parsed.manifest.id,
      },
      html: parsed.html,
      css: parsed.css,
      js: parsed.js,
    },
    assistantReply: parsed.message || DEFAULT_REPLY,
  };
}

