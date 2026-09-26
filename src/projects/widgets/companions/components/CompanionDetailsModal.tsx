import React, { useState, useEffect } from "react";
import {
  X,
  Star,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Play,
  Pause,
  Layers,
  Sparkles,
  Maximize2,
  Gauge,
} from "lucide-react";
import { CompanionManifest, CompanionActionState } from "../types";
import { useCompanionsStore } from "../store/companionsStore";
import { frameCount, spriteStyle } from "../sprite";

interface CompanionDetailsModalProps {
  companion: CompanionManifest;
  onClose: () => void;
  onSpawn: (id: string) => void;
}

export const CompanionDetailsModal: React.FC<CompanionDetailsModalProps> = ({
  companion,
  onClose,
  onSpawn,
}) => {
  const {
    favoriteIds,
    toggleFavorite,
    deleteCustomPackage,
    customCompanions,
    activeCompanions,
  } = useCompanionsStore();

  const isFav = favoriteIds.includes(companion.id);
  const isCustom = customCompanions.some((c) => c.id === companion.id);
  const activeCount = activeCompanions.filter(
    (a) => a.companionId === companion.id
  ).length;

  const availableStates: CompanionActionState[] = (
    Object.keys(companion.animations) as CompanionActionState[]
  ).filter((k) => companion.animations[k]);

  const [activeTestState, setActiveTestState] = useState<CompanionActionState>(
    availableStates.includes("idle") ? "idle" : availableStates[0] || "idle"
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [customFps, setCustomFps] = useState<number>(4);

  const animDef = companion.animations[activeTestState] || companion.animations.idle;
  const isSpritesheet = Boolean(animDef?.spritesheet);
  const frames = animDef?.frames || [companion.preview];
  const totalFrames = isSpritesheet ? frameCount(animDef, 1) : frames.length;

  // Frame ticker
  useEffect(() => {
    setFrameIndex(0);
  }, [activeTestState]);

  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) return;

    const baseDuration = animDef?.frameDuration || Math.round(1000 / customFps);
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % totalFrames);
    }, baseDuration);

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, animDef, customFps, activeTestState]);

  // Spritesheet background position
  const getSpritesheetStyle = (): React.CSSProperties => {
    if (!isSpritesheet || !animDef?.spritesheet) return {};
    return spriteStyle(animDef.spritesheet, frameIndex, 128, 128);
  };

  const handleDelete = () => {
    if (confirm(`Deseja remover o personagem personalizado "${companion.name}"?`)) {
      deleteCustomPackage(companion.id);
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-pink-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleFavorite(companion.id)}
              className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-amber-400 transition-colors"
              title="Favoritar"
            >
              <Star
                className={`w-5 h-5 ${
                  isFav ? "fill-amber-400 text-amber-400" : ""
                }`}
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{companion.name}</h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    {activeCount} ativo{activeCount > 1 ? "s" : ""}
                  </span>
                )}
                {isCustom && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-bold">
                    Personalizado
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 capitalize">
                Categoria: {companion.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCustom && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                title="Excluir este companheiro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-5 custom-scrollbar">
          {/* Top Interactive Animation Tester Stage */}
          <div className="relative h-56 flex flex-col items-center justify-center bg-gradient-to-b from-white/10 to-transparent rounded-2xl border border-white/10 overflow-hidden shadow-inner p-4">
            <div className="flex-1 flex items-center justify-center">
              {isSpritesheet ? (
                <div
                  style={getSpritesheetStyle()}
                  className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <img
                  src={frames[frameIndex] || companion.preview}
                  alt={companion.name}
                  className="h-32 w-32 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-all"
                />
              )}
            </div>

            {/* Animation state switcher pills */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 text-xs">
              {availableStates.map((state) => (
                <button
                  key={state}
                  onClick={() => setActiveTestState(state)}
                  className={`px-3 py-1 rounded-xl font-bold capitalize transition-all ${
                    activeTestState === state
                      ? "bg-pink-500 text-white shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {state === "idle"
                    ? "Parado"
                    : state === "walk"
                    ? "Andando"
                    : state === "sleep"
                    ? "Dormindo"
                    : state === "click"
                    ? "Clique"
                    : state === "drag"
                    ? "Arrastando"
                    : state}
                </button>
              ))}

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                title={isPlaying ? "Pausar Prévia" : "Reproduzir Prévia"}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </div>
          </div>

          {/* Details & Specs Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: About & Credits */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-pink-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={14} /> Sobre o Personagem
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                {companion.description}
              </p>

              <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-pink-400" /> Autor:
                  </span>
                  <span className="font-semibold text-white">{companion.author}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Licença:
                  </span>
                  <span className="font-semibold text-emerald-300">
                    {companion.license}
                  </span>
                </div>

                {companion.sourceUrl && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-white/50">Fonte Oficial:</span>
                    <a
                      href={companion.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-300 hover:text-pink-200 flex items-center gap-1 underline text-[11px]"
                    >
                      Ver no Acervo <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Technical Specs & Animation Info */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-sky-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers size={14} /> Ficha Técnica do Pacote
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1">
                    <Maximize2 size={13} /> Dimensões Base:
                  </span>
                  <span className="font-mono text-white/90">
                    {companion.dimensions.width} x {companion.dimensions.height} px
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50">Escala Padrão:</span>
                  <span className="font-mono text-white/90">
                    {((companion.defaultScale ?? 1.0) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1">
                    <Gauge size={13} /> Velocidade de Passo:
                  </span>
                  <span className="font-mono text-white/90">
                    {companion.speed} px/s
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50">Formato dos Gráficos:</span>
                  <span className="font-semibold text-white/90">
                    {isSpritesheet ? "Spritesheet PNG (Pixel Art)" : "Vetores SVG / PNG"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50">Frames da Animação Atual:</span>
                  <span className="font-mono text-pink-300 font-bold">
                    {frameIndex + 1} de {totalFrames} frames
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-xs text-white/50">
            Aparece animado e livre na área de trabalho do Windows.
          </span>

          <button
            onClick={() => {
              onSpawn(companion.id);
              onClose();
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Colocar na Área de Trabalho</span>
          </button>
        </div>
      </div>
    </div>
  );
};
