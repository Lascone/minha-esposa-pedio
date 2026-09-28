import { useAiStore, AiProvider } from "../stores/aiStore";
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
  "gemini-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
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
      .filter((id) => id && !id.includes("whisper") && !id.includes("guard") && !id.includes("tts"))
      .sort();

    store.setAvailableGroqModels(modelIds);
    return modelIds;
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

  // Se já existe um widget sendo editado ou enviado via options, adicionar contexto do código atual
  const activePkg = currentPackage || (options?.currentWidgetPreview ? {
    manifest: { name: options.currentWidgetPreview.name || "Widget", defaultWidth: 300, defaultHeight: 200 } as any,
    html: options.currentWidgetPreview.html,
    css: options.currentWidgetPreview.css,
    js: options.currentWidgetPreview.js,
  } : undefined);

  if (activePkg) {
    conversationMessages.push({
      role: "system",
      content: `O usuário está atualmente MODIFICANDO o seguinte widget existente:
Manifesto atual: ${JSON.stringify(activePkg.manifest)}
HTML atual:
${activePkg.html}

CSS atual:
${activePkg.css}

JS atual:
${activePkg.js}

Aplique com carinho as melhorias pedidas mantendo o que já está funcionando e preservando a estabilidade defensiva do código. Lembre-se de manter sempre o WidgetAPI.emitReady() no final do JS.`,
    });
  }

  // Compactar histórico recente (máximo 4 mensagens para não estourar limite de tokens/minuto)
  const recentHistory = chatHistory.slice(-4);
  for (const msg of recentHistory) {
    conversationMessages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    });
  }

  // Enriquecer a mensagem do usuário com contexto diagnóstico e visual
  let enrichedUserMessage = userMessage;

  if (options?.currentError) {
    enrichedUserMessage += `\n\n⚠️ [ERRO DETECTADO NO NAVEGADOR/CONSOLE DO WIDGET]:\n"${options.currentError}"\nPor favor, analise a causa do erro acima (ex: elemento nulo, canvas sem getContext, etc.) e reescreva o código de forma 100% defensiva com verificação de existência antes de usar .style ou propriedades.`;
  }

  if (options?.attachedImageBase64) {
    enrichedUserMessage += `\n\n🖼️ [IMAGEM ANEXADA]: A usuária enviou uma imagem/print em anexo! Analise com carinho todos os detalhes visuais (cores, formatos, ícones, fontes e layout) e crie o gadget correspondente com muita perfeição e fofura.`;
  }

  // Adicionar mensagem atual enriquecida
  conversationMessages.push({
    role: "user",
    content: enrichedUserMessage,
  });

  let rawJsonText = "";

  if (provider === "groq") {
    const apiKey = store.groqApiKey;
    if (!apiKey) {
      throw new Error("Chave da API Groq não configurada. Acesse a aba 'IAs' para configurar sua chave gratuita do Groq.");
    }

    const requestedModel = store.groqModel || "llama-3.1-8b-instant";
    const modelsToTry = [requestedModel, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    let lastGroqError = "";

    for (const modelToUse of modelsToTry) {
      try {
        // Tentativa 1: com json_object
        let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: WIDGET_SYSTEM_PROMPT },
              ...conversationMessages,
            ],
            temperature: 0.5,
            response_format: { type: "json_object" },
          }),
        });

        // Se falhou por JSON mode ou rate limit, tenta sem json_object
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastGroqError = errData?.error?.message || `HTTP ${res.status}`;

          const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: [
                { role: "system", content: WIDGET_SYSTEM_PROMPT + "\n\nResponda estritamente com o JSON iniciando em { e terminando em }." },
                ...conversationMessages,
              ],
              temperature: 0.5,
            }),
          });

          if (retryRes.ok) {
            res = retryRes;
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
      throw new Error(`Erro Groq: ${lastGroqError || "Limite de taxa atingido. Tente novamente em alguns segundos ou selecione Llama 3.1 8B."}`);
    }
  } else {
    // Provedor Gemini
    const apiKey = store.geminiApiKey;
    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada. Acesse a aba 'IAs' para configurar sua chave do Gemini.");
    }

    // Montar contents para o Gemini
    const geminiContents: { role: string; parts: any[] }[] = conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Se houver imagem anexada, injeta inlineData na última mensagem do usuário
    if (options?.attachedImageBase64) {
      const mimeType = options.attachedImageMimeType || "image/png";
      const cleanBase64 = options.attachedImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      const lastUserContent = geminiContents[geminiContents.length - 1];
      if (lastUserContent) {
        lastUserContent.parts.push({
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        });
      }
    }

    const requestedModel = store.geminiModel || "gemini-flash-latest";
    const modelsToTry = [
      requestedModel,
      "gemini-flash-latest",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastGeminiError = "";

    for (const targetModel of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: WIDGET_SYSTEM_PROMPT }],
            },
            contents: geminiContents,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.5,
            },
          }),
        });

        if (res.ok) {
          store.incrementGeminiUsage();
          store.setGeminiModel(targetModel);
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
      throw new Error(`Erro Gemini (${requestedModel}): ${lastGeminiError || "Modelos Gemini em alta demanda temporária. Tente novamente."}`);
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
