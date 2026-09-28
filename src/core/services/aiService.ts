import {
  useAiStore,
  AiProvider,
  selectBestGeminiModel,
  selectBestGroqModel,
} from "../stores/aiStore";
import { parseAiWidgetResponse } from "@/projects/widgets/custom/aiPrompt";
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

  // Montar o histórico no formato adequado
  const conversationMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];

  // Se já existe um widget sendo editado ou enviado via options, preparar contexto completo
  const activePkg = currentPackage || (options?.currentWidgetPreview ? {
    manifest: { name: options.currentWidgetPreview.name || "Widget", defaultWidth: 300, defaultHeight: 200 } as any,
    html: options.currentWidgetPreview.html,
    css: options.currentWidgetPreview.css,
    js: options.currentWidgetPreview.js,
  } : undefined);

  // Instrução de Sistema completa com o widget atual para modificação
  let fullSystemInstruction = WIDGET_SYSTEM_PROMPT;
  if (activePkg) {
    fullSystemInstruction += `\n\n[WIDGET ATUAL EM MODIFICAÇÃO]:\n` +
      `Manifesto: ${JSON.stringify(activePkg.manifest)}\n` +
      `HTML Atual:\n${activePkg.html}\n\n` +
      `CSS Atual:\n${activePkg.css}\n\n` +
      `JS Atual:\n${activePkg.js}\n\n` +
      `INSTRUÇÃO DE MODIFICAÇÃO: A usuária está pedindo melhorias no gadget existente acima. Modifique com amor e perfeição mantendo o que já está funcionando. Mantenha código JavaScript 100% defensivo (aguardar DOMContentLoaded, checar se elementos e canvas existem antes de usar .style ou .getContext, e manter WidgetAPI.emitReady() no final).`;
  }

  // Enriquecer a mensagem do usuário com contexto diagnóstico de erro se houver
  let enrichedUserMessage = userMessage;

  if (options?.currentError) {
    enrichedUserMessage += `\n\n⚠️ [ERRO DETECTADO NO CONSOLE DO WIDGET]:\n"${options.currentError}"\nPor favor, analise a causa do erro acima e corrija o código JavaScript/HTML com programação defensiva.`;
  }

  if (options?.attachedImageBase64) {
    enrichedUserMessage += `\n\n🖼️ [IMAGEM ANEXADA]: A usuária enviou uma imagem/print em anexo! Observe com carinho todas as cores, elementos, formato e estilo visual da foto e crie o gadget correspondente.`;
  }

  // Pegar até 4 mensagens reais do histórico para não estourar tokens
  const historySlice = chatHistory
    .filter((m) => m.content && m.content.trim())
    .slice(-4);

  let rawJsonText = "";

  if (provider === "groq") {
    const apiKey = store.groqApiKey;
    if (!apiKey) {
      throw new Error("Chave da API Groq não configurada. Acesse a aba 'IAs' para configurar sua chave da Groq.");
    }

    // Buscar lista dinâmica de modelos suportados pela chave do usuário
    let availableGroq = store.availableGroqModels;
    if (!availableGroq || availableGroq.length === 0) {
      availableGroq = await fetchGroqModels(apiKey);
    }

    const requestedModel = store.groqModel || availableGroq[0] || "openai/gpt-oss-120b";
    const modelsToTry = Array.from(new Set([
      requestedModel,
      ...availableGroq,
      "openai/gpt-oss-120b",
    ])).filter((m) => m && m !== "llama-3.1-8b-instant" && m !== "llama-3.3-70b-versatile");

    const groqUserPayload = enrichedUserMessage + "\n\n[RESPOSTA OBRIGATÓRIA: Responda estritamente com um JSON válido iniciando em { e fechando em } com as chaves assistantMessage, manifest, html, css e js.]";

    const groqMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: fullSystemInstruction },
    ];

    for (const m of historySlice) {
      groqMessages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }

    groqMessages.push({
      role: "user",
      content: groqUserPayload,
    });

    let lastGroqError = "";

    for (const modelToUse of modelsToTry) {
      try {
        let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: groqMessages,
            temperature: 0.4,
            response_format: { type: "json_object" },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastGroqError = errData?.error?.message || `HTTP ${res.status}`;

          // Se falhar no json_object, tenta fallback clássico sem response_format estrito
          const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: [
                {
                  role: "system",
                  content: fullSystemInstruction + "\n\nIMPORTANTE: Sua resposta inteira DEVE ser APENAS um objeto JSON válido iniciando com { e terminando com }. Não adicione texto antes ou depois do JSON.",
                },
                ...groqMessages.filter((msg) => msg.role !== "system"),
              ],
              temperature: 0.3,
            }),
          });

          if (retryRes.ok) {
            res = retryRes;
          } else {
            const retryErr = await retryRes.json().catch(() => ({}));
            lastGroqError = retryErr?.error?.message || lastGroqError;
          }
        }

        if (res.ok) {
          const data = await res.json();
          rawJsonText = data.choices?.[0]?.message?.content || "";
          if (rawJsonText.trim()) {
            store.setGroqModel(modelToUse);
            break;
          }
        }
      } catch (e: any) {
        lastGroqError = e.message;
      }
    }

    if (!rawJsonText.trim()) {
      throw new Error(`Erro Groq: ${lastGroqError || "Falha ao gerar com os modelos Groq disponíveis."}`);
    }
  } else {
    // Provedor Gemini
    const apiKey = store.geminiApiKey;
    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada. Acesse a aba 'IAs' para configurar sua chave do Gemini.");
    }

    // Buscar lista de modelos do Google
    let availableGemini: string[] = store.availableGeminiModels?.map((m: { id: string }) => m.id) || [];
    if (!availableGemini || availableGemini.length === 0) {
      const fetched = await fetchGeminiModels(apiKey);
      if (fetched.length > 0) {
        availableGemini = fetched.map((m) => m.id);
      }
    }

    let requestedModel = store.geminiModel || "gemini-pro-latest";
    if (requestedModel === "gemini-1.5-flash" || requestedModel === "gemini-2.0-flash") {
      requestedModel = "gemini-pro-latest";
      store.setGeminiModel("gemini-pro-latest");
    }

    // O primeiro modelo a tentar é SEMPRE a escolha do usuário
    const modelsToTry = Array.from(new Set([
      requestedModel,
      "gemini-pro-latest",
      ...availableGemini,
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-2.5-pro",
    ])).filter((m) => m && m !== "gemini-2.0-flash" && m !== "gemini-1.5-flash");

    // Montar turnos estritamente alternados user -> model para o Gemini
    const geminiContents: { role: "user" | "model"; parts: any[] }[] = [];

    for (const m of historySlice) {
      const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
      if (!m.content?.trim()) continue;

      if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
        geminiContents[geminiContents.length - 1].parts[0].text += `\n\n${m.content}`;
      } else {
        geminiContents.push({
          role,
          parts: [{ text: m.content }],
        });
      }
    }

    // Se o último turno do histórico for user, removemos para colocar a mensagem atual com anexo
    if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === "user") {
      geminiContents.pop();
    }

    // Turno final do usuário atual
    const userParts: any[] = [{ text: enrichedUserMessage }];
    if (options?.attachedImageBase64) {
      const mimeType = options.attachedImageMimeType || "image/png";
      const cleanBase64 = options.attachedImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      userParts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    geminiContents.push({
      role: "user",
      parts: userParts,
    });

    let lastGeminiError = "";

    for (const targetModel of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: fullSystemInstruction }],
            },
            contents: geminiContents,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.5,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (res.ok) {
          store.incrementGeminiUsage();
          const data = await res.json();
          rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawJsonText.trim()) break;
        } else {
          const errJson = await res.json().catch(() => ({}));
          lastGeminiError = errJson?.error?.message || `HTTP ${res.status}`;
        }
      } catch (e: any) {
        lastGeminiError = e.message;
      }
    }

    if (!rawJsonText.trim()) {
      throw new Error(`Erro Gemini (${requestedModel}): ${lastGeminiError || "Modelos Gemini indisponíveis. Tente novamente."}`);
    }
  }

  if (!rawJsonText.trim()) {
    throw new Error("A IA retornou uma resposta vazia. Tente novamente.");
  }

  // Parse do retorno da IA
  let parsedObj: any;
  try {
    parsedObj = JSON.parse(rawJsonText);
  } catch {
    const jsonMatch = rawJsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      parsedObj = JSON.parse(jsonMatch[1].trim());
    } else {
      const start = rawJsonText.indexOf("{");
      const end = rawJsonText.lastIndexOf("}");
      if (start !== -1 && end > start) {
        parsedObj = JSON.parse(rawJsonText.substring(start, end + 1));
      } else {
        throw new Error("Não foi possível interpretar o formato retornado pela IA. Tente reenviar seu pedido.");
      }
    }
  }

  const assistantReply = parsedObj.assistantMessage || "Prontinho! Atualizei o seu widget com muito carinho. Veja ao lado como ficou! ✨";

  const validParsed = parseAiWidgetResponse(JSON.stringify(parsedObj));

  return {
    package: {
      manifest: {
        ...validParsed.manifest,
        id: currentPackage?.manifest.id || validParsed.manifest.id,
      },
      html: validParsed.html,
      css: validParsed.css,
      js: validParsed.js,
    },
    assistantReply,
  };
}
