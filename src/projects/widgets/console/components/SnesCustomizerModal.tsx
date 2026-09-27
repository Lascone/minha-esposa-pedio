import React from "react";
import { X, Palette, Sparkles, Check, RotateCcw, Sliders, Tv, Disc } from "lucide-react";
import {
  useSnesCustomizerStore,
  SNES_SKINS,
  SnesSkinId,
  LedColor,
  ButtonPalette,
} from "../snesCustomizer";

interface SnesCustomizerModalProps {
  onClose: () => void;
}

const LED_OPTIONS: { id: LedColor; label: string; color: string }[] = [
  { id: "red", label: "Vermelho Clássico", color: "#ef4444" },
  { id: "green", label: "Verde Esmeralda", color: "#22c55e" },
  { id: "cyan", label: "Ciano Neon", color: "#06b6d4" },
  { id: "pink", label: "Rosa Sakura", color: "#ec4899" },
  { id: "amber", label: "Âmbar Retrô", color: "#f59e0b" },
  { id: "purple", label: "Roxo Atômico", color: "#a855f7" },
];

const BUTTON_PALETTES: { id: ButtonPalette; label: string; desc: string; colors: string[] }[] = [
  {
    id: "classic-purple",
    label: "Lilás & Roxo Clássico",
    desc: "Visual icônico do controle americano (Y/X côncavos e B/A convexos)",
    colors: ["#a855f7", "#7c3aed", "#6366f1", "#4f46e5"],
  },
  {
    id: "sfc-four-color",
    label: "Super Famicom 4 Cores",
    desc: "Verde, Amarelo, Vermelho e Azul brilhantes estilo japonês e europeu",
    colors: ["#22c55e", "#eab308", "#ef4444", "#3b82f6"],
  },
  {
    id: "pastel-candy",
    label: "Pastel Kawaii Candy",
    desc: "Tons suaves de algodão doce e morango",
    colors: ["#f472b6", "#c084fc", "#93c5fd", "#fde047"],
  },
  {
    id: "cyber-neon",
    label: "Cyber Neon High-Tech",
    desc: "Ciano e magenta de alto contraste",
    colors: ["#06b6d4", "#d946ef", "#38bdf8", "#ec4899"],
  },
];

const CARTRIDGE_COLORS = [
  { label: "Cinza Cartucho", hex: "#475569" },
  { label: "Preto Ébano", hex: "#1e293b" },
  { label: "Dourado Especial", hex: "#b45309" },
  { label: "Rosa Quartzo", hex: "#f472b6" },
  { label: "Roxo Translúcido", hex: "#7e22ce" },
  { label: "Ciano Neon", hex: "#0e7490" },
];

export const SnesCustomizerModal: React.FC<SnesCustomizerModalProps> = ({ onClose }) => {
  const {
    config,
    setSkin,
    setLedColor,
    setButtonPalette,
    setCartridge,
    setScanlines,
    resetDefaults,
  } = useSnesCustomizerStore();

  const activeSkin = SNES_SKINS[config.skinId] || SNES_SKINS["snes-classic"];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-pink-500/40 rounded-3xl shadow-2xl text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                Personalizador do Mini Console SNES <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-[11px] text-white/60">
                Alterne a carcaça física, a paleta dos botões, adesivo do cartucho e o LED de energia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs custom-scrollbar">
          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-3 flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse shadow-md"
                style={{
                  backgroundColor: LED_OPTIONS.find((l) => l.id === config.ledColor)?.color || "#ef4444",
                  boxShadow: `0 0 10px ${LED_OPTIONS.find((l) => l.id === config.ledColor)?.color || "#ef4444"}`,
                }}
              />
              <span className="text-[10px] font-bold text-white/60">POWER LED</span>
            </div>

            <div className="text-center my-2">
              <span className="text-2xl">{activeSkin.emoji}</span>
              <p className={`text-base font-black tracking-widest mt-1 ${activeSkin.badgeColor}`}>
                {activeSkin.badgeText}
              </p>
              <p className="text-[10px] text-white/50">{activeSkin.name}</p>
            </div>

            {/* Cartridge Preview */}
            <div
              className="px-6 py-2 rounded-xl border border-white/20 shadow-inner flex flex-col items-center justify-center transition-colors"
              style={{ backgroundColor: config.cartridgeColor }}
            >
              <div className="bg-black/50 px-3 py-1 rounded-md border border-white/20 text-center">
                <p className="text-[11px] font-extrabold text-amber-300 tracking-wide uppercase">
                  {config.cartridgeLabel || "SUPER MARIO WORLD"}
                </p>
                <p className="text-[8px] text-white/60 uppercase">
                  {config.cartridgeLabelSub || "16-BIT HIGH DEFINITION GRAPHICS"}
                </p>
              </div>
            </div>
          </div>

          {/* 1. Escolha da Carcaça / Skin */}
          <div className="space-y-2">
            <label className="font-bold text-pink-300 text-xs flex items-center gap-1.5">
              <Tv size={14} /> 1. Carcaça & Edição do Console
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(SNES_SKINS).map((skin) => {
                const isSelected = config.skinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    onClick={() => setSkin(skin.id as SnesSkinId)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/15 ring-2 ring-pink-500/20"
                        : "border-white/10 hover:border-white/20 bg-white/5"
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{skin.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-white truncate">{skin.name}</span>
                        {isSelected && <Check size={14} className="text-pink-400 shrink-0 ml-1" />}
                      </div>
                      <p className="text-[10px] text-white/60 line-clamp-2 mt-0.5">{skin.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. LED de Energia */}
          <div className="space-y-2">
            <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
              <Sparkles size={14} /> 2. Cor do LED Frontal (Power Indicator)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {LED_OPTIONS.map((led) => {
                const isSelected = config.ledColor === led.id;
                return (
                  <button
                    key={led.id}
                    onClick={() => setLedColor(led.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/15 ring-1 ring-pink-500/40"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{
                        backgroundColor: led.color,
                        boxShadow: isSelected ? `0 0 8px ${led.color}` : "none",
                      }}
                    />
                    <span className="text-[9px] font-bold text-white/80 text-center leading-tight truncate w-full">
                      {led.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Botões do Controle */}
          <div className="space-y-2">
            <label className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
              <Sliders size={14} /> 3. Paleta de Cores dos Botões
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BUTTON_PALETTES.map((palette) => {
                const isSelected = config.buttonPalette === palette.id;
                return (
                  <button
                    key={palette.id}
                    onClick={() => setButtonPalette(palette.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-sky-400 bg-sky-500/15 ring-1 ring-sky-400/40"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-[11px] text-white">{palette.label}</p>
                      <p className="text-[9px] text-white/50">{palette.desc}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      {palette.colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-black/30"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Cartucho de Jogo */}
          <div className="space-y-3">
            <label className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
              <Disc size={14} /> 4. Personalizar Cartucho Inserido
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-white/60 mb-1 block">Cor da Carcaça do Cartucho</span>
                <div className="flex gap-1.5 flex-wrap">
                  {CARTRIDGE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setCartridge({ cartridgeColor: c.hex })}
                      title={c.label}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                        config.cartridgeColor === c.hex ? "border-white ring-2 ring-emerald-400" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {config.cartridgeColor === c.hex && <Check size={12} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] text-white/60 block">Texto do Rótulo do Cartucho</span>
                  <input
                    value={config.cartridgeLabel}
                    onChange={(e) => setCartridge({ cartridgeLabel: e.target.value })}
                    placeholder="Ex: SUPER MARIO WORLD"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-emerald-400 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Efeito CRT Scanlines */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tv size={15} className="text-purple-300" />
              <div>
                <span className="font-bold text-[11px] block">Linhas de Varredura Retrô (CRT Scanlines)</span>
                <span className="text-[10px] text-white/50">
                  Intensidade da textura clássica de tubo de TV: {config.scanlineIntensity}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={config.scanlineIntensity}
              onChange={(e) => setScanlines(Number(e.target.value))}
              className="accent-pink-500 w-32"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-950/80">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs transition-colors"
          >
            <RotateCcw size={12} />
            <span>Restaurar Padrão</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-xs font-bold text-white shadow-lg shadow-pink-500/20"
          >
            Salvar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
