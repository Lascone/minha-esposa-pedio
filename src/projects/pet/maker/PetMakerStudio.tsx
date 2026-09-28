import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Layers,
  Utensils,
  MessageSquare,
  Download,
  Upload,
  Plus,
  Trash2,
  Play,
  Pause,
  Sliders,
  CheckCircle,
  HelpCircle,
  Eye,
  Cat,
  Heart,
  Coffee,
  Smile,
  ShieldCheck,
} from "lucide-react";
import {
  PetCharacterManifest,
  PetState,
  PetAnimationDef,
  PetItem,
} from "../types";
import { usePetStore } from "../store/petStore";
import { VUP_CHARACTER, MIMI_CHARACTER } from "../presets";

interface PetMakerStudioProps {
  onBackToGame?: () => void;
  targetCharacterId?: string;
}

const MOD_STATES: { state: PetState; label: string; icon: string; category: string }[] = [
  { state: "idle", label: "Parado (Idle)", icon: "✨", category: "Básico" },
  { state: "walk", label: "Andando (Caminhada)", icon: "🐾", category: "Movimento" },
  { state: "happy", label: "Feliz / Comemorando", icon: "🥰", category: "Humor" },
  { state: "sad", label: "Triste / Carente", icon: "🥺", category: "Humor" },
  { state: "hungry", label: "Com Fome", icon: "🍖", category: "Necessidades" },
  { state: "eat", label: "Comendo Lanche", icon: "😋", category: "Ações" },
  { state: "drink", label: "Bebendo Água", icon: "💧", category: "Ações" },
  { state: "play", label: "Brincando / Música", icon: "🎾", category: "Ações" },
  { state: "sleep", label: "Dormindo (zZz)", icon: "💤", category: "Descanso" },
  { state: "wake", label: "Acordando (Bom dia)", icon: "☀️", category: "Descanso" },
  { state: "pet_head", label: "Cafuné na Cabeça", icon: "💖", category: "Carinho" },
  { state: "pet_body", label: "Carinho no Corpo", icon: "💕", category: "Carinho" },
  { state: "drag", label: "Sendo Arrastado (Raise)", icon: "🫳", category: "Física" },
];

export const PetMakerStudio: React.FC<PetMakerStudioProps> = ({
  onBackToGame,
  targetCharacterId,
}) => {
  const {
    saveCustomCharacter,
    selectCharacter,
    getAllCharacters,
    spawnPetOnDesktop,
  } = usePetStore();

  const [activeTab, setActiveTab] = useState<
    "identity" | "animations" | "food" | "dialogs" | "export"
  >("identity");

  // Personagem sendo editado no Studio
  const [character, setCharacter] = useState<PetCharacterManifest>(() => {
    const all = getAllCharacters();
    const existing = all.find((c) => c.id === targetCharacterId);
    if (existing) return JSON.parse(JSON.stringify(existing));
    return JSON.parse(JSON.stringify(VUP_CHARACTER));
  });

  // Estado da aba de animação
  const [selectedState, setSelectedState] = useState<PetState>("idle");
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Criador de comidas (Food Maker)
  const [customFoods, setCustomFoods] = useState<PetItem[]>(() => {
    return character.customItems || [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  const currentAnim = character.animations[selectedState] || {
    name: selectedState,
    frames: [],
    frameDuration: 180,
    loop: true,
  };

  // Loop de prévia do frame ativo
  useEffect(() => {
    if (!previewPlaying || !currentAnim.frames || currentAnim.frames.length <= 1) {
      setPreviewIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPreviewIndex((prev) => {
        if (prev + 1 >= currentAnim.frames.length) {
          return currentAnim.loop !== false ? 0 : prev;
        }
        return prev + 1;
      });
    }, currentAnim.frameDuration || 180);
    return () => clearInterval(interval);
  }, [previewPlaying, currentAnim]);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Upload de quadros de animação
  const handleUploadFrames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result as string;
        if (dataUrl) {
          setCharacter((prev) => {
            const anim = prev.animations[selectedState] || {
              name: selectedState,
              frames: [],
              frameDuration: 180,
              loop: true,
            };
            return {
              ...prev,
              animations: {
                ...prev.animations,
                [selectedState]: {
                  ...anim,
                  frames: [...anim.frames, dataUrl],
                },
              },
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
    showFeedback(`${files.length} quadro(s) adicionado(s) a ${selectedState}! ✨`);
  };

  const handleRemoveFrame = (frameIdx: number) => {
    setCharacter((prev) => {
      const anim = prev.animations[selectedState];
      if (!anim) return prev;
      return {
        ...prev,
        animations: {
          ...prev.animations,
          [selectedState]: {
            ...anim,
            frames: anim.frames.filter((_, i) => i !== frameIdx),
          },
        },
      };
    });
  };

  // Adicionar Comida Customizada (Food Maker)
  const handleAddFoodItem = () => {
    const name = prompt("Nome da comida/bebida:", "Docinho de Leite");
    if (!name || !name.trim()) return;

    const newItem: PetItem = {
      id: `food-custom-${Date.now()}`,
      name: name.trim(),
      category: "food",
      icon: "🧁",
      desc: "Delicioso item personalizado criado no Mod Maker!",
      effects: {
        hunger: 35,
        happiness: 25,
        bondXp: 15,
      },
      animationState: "eat",
    };

    const nextFoods = [...customFoods, newItem];
    setCustomFoods(nextFoods);
    setCharacter({ ...character, customItems: nextFoods });
    showFeedback(`Comida "${name}" adicionada ao inventário do pet! 🍰`);
  };

  const handleRemoveFoodItem = (itemId: string) => {
    const nextFoods = customFoods.filter((f) => f.id !== itemId);
    setCustomFoods(nextFoods);
    setCharacter({ ...character, customItems: nextFoods });
  };

  // Salvar e Aplicar
  const handleSaveCharacter = () => {
    saveCustomCharacter(character);
    selectCharacter(character.id);
    showFeedback(`Personagem "${character.name}" salvo com sucesso na sua coleção! 💕`);
  };

  const handleTestOnDesktop = async () => {
    handleSaveCharacter();
    await spawnPetOnDesktop();
    showFeedback(`Mascote lançado na tela com as modificações do Maker! 🐾`);
  };

  // Exportar Pacote .pet.json
  const handleExportPackage = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(character, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${character.id || "pet-mod"}.pet.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showFeedback(`Pacote ${character.name}.pet.json baixado com sucesso! 📦`);
  };

  // Importar Pacote
  const handleImportPackage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      try {
        const parsed = JSON.parse(loadEvt.target?.result as string);
        if (!parsed.name || !parsed.animations) {
          showFeedback("Arquivo inválido! Certifique-se de que é um mod .pet.json");
          return;
        }
        setCharacter(parsed);
        if (parsed.customItems) setCustomFoods(parsed.customItems);
        showFeedback(`Mod "${parsed.name}" importado com sucesso! 🎉`);
      } catch {
        showFeedback("Erro ao importar: Arquivo JSON corrompido.");
      }
    };
    reader.readAsText(file);
  };

  const currentPreviewFrame = currentAnim.frames?.[previewIndex] || "";
  const isSvg =
    currentPreviewFrame.trim().startsWith("<svg") ||
    currentPreviewFrame.includes("</svg>");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6 animate-fadeIn select-none">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-20 right-8 z-50 bg-pink-600/95 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-pink-400/50 backdrop-blur-md animate-bounce flex items-center gap-2">
          <Sparkles size={16} />
          {feedbackMsg}
        </div>
      )}

      {/* Header do Pet Maker Studio */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-theme-surface-card border border-theme-border/60 p-5 rounded-3xl shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-soft">
            🛠️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-theme-text">
                Oficina de Criação de Pets (VPet Mod Maker)
              </h1>
              <span className="text-[10px] bg-pink-500/20 text-pink-500 px-2 py-0.5 rounded-full font-bold">
                OFICIAL
              </span>
            </div>
            <p className="text-xs text-theme-text-muted">
              Crie personagens do zero, edite quadros de animação, adicione comidinhas e falas em português.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onBackToGame && (
            <button
              onClick={onBackToGame}
              className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-card text-theme-text border border-theme-border/60 text-xs font-bold transition-all"
            >
              Voltar ao Jogo 🎮
            </button>
          )}

          <button
            onClick={handleTestOnDesktop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all"
          >
            <Eye size={14} />
            Testar na Tela
          </button>

          <button
            onClick={handleSaveCharacter}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-soft transition-all transform active:scale-95"
          >
            <CheckCircle size={14} />
            Salvar Mod 💕
          </button>
        </div>
      </div>

      {/* Navegação de Abas do Maker */}
      <div className="flex items-center gap-2 border-b border-theme-border/50 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "identity"
              ? "bg-theme-primary text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
          }`}
        >
          <Cat size={15} />
          Mascote & Identidade
        </button>

        <button
          onClick={() => setActiveTab("animations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "animations"
              ? "bg-theme-primary text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
          }`}
        >
          <Layers size={15} />
          Estúdio de Animações ({Object.keys(character.animations || {}).length})
        </button>

        <button
          onClick={() => setActiveTab("food")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "food"
              ? "bg-theme-primary text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
          }`}
        >
          <Utensils size={15} />
          Criador de Comidas & Itens ({customFoods.length})
        </button>

        <button
          onClick={() => setActiveTab("dialogs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "dialogs"
              ? "bg-theme-primary text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
          }`}
        >
          <MessageSquare size={15} />
          Falas & Diálogos em pt-BR
        </button>

        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "export"
              ? "bg-theme-primary text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
          }`}
        >
          <Download size={15} />
          Exportar & Importar Mod (.pet.json)
        </button>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* 1. Identidade & Mascote */}
      {activeTab === "identity" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-theme-text flex items-center gap-2 border-b border-theme-border/40 pb-2">
              <Sliders size={16} className="text-pink-500" /> Informações Básicas do Mod
            </h3>

            <div>
              <label className="text-xs font-bold text-theme-text mb-1 block">
                Nome do Personagem:
              </label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-text mb-1 block">
                Espécie / Categoria:
              </label>
              <input
                type="text"
                value={character.species}
                onChange={(e) => setCharacter({ ...character, species: e.target.value })}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-text mb-1 block">
                Autor / Criador:
              </label>
              <input
                type="text"
                value={character.author}
                onChange={(e) => setCharacter({ ...character, author: e.target.value })}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-theme-text mb-1 block">
                Descrição com carinho:
              </label>
              <textarea
                rows={3}
                value={character.description}
                onChange={(e) =>
                  setCharacter({ ...character, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-theme-text flex items-center gap-2 border-b border-theme-border/40 pb-2">
              <Eye size={16} className="text-pink-500" /> Parâmetros de Desktop & Hitbox
            </h3>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                <span>Escala Inicial no Desktop:</span>
                <span className="text-pink-500">{character.defaultScale}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={character.defaultScale}
                onChange={(e) =>
                  setCharacter({ ...character, defaultScale: parseFloat(e.target.value) })
                }
                className="w-full accent-pink-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                <span>Velocidade de Passos (px/s):</span>
                <span className="text-pink-500">{character.moveSpeed} px/s</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                step="5"
                value={character.moveSpeed}
                onChange={(e) =>
                  setCharacter({ ...character, moveSpeed: parseInt(e.target.value, 10) })
                }
                className="w-full accent-pink-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-theme-text-muted mb-1 block">
                  Largura Hitbox (px):
                </label>
                <input
                  type="number"
                  value={character.hitbox.width}
                  onChange={(e) =>
                    setCharacter({
                      ...character,
                      hitbox: {
                        ...character.hitbox,
                        width: parseInt(e.target.value, 10) || 120,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-theme-text-muted mb-1 block">
                  Altura Hitbox (px):
                </label>
                <input
                  type="number"
                  value={character.hitbox.height}
                  onChange={(e) =>
                    setCharacter({
                      ...character,
                      hitbox: {
                        ...character.hitbox,
                        height: parseInt(e.target.value, 10) || 120,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Estúdio de Animações */}
      {activeTab === "animations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60">
          {/* Seletor de Estados (4 colunas) */}
          <div className="lg:col-span-4 flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
            <span className="text-xs font-extrabold text-theme-text mb-1">
              Estados do Mascote
            </span>
            {MOD_STATES.map((st) => {
              const framesCount = character.animations[st.state]?.frames?.length || 0;
              const isSelected = selectedState === st.state;
              return (
                <button
                  key={st.state}
                  onClick={() => {
                    setSelectedState(st.state);
                    setPreviewIndex(0);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isSelected
                      ? "bg-pink-500 text-white shadow-soft"
                      : "bg-theme-surface hover:bg-theme-surface-card border border-theme-border/40 text-theme-text"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{st.icon}</span>
                    <span>{st.label}</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                      framesCount > 0
                        ? isSelected
                          ? "bg-white/20 text-white"
                          : "bg-emerald-500/10 text-emerald-400"
                        : "bg-theme-border/30 text-theme-text-muted"
                    }`}
                  >
                    {framesCount} q.
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prévia Visual & Controles de Duração (4 colunas) */}
          <div className="lg:col-span-4 flex flex-col gap-4 bg-theme-surface p-4 rounded-2xl border border-theme-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-theme-text">
                Prévia Interativa ({selectedState})
              </span>
              <button
                onClick={() => setPreviewPlaying(!previewPlaying)}
                className="p-1.5 rounded-lg bg-theme-surface-card hover:bg-theme-surface text-theme-text border border-theme-border/60 text-xs flex items-center gap-1 font-bold"
              >
                {previewPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{previewPlaying ? "Pausar" : "Tocar"}</span>
              </button>
            </div>

            <div className="w-full h-52 bg-black/5 dark:bg-black/20 rounded-2xl border border-dashed border-theme-border/80 flex items-center justify-center relative overflow-hidden">
              {currentPreviewFrame ? (
                isSvg ? (
                  <div
                    className="w-36 h-36 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: currentPreviewFrame }}
                  />
                ) : (
                  <img
                    src={currentPreviewFrame}
                    alt="Prévia de quadro"
                    className="w-36 h-36 object-contain"
                  />
                )
              ) : (
                <div className="text-xs text-theme-text-muted">Nenhum quadro adicionado</div>
              )}

              {currentAnim.frames.length > 0 && (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">
                  Quadro: {previewIndex + 1}/{currentAnim.frames.length}
                </div>
              )}
            </div>

            {/* Ajuste de FrameDuration (FPS) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                <span>Duração do Quadro (ms):</span>
                <span className="text-pink-500">{currentAnim.frameDuration || 180} ms</span>
              </div>
              <input
                type="range"
                min="40"
                max="600"
                step="10"
                value={currentAnim.frameDuration || 180}
                onChange={(e) => {
                  const ms = parseInt(e.target.value, 10);
                  setCharacter((prev) => ({
                    ...prev,
                    animations: {
                      ...prev.animations,
                      [selectedState]: {
                        ...currentAnim,
                        frameDuration: ms,
                      },
                    },
                  }));
                }}
                className="w-full accent-pink-500"
              />
            </div>
          </div>

          {/* Gerenciamento de Quadros (4 colunas) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-theme-text">
                Quadros Importados ({currentAnim.frames.length})
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-soft transition-all"
              >
                <Plus size={14} />
                <span>Adicionar PNGs</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/gif,image/webp,image/svg+xml"
                multiple
                onChange={handleUploadFrames}
                className="hidden"
              />
            </div>

            <div className="flex-1 max-h-[420px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {currentAnim.frames.map((frame, idx) => (
                <div
                  key={idx}
                  className={`relative bg-theme-surface border rounded-xl p-1.5 flex flex-col items-center justify-center group ${
                    previewIndex === idx ? "border-pink-500 bg-pink-500/5" : "border-theme-border/50"
                  }`}
                >
                  {frame.trim().startsWith("<svg") ? (
                    <div
                      className="w-16 h-16 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: frame }}
                    />
                  ) : (
                    <img
                      src={frame}
                      alt={`Quadro ${idx + 1}`}
                      className="w-16 h-16 object-contain"
                    />
                  )}
                  <span className="text-[10px] font-mono text-theme-text-muted mt-1">
                    #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveFrame(idx)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover este quadro"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {currentAnim.frames.length === 0 && (
                <div className="col-span-2 py-12 text-center text-xs text-theme-text-muted border border-dashed border-theme-border/60 rounded-xl">
                  Nenhum quadro ainda. Clique em "Adicionar PNGs" para enviar imagens transparentes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Criador de Comidas & Itens (Food Maker) */}
      {activeTab === "food" && (
        <div className="bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-theme-border/40 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-theme-text flex items-center gap-2">
                <Utensils size={16} className="text-pink-500" />
                Criador de Comidas, Bebidas & Mimos (Food Maker)
              </h3>
              <p className="text-xs text-theme-text-muted">
                Crie guloseimas que o seu pet pode saborear para saciar a fome, sede ou ganhar alegria!
              </p>
            </div>
            <button
              onClick={handleAddFoodItem}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-soft transition-all"
            >
              <Plus size={14} /> Nova Guloseima
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {customFoods.map((item) => (
              <div
                key={item.id}
                className="bg-theme-surface p-4 rounded-2xl border border-theme-border/60 flex flex-col justify-between group hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <button
                    onClick={() => handleRemoveFoodItem(item.id)}
                    className="p-1 rounded-md text-rose-400 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Excluir item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-2">
                  <h4 className="text-xs font-extrabold text-theme-text">{item.name}</h4>
                  <p className="text-[10px] text-theme-text-muted mt-0.5 line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-theme-border/40">
                  {item.effects.hunger && (
                    <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-1.5 py-0.5 rounded-md">
                      +{item.effects.hunger} Fome
                    </span>
                  )}
                  {item.effects.thirst && (
                    <span className="text-[9px] bg-sky-500/10 text-sky-400 font-bold px-1.5 py-0.5 rounded-md">
                      +{item.effects.thirst} Sede
                    </span>
                  )}
                  {item.effects.happiness && (
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded-md">
                      +{item.effects.happiness} Alegria
                    </span>
                  )}
                </div>
              </div>
            ))}
            {customFoods.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-theme-text-muted border border-dashed border-theme-border/60 rounded-2xl">
                Nenhum item personalizado criado ainda. Clique em "Nova Guloseima" para inventar comidinhas! 🥐
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Falas & Diálogos em Português */}
      {activeTab === "dialogs" && (
        <div className="bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-extrabold text-theme-text flex items-center gap-2">
              <MessageSquare size={16} className="text-pink-500" />
              Editor de Falas & Textos em Português (Text / Dialog Maker)
            </h3>
            <p className="text-xs text-theme-text-muted">
              Configure o que o seu mascote dirá na tela em cada momento do dia.
            </p>
          </div>

          {(
            [
              { key: "greetings", label: "Saudações ao Iniciar / Acordar ☀️" },
              { key: "hungry", label: "Quando estiver com Fome 🍖" },
              { key: "thirsty", label: "Quando estiver com Sede 💧" },
              { key: "sleepy", label: "Quando estiver com Sono 💤" },
              { key: "happy", label: "Quando estiver Muito Feliz ✨" },
              { key: "afterCare", label: "Ao Receber Carinho / Cafuné 💖" },
              { key: "idle", label: "Falas Aleatórias de Ociosidade 💬" },
            ] as const
          ).map(({ key, label }) => {
            const lines = character.voiceLines[key] || [];
            return (
              <div
                key={key}
                className="bg-theme-surface p-4 rounded-2xl border border-theme-border/50 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-theme-text">{label}</span>
                  <button
                    onClick={() => {
                      const text = prompt("Digite uma nova fala para o mascote:");
                      if (text && text.trim()) {
                        setCharacter({
                          ...character,
                          voiceLines: {
                            ...character.voiceLines,
                            [key]: [...lines, text.trim()],
                          },
                        });
                      }
                    }}
                    className="text-xs text-pink-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Adicionar Frase
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="bg-theme-surface-card px-3 py-1.5 rounded-xl border border-theme-border/50 text-xs text-theme-text flex items-center gap-2 group"
                    >
                      <span>"{line}"</span>
                      <button
                        onClick={() => {
                          setCharacter({
                            ...character,
                            voiceLines: {
                              ...character.voiceLines,
                              [key]: lines.filter((_, i) => i !== idx),
                            },
                          });
                        }}
                        className="text-rose-400 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Exportar & Importar Mod */}
      {activeTab === "export" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center text-xl">
                <Download size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-theme-text">
                Exportar Mod (.pet.json)
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Salva todas as animações, falas em português e itens criados em um pacote seguro e autocontido para backup ou compartilhar.
              </p>
            </div>
            <button
              onClick={handleExportPackage}
              className="w-full py-3 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Baixar Pacote do Mod
            </button>
          </div>

          <div className="bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl">
                <Upload size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-theme-text">
                Importar Mod Existente
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Carregue um arquivo .pet.json baixado da comunidade ou exportado anteriormente para editar ou testar no desktop.
              </p>
            </div>
            <button
              onClick={() => jsonImportRef.current?.click()}
              className="w-full py-3 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-bold text-xs border border-purple-500/40 shadow-soft transition-all flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              Selecionar Arquivo .pet.json
            </button>
            <input
              ref={jsonImportRef}
              type="file"
              accept=".json,.pet.json"
              onChange={handleImportPackage}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default PetMakerStudio;
