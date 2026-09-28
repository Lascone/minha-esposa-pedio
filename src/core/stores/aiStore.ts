import { create } from "zustand";

export type AiProvider = "groq" | "gemini";

export interface AiSettingsState {
  activeProvider: AiProvider;
  groqApiKey: string;
  groqModel: string;
  availableGroqModels: string[];
  geminiApiKey: string;
  geminiModel: string;
  availableGeminiModels: { id: string; displayName: string }[];
  geminiRequestsToday: number;
  lastTestLatencyMs: number | null;
  lastTestStatus: "idle" | "testing" | "success" | "error";
  lastTestMessage: string | null;

  setActiveProvider: (provider: AiProvider) => void;
  setGroqApiKey: (key: string) => void;
  setGroqModel: (model: string) => void;
  setAvailableGroqModels: (models: string[]) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiModel: (model: string) => void;
  setAvailableGeminiModels: (models: { id: string; displayName: string }[]) => void;
  incrementGeminiUsage: () => void;
  setTestResult: (status: "idle" | "testing" | "success" | "error", latencyMs?: number | null, msg?: string | null) => void;
}

const STORAGE_KEY_PROVIDER = "pmm_ai_active_provider";
const STORAGE_KEY_GROQ_KEY = "pmm_groq_api_key";
const STORAGE_KEY_GROQ_MODEL = "pmm_groq_model";
const STORAGE_KEY_GEMINI_KEY = "pmm_gemini_api_key";
const STORAGE_KEY_GEMINI_MODEL = "pmm_gemini_model";
const STORAGE_KEY_GEMINI_USAGE = "pmm_gemini_requests_today";
const STORAGE_KEY_GEMINI_DATE = "pmm_gemini_usage_date";

function getInitialProvider(): AiProvider {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PROVIDER);
    if (val === "groq" || val === "gemini") return val;
  } catch {}
  return "groq";
}

function getInitialGroqKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GROQ_KEY) || "";
  } catch {
    return "";
  }
}

function getInitialGroqModel(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEY_GROQ_MODEL);
    if (val && val !== "llama-3.1-8b-instant" && val !== "llama-3.3-70b-versatile") return val;
  } catch {}
  return "openai/gpt-oss-120b";
}

function getInitialGeminiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || "";
  } catch {
    return "";
  }
}

export interface GeminiModelInfo {
  id: string;
  name: string;
  desc?: string;
  displayName?: string;
  isPro?: boolean;
}

export const GEMINI_AVAILABLE_MODELS: GeminiModelInfo[] = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash 🚀", desc: "Recomendado oficial Google AI, modelo mais atualizado e veloz" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest ⚡", desc: "Endpoint estável e atualizado do Google AI Studio" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro 👑 (Conta Pro)", desc: "Raciocínio avançado, visão rica e cotas mais altas", isPro: true },
];

const STORAGE_KEY_DETECTED_GEMINI = "pmm_ai_detected_gemini_models";
const STORAGE_KEY_DETECTED_GROQ = "pmm_ai_detected_groq_models";

function getInitialDetectedGemini(): { id: string; displayName: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DETECTED_GEMINI);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(m => m.id !== "gemini-1.5-flash" && m.id !== "gemini-2.0-flash");
      }
    }
  } catch {}
  return [
    { id: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash 🚀 (Recomendado)" },
    { id: "gemini-flash-latest", displayName: "Gemini Flash Latest ⚡" },
    { id: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro 👑" },
  ];
}

function getInitialDetectedGroq(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DETECTED_GROQ);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(m => m !== "llama-3.1-8b-instant" && m !== "llama-3.3-70b-versatile");
      }
    }
  } catch {}
  return ["openai/gpt-oss-120b"];
}

/**
 * Seleciona automaticamente o melhor modelo Flash disponível para Gemini
 */
export function selectBestGeminiModel(models: { id: string; displayName?: string }[]): string {
  if (!models || models.length === 0) return "gemini-3.8-flash";

  // Filtra modelos Flash ativos que suportam texto e exclui obsoletos
  const flashCandidates = models.filter((m) => {
    const id = m.id.toLowerCase();
    return (
      id.includes("flash") &&
      !id.includes("1.5-flash") &&
      !id.includes("2.0-flash") &&
      !id.includes("embedding") &&
      !id.includes("imagen") &&
      !id.includes("aqa")
    );
  });

  if (flashCandidates.length > 0) {
    // Prioriza modelos na ordem: 3.x Flash > flash-latest > 2.5 Flash > qualquer Flash
    const preferredOrder = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash-exp"];
    for (const pref of preferredOrder) {
      const found = flashCandidates.find((c) => c.id === pref);
      if (found) return found.id;
    }
    return flashCandidates[0].id;
  }

  // Se não houver Flash disponível, procura pelo melhor Pro
  const proCandidates = models.filter((m) => m.id.toLowerCase().includes("pro") && !m.id.includes("embedding"));
  if (proCandidates.length > 0) {
    return proCandidates[0].id;
  }

  return models[0].id;
}

/**
 * Seleciona automaticamente o melhor modelo para Groq
 */
export function selectBestGroqModel(models: string[]): string {
  if (!models || models.length === 0) return "openai/gpt-oss-120b";
  const preferred = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ];
  for (const pref of preferred) {
    if (models.includes(pref)) return pref;
  }
  return models[0] || "openai/gpt-oss-120b";
}

function getInitialGeminiModel(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
    if (val && val !== "gemini-2.0-flash" && val !== "gemini-1.5-flash") return val;
  } catch {}
  return "gemini-3.8-flash";
}

function getInitialGeminiUsage(): number {
  try {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem(STORAGE_KEY_GEMINI_DATE);
    if (savedDate !== today) {
      localStorage.setItem(STORAGE_KEY_GEMINI_DATE, today);
      localStorage.setItem(STORAGE_KEY_GEMINI_USAGE, "0");
      return 0;
    }
    return parseInt(localStorage.getItem(STORAGE_KEY_GEMINI_USAGE) || "0", 10);
  } catch {
    return 0;
  }
}

export const useAiStore = create<AiSettingsState>((set, get) => ({
  activeProvider: getInitialProvider(),
  groqApiKey: getInitialGroqKey(),
  groqModel: getInitialGroqModel(),
  availableGroqModels: getInitialDetectedGroq(),
  geminiApiKey: getInitialGeminiKey(),
  geminiModel: getInitialGeminiModel(),
  availableGeminiModels: getInitialDetectedGemini(),
  geminiRequestsToday: getInitialGeminiUsage(),
  lastTestLatencyMs: null,
  lastTestStatus: "idle",
  lastTestMessage: null,

  setActiveProvider: (provider) => {
    try {
      localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
    } catch {}
    set({ activeProvider: provider });
  },

  setGroqApiKey: (key) => {
    const trimmed = key.trim();
    try {
      localStorage.setItem(STORAGE_KEY_GROQ_KEY, trimmed);
    } catch {}
    set({ groqApiKey: trimmed });
  },

  setGroqModel: (model) => {
    try {
      localStorage.setItem(STORAGE_KEY_GROQ_MODEL, model);
    } catch {}
    set({ groqModel: model });
  },

  setAvailableGroqModels: (models) => {
    try {
      localStorage.setItem(STORAGE_KEY_DETECTED_GROQ, JSON.stringify(models));
    } catch {}
    set({ availableGroqModels: models });
  },

  setGeminiApiKey: (key) => {
    const trimmed = key.trim();
    try {
      localStorage.setItem(STORAGE_KEY_GEMINI_KEY, trimmed);
    } catch {}
    set({ geminiApiKey: trimmed });
  },

  setGeminiModel: (model) => {
    try {
      localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model);
    } catch {}
    set({ geminiModel: model });
  },

  setAvailableGeminiModels: (models) => {
    try {
      localStorage.setItem(STORAGE_KEY_DETECTED_GEMINI, JSON.stringify(models));
    } catch {}
    set({ availableGeminiModels: models });
  },

  incrementGeminiUsage: () => {
    const current = get().geminiRequestsToday + 1;
    try {
      localStorage.setItem(STORAGE_KEY_GEMINI_USAGE, current.toString());
      localStorage.setItem(STORAGE_KEY_GEMINI_DATE, new Date().toISOString().split("T")[0]);
    } catch {}
    set({ geminiRequestsToday: current });
  },

  setTestResult: (status, latencyMs = null, msg = null) => {
    set({
      lastTestStatus: status,
      lastTestLatencyMs: latencyMs,
      lastTestMessage: msg,
    });
  },
}));
