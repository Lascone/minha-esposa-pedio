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

/** Best Flash for code (GA, Sep 2026): fast and the strongest at writing gadgets. */
export const GEMINI_RECOMMENDED_MODEL = "gemini-3.8-flash";
/** Fallback order when the chosen model is missing on the key or out of quota. */
export const GEMINI_MODEL_PREFERENCE = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

export const GEMINI_AVAILABLE_MODELS: GeminiModelInfo[] = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash ⚡ (Recomendado)", desc: "O melhor para criar gadgets: rápido e o mais forte em código" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro 👑", desc: "Mais caprichado em pedidos difíceis, porém bem mais lento", isPro: true },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite 🚀", desc: "O mais rápido, mas erra mais em gadgets complexos" },
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
  return GEMINI_AVAILABLE_MODELS.map((m) => ({ id: m.id, displayName: m.name }));
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
 * Melhor modelo Gemini que a chave realmente tem, na ordem de GEMINI_MODEL_PREFERENCE.
 */
export function selectBestGeminiModel(models: { id: string; displayName?: string }[]): string {
  if (!models || models.length === 0) return GEMINI_RECOMMENDED_MODEL;
  const ids = models.map((m) => m.id);
  const preferred = GEMINI_MODEL_PREFERENCE.find((id) => ids.includes(id));
  if (preferred) return preferred;
  const flash = ids.find((id) => /flash/.test(id) && !/lite|tts|image|live|audio/.test(id));
  return flash || ids[0];
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

const STORAGE_KEY_GEMINI_DEFAULT_V = "pmm_gemini_default_v3";

function getInitialGeminiModel(): string {
  try {
    // Once per new default: older versions saved gemini-pro-latest / 2.5 models that made weak gadgets.
    if (localStorage.getItem(STORAGE_KEY_GEMINI_DEFAULT_V) !== GEMINI_RECOMMENDED_MODEL) {
      localStorage.setItem(STORAGE_KEY_GEMINI_DEFAULT_V, GEMINI_RECOMMENDED_MODEL);
      localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, GEMINI_RECOMMENDED_MODEL);
      return GEMINI_RECOMMENDED_MODEL;
    }
    const val = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
    if (val) return val;
  } catch {}
  return GEMINI_RECOMMENDED_MODEL;
}

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getInitialGeminiUsage(): number {
  try {
    const today = localDateKey();
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
      localStorage.setItem(STORAGE_KEY_GEMINI_DATE, localDateKey());
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
