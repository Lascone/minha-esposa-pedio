import { create } from "zustand";

export type AiProvider = "groq" | "gemini";

export interface AiSettingsState {
  activeProvider: AiProvider;
  groqApiKey: string;
  groqModel: string;
  availableGroqModels: string[];
  geminiApiKey: string;
  geminiModel: string;
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
    if (val) return val;
  } catch {}
  return "llama-3.1-8b-instant";
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
  desc: string;
  isPro?: boolean;
}

export const GEMINI_AVAILABLE_MODELS: GeminiModelInfo[] = [
  { id: "gemini-flash-latest", name: "Gemini Flash Latest ⚡", desc: "Recomendado oficial Google AI Studio, rápido e estável" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro 👑 (Conta Pro)", desc: "Raciocínio avançado, visão multimodal rica e limites altos", isPro: true },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash 🚀", desc: "Super rápido, ideal para ajustes rápidos no chat" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash 🌟", desc: "Nova geração inteligente da Google" },
];

function getInitialGeminiModel(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
    if (val && val !== "gemini-3.8-flash") return val;
  } catch {}
  return "gemini-flash-latest";
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
  availableGroqModels: [],
  geminiApiKey: getInitialGeminiKey(),
  geminiModel: getInitialGeminiModel(),
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
