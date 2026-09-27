import { create } from "zustand";

export type SnesSkinId =
  | "snes-classic"
  | "super-famicom"
  | "pastel-blossom"
  | "atomic-purple"
  | "dark-cyber";

export type LedColor = "red" | "cyan" | "green" | "pink" | "amber" | "purple";
export type ButtonPalette = "classic-purple" | "sfc-four-color" | "pastel-candy" | "cyber-neon";

export interface SnesSkinDefinition {
  id: SnesSkinId;
  name: string;
  tagline: string;
  emoji: string;
  chassisBg: string;
  chassisBorder: string;
  chassisText: string;
  accentColor: string;
  badgeText: string;
  badgeColor: string;
  headerGradient: string;
  cartridgeBayBg: string;
  powerLedColor: string;
  powerLedGlow: string;
  controllerPadsTheme: ButtonPalette;
}

export const SNES_SKINS: Record<SnesSkinId, SnesSkinDefinition> = {
  "snes-classic": {
    id: "snes-classic",
    name: "Classic Grey & Purple (US)",
    tagline: "O visual nostálgico clássico americano com carcaça cinza e detalhes em lilás.",
    emoji: "👾",
    chassisBg: "bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-900",
    chassisBorder: "border-slate-400/80 shadow-slate-900/40",
    chassisText: "text-slate-800",
    accentColor: "#6d28d9", // purple-700
    badgeText: "SUPER NINTENDO",
    badgeColor: "text-purple-900 font-extrabold tracking-widest",
    headerGradient: "from-slate-400/80 via-purple-700/50 to-slate-300",
    cartridgeBayBg: "bg-slate-500/30 border-slate-600/40",
    powerLedColor: "#ef4444", // classic red
    powerLedGlow: "rgba(239, 68, 68, 0.7)",
    controllerPadsTheme: "classic-purple",
  },
  "super-famicom": {
    id: "super-famicom",
    name: "Super Famicom / PAL 4-Colors",
    tagline: "Ícone retrô japonês e europeu com o clássico logo em 4 cores (Vermelho, Amarelo, Verde, Azul).",
    emoji: "🇯🇵",
    chassisBg: "bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 text-stone-900",
    chassisBorder: "border-stone-400 shadow-stone-800/30",
    chassisText: "text-stone-800",
    accentColor: "#dc2626", // famicom red
    badgeText: "SUPER FAMICOM",
    badgeColor: "text-stone-700 font-black tracking-widest",
    headerGradient: "from-emerald-600/30 via-amber-500/30 to-blue-600/30",
    cartridgeBayBg: "bg-stone-400/40 border-stone-500/50",
    powerLedColor: "#22c55e", // emerald green
    powerLedGlow: "rgba(34, 197, 94, 0.8)",
    controllerPadsTheme: "sfc-four-color",
  },
  "pastel-blossom": {
    id: "pastel-blossom",
    name: "Cute Pastel Sakura 🌸",
    tagline: "Design exclusivo fofo e delicado com rosa quartzo, detalhes dourados e estética kawaii.",
    emoji: "💖",
    chassisBg: "bg-gradient-to-b from-pink-100 via-rose-100 to-pink-200 text-pink-950",
    chassisBorder: "border-pink-300 shadow-pink-300/40",
    chassisText: "text-pink-900",
    accentColor: "#ec4899", // pink-500
    badgeText: "SWEET 16-BIT CONSOLE",
    badgeColor: "text-pink-600 font-black tracking-wide",
    headerGradient: "from-pink-400/40 via-purple-300/40 to-rose-300/50",
    cartridgeBayBg: "bg-pink-300/30 border-pink-400/40",
    powerLedColor: "#f43f5e", // rose/pink LED
    powerLedGlow: "rgba(244, 63, 94, 0.85)",
    controllerPadsTheme: "pastel-candy",
  },
  "atomic-purple": {
    id: "atomic-purple",
    name: "Atomic Purple 90s (Translúcido)",
    tagline: "Inspirado nas clássicas edições transparentes translúcidas dos consoles dos anos 90.",
    emoji: "🔮",
    chassisBg: "bg-gradient-to-br from-purple-900/90 via-indigo-950/90 to-purple-950/95 text-purple-100 backdrop-blur-md",
    chassisBorder: "border-purple-400/50 shadow-purple-900/60",
    chassisText: "text-purple-200",
    accentColor: "#c084fc", // purple-400
    badgeText: "ATOMIC 16-BIT SPECIAL",
    badgeColor: "text-purple-300 font-extrabold tracking-wider",
    headerGradient: "from-purple-600/40 via-fuchsia-600/30 to-indigo-900/50",
    cartridgeBayBg: "bg-purple-950/70 border-purple-500/30",
    powerLedColor: "#a855f7", // purple LED
    powerLedGlow: "rgba(168, 85, 247, 0.9)",
    controllerPadsTheme: "classic-purple",
  },
  "dark-cyber": {
    id: "dark-cyber",
    name: "Dark Cyber Neon ⚡",
    tagline: "Carcaça preta fosca de alta precisão com frisos luminosos em ciano e magenta neon.",
    emoji: "🖤",
    chassisBg: "bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white",
    chassisBorder: "border-cyan-500/40 shadow-cyan-500/20",
    chassisText: "text-slate-100",
    accentColor: "#06b6d4", // cyan-500
    badgeText: "SNES // CYBER ENGINE",
    badgeColor: "text-cyan-400 font-black tracking-widest",
    headerGradient: "from-cyan-500/30 via-pink-600/25 to-slate-900",
    cartridgeBayBg: "bg-slate-950 border-cyan-500/30",
    powerLedColor: "#06b6d4", // cyan LED
    powerLedGlow: "rgba(6, 182, 212, 0.95)",
    controllerPadsTheme: "cyber-neon",
  },
};

export interface SnesCustomizerConfig {
  skinId: SnesSkinId;
  ledColor: LedColor;
  buttonPalette: ButtonPalette;
  cartridgeColor: string; // hex or tailwind class
  cartridgeLabel: string;
  cartridgeLabelSub: string;
  showDecorDecal: boolean;
  scanlineIntensity: number; // 0 to 100
}

const DEFAULT_CONFIG: SnesCustomizerConfig = {
  skinId: "snes-classic",
  ledColor: "red",
  buttonPalette: "classic-purple",
  cartridgeColor: "#475569", // slate-600 classic cartridge
  cartridgeLabel: "SUPER MARIO WORLD",
  cartridgeLabelSub: "Official 16-Bit Cartridge",
  showDecorDecal: true,
  scanlineIntensity: 15,
};

const STORAGE_KEY = "minha_esposa_pedio_snes_customizer_v1";

interface SnesCustomizerStore {
  config: SnesCustomizerConfig;
  setSkin: (skinId: SnesSkinId) => void;
  setLedColor: (color: LedColor) => void;
  setButtonPalette: (palette: ButtonPalette) => void;
  setCartridge: (data: Partial<Pick<SnesCustomizerConfig, "cartridgeColor" | "cartridgeLabel" | "cartridgeLabelSub">>) => void;
  setDecorDecal: (show: boolean) => void;
  setScanlines: (intensity: number) => void;
  resetDefaults: () => void;
}

export const useSnesCustomizerStore = create<SnesCustomizerStore>((set) => {
  // Load saved config
  let initial = DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      initial = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}

  const save = (updated: SnesCustomizerConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  };

  return {
    config: initial,
    setSkin: (skinId) =>
      set((state) => ({
        config: save({
          ...state.config,
          skinId,
          buttonPalette: SNES_SKINS[skinId]?.controllerPadsTheme || state.config.buttonPalette,
        }),
      })),
    setLedColor: (ledColor) =>
      set((state) => ({
        config: save({ ...state.config, ledColor }),
      })),
    setButtonPalette: (buttonPalette) =>
      set((state) => ({
        config: save({ ...state.config, buttonPalette }),
      })),
    setCartridge: (data) =>
      set((state) => ({
        config: save({ ...state.config, ...data }),
      })),
    setDecorDecal: (showDecorDecal) =>
      set((state) => ({
        config: save({ ...state.config, showDecorDecal }),
      })),
    setScanlines: (scanlineIntensity) =>
      set((state) => ({
        config: save({ ...state.config, scanlineIntensity }),
      })),
    resetDefaults: () =>
      set(() => ({
        config: save(DEFAULT_CONFIG),
      })),
  };
});

/**
 * Public programmatic API for Custom Widgets or external scripts
 */
export const SnesCustomizerAPI = {
  getSkin: (skinId?: SnesSkinId): SnesSkinDefinition => {
    const target = skinId || useSnesCustomizerStore.getState().config.skinId;
    return SNES_SKINS[target] || SNES_SKINS["snes-classic"];
  },
  listSkins: (): SnesSkinDefinition[] => {
    return Object.values(SNES_SKINS);
  },
  getConfig: (): SnesCustomizerConfig => {
    return useSnesCustomizerStore.getState().config;
  },
  setConfig: (updates: Partial<SnesCustomizerConfig>) => {
    const current = useSnesCustomizerStore.getState().config;
    const merged = { ...current, ...updates };
    useSnesCustomizerStore.setState({ config: merged });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  },
};
