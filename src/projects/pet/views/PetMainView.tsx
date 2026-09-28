import React, { useState, useEffect } from "react";
import {
  Heart,
  Sparkles,
  Monitor,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Sliders,
  Maximize2,
  Trash2,
  CheckCircle,
  Cat,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { usePetStore } from "../store/petStore";
import { PetCarePanel } from "../components/PetCarePanel";
import { PetEditorModal } from "../editor/PetEditorModal";
import { PetCharacterManifest } from "../types";

export const PetMainView: React.FC = () => {
  const {
    getActiveCharacter,
    getAllCharacters,
    activeCharacterId,
    selectCharacter,
    customName,
    currentState,
    facing,
    isDesktopActive,
    togglePetDesktop,
    config,
    updateConfig,
    stats,
    processTimePassage,
    deleteCustomCharacter,
  } = usePetStore();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<
    PetCharacterManifest | undefined
  >(undefined);

  const character = getActiveCharacter();
  const allCharacters = getAllCharacters();

  // Executa checagem de passagem de tempo amigável ao focar na aba
  useEffect(() => {
    processTimePassage();
  }, [processTimePassage]);

  // Frame de exibição da animação no painel
  const [animFrameIndex, setAnimFrameIndex] = useState(0);
  const activeAnim =
    character.animations[currentState] || character.animations.idle;

  useEffect(() => {
    if (!activeAnim || !activeAnim.frames || activeAnim.frames.length <= 1) {
      setAnimFrameIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setAnimFrameIndex((prev) => {
        if (prev + 1 >= activeAnim.frames.length) {
          return activeAnim.loop !== false ? 0 : prev;
        }
        return prev + 1;
      });
    }, activeAnim.frameDuration || 150);
    return () => clearInterval(interval);
  }, [activeAnim]);

  const currentFrame = activeAnim?.frames?.[animFrameIndex] || "";
  const isSvg =
    currentFrame.trim().startsWith("<svg") || currentFrame.includes("</svg>");

  return (
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto animate-fadeIn select-none">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30 rounded-3xl p-6 shadow-soft backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-soft">
            <Cat size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-theme-text">
                Bichinho Virtual de Desktop
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-500 text-white shadow-soft">
                VPET MODULAR
              </span>
            </div>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Seu companheiro fofinho que vive na área de trabalho, passeia sobre as janelas e recebe muito carinho todos os dias! 💕
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingCharacter(undefined);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-theme-surface-card hover:bg-theme-surface text-theme-text border border-theme-border/60 font-bold text-xs shadow-soft transition-all"
          >
            <Plus size={16} className="text-pink-500" />
            <span>Criar Novo Pet (Mod Maker)</span>
          </button>

          <button
            onClick={togglePetDesktop}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-soft transition-all transform active:scale-95 ${
              isDesktopActive
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            }`}
          >
            <Monitor size={16} />
            <span>
              {isDesktopActive ? "Recolher do Desktop" : "Lançar na Área de Trabalho 🐾"}
            </span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Mascote em Destaque + Cuidados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna do Mascote (4 colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-theme-surface-card border border-theme-border/60 rounded-3xl p-6 flex flex-col items-center text-center shadow-soft relative overflow-hidden group">
            {/* Tag do Status */}
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                Mascote Ativo
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isDesktopActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDesktopActive ? "bg-emerald-400 animate-ping" : "bg-zinc-400"
                  }`}
                />
                {isDesktopActive ? "Ativo na Tela" : "Dormindo na Mochila"}
              </span>
            </div>

            {/* Balão de Fala Simulado */}
            <div className="w-full max-w-[240px] px-3.5 py-2 bg-theme-surface border border-pink-500/30 rounded-2xl text-xs text-theme-text font-semibold shadow-soft mb-4 relative animate-fadeIn">
              {character.voiceLines.idle?.[0] || "Miau! Que bom te ver aqui amor! 💕"}
              <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-theme-surface rotate-45 border-r border-b border-pink-500/30" />
            </div>

            {/* Sprite Interativo */}
            <div className="w-44 h-44 flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-pink-500/5 to-purple-500/5 border border-pink-500/20 shadow-inner group-hover:scale-105 transition-transform duration-300">
              {currentFrame ? (
                isSvg ? (
                  <div
                    className="w-36 h-36 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: currentFrame }}
                  />
                ) : (
                  <img
                    src={currentFrame}
                    alt={character.name}
                    className="w-36 h-36 object-contain"
                  />
                )
              ) : (
                <div className="text-xs text-theme-text-muted">Sem sprite</div>
              )}
            </div>

            {/* Informações do Personagem */}
            <div className="flex flex-col items-center mt-4">
              <h2 className="text-lg font-extrabold text-theme-text flex items-center gap-1.5">
                {customName || character.name}
                <Sparkles size={16} className="text-pink-500" />
              </h2>
              <span className="text-xs text-pink-500 font-semibold">
                {character.species}
              </span>
              <p className="text-[11px] text-theme-text-muted mt-1 max-w-[260px] line-clamp-2">
                {character.description}
              </p>
            </div>

            {/* Botão de Editar Este Personagem */}
            <button
              onClick={() => {
                setEditingCharacter(character);
                setIsEditorOpen(true);
              }}
              className="mt-4 w-full py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-card border border-theme-border/60 text-xs font-bold text-theme-text transition-all flex items-center justify-center gap-2"
            >
              <Sliders size={14} className="text-pink-500" />
              Editar no Mod Maker
            </button>
          </div>

          {/* Configurações de Desktop */}
          <div className="bg-theme-surface-card border border-theme-border/60 rounded-3xl p-5 flex flex-col gap-4 shadow-soft">
            <span className="text-xs font-extrabold text-theme-text flex items-center gap-2">
              <Sliders size={14} className="text-pink-500" /> Ajustes do Desktop
            </span>

            {/* Escala */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                <span>Tamanho do Mascote:</span>
                <span className="text-pink-500">{config.scale}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.2"
                step="0.05"
                value={config.scale}
                onChange={(e) =>
                  updateConfig({ scale: parseFloat(e.target.value) })
                }
                className="w-full accent-pink-500"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2 pt-2 border-t border-theme-border/40 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-theme-text font-semibold">
                  Sempre no Topo das janelas
                </span>
                <input
                  type="checkbox"
                  checked={config.alwaysOnTop}
                  onChange={(e) =>
                    updateConfig({ alwaysOnTop: e.target.checked })
                  }
                  className="accent-pink-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-theme-text font-semibold">
                  Andar livremente pela tela
                </span>
                <input
                  type="checkbox"
                  checked={config.moveAroundDesktop}
                  onChange={(e) =>
                    updateConfig({ moveAroundDesktop: e.target.checked })
                  }
                  className="accent-pink-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-theme-text font-semibold">
                  Efeitos sonoros e falas
                </span>
                <input
                  type="checkbox"
                  checked={config.soundEnabled}
                  onChange={(e) =>
                    updateConfig({ soundEnabled: e.target.checked })
                  }
                  className="accent-pink-500 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Coluna Central / Direita: Cuidados & Mochila & Coleção (8 colunas) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Painel Completo de Cuidados */}
          <PetCarePanel />

          {/* Coleção de Personagens (Presets + Customizados do Editor) */}
          <div className="bg-theme-surface-card border border-theme-border/60 rounded-3xl p-6 flex flex-col gap-4 shadow-soft">
            <div className="flex items-center justify-between border-b border-theme-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-theme-text">
                  🐾 Meus Personagens & Amiguinhos
                </span>
                <span className="text-xs text-theme-text-muted">
                  ({allCharacters.length} personagens disponíveis)
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingCharacter(undefined);
                  setIsEditorOpen(true);
                }}
                className="text-xs font-bold text-pink-500 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Novo Personagem
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allCharacters.map((char) => {
                const isSelected = char.id === activeCharacterId;
                const previewFrame =
                  char.animations.idle?.frames?.[0] || char.previewImage;
                const isCharSvg =
                  previewFrame &&
                  (previewFrame.trim().startsWith("<svg") ||
                    previewFrame.includes("</svg>"));

                return (
                  <div
                    key={char.id}
                    onClick={() => selectCharacter(char.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/10 shadow-soft"
                        : "border-theme-border/60 bg-theme-surface hover:border-pink-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-theme-surface-card border border-theme-border/50 flex items-center justify-center p-1 group-hover:scale-105 transition-transform flex-shrink-0">
                        {previewFrame ? (
                          isCharSvg ? (
                            <div
                              className="w-12 h-12 flex items-center justify-center"
                              dangerouslySetInnerHTML={{ __html: previewFrame }}
                            />
                          ) : (
                            <img
                              src={previewFrame}
                              alt={char.name}
                              className="w-12 h-12 object-contain"
                            />
                          )
                        ) : (
                          <Cat size={24} className="text-theme-text-muted" />
                        )}
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-extrabold text-theme-text truncate">
                          {char.name}
                        </span>
                        <span className="text-[10px] text-pink-500 font-semibold truncate">
                          {char.species}
                        </span>
                        <span className="text-[9px] text-theme-text-muted truncate">
                          por {char.author}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-theme-border/40">
                      {isSelected ? (
                        <span className="text-[10px] font-bold text-pink-500 flex items-center gap-1">
                          <CheckCircle size={12} /> Adotado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-theme-text-muted group-hover:text-pink-500">
                          Clique para Adotar
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCharacter(char);
                            setIsEditorOpen(true);
                          }}
                          className="p-1 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
                          title="Editar no Mod Maker"
                        >
                          <Sliders size={13} />
                        </button>
                        {char.id !== "mimi-sakura" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Excluir o personagem "${char.name}"?`)) {
                                deleteCustomCharacter(char.id);
                              }
                            }}
                            className="p-1 rounded-md text-rose-400 hover:text-rose-600 hover:bg-theme-surface-card"
                            title="Excluir personagem"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal do Editor de Personagem */}
      <PetEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialCharacter={editingCharacter}
      />
    </div>
  );
};
export default PetMainView;
