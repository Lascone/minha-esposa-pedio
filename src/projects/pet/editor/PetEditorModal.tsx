import React, { useState, useRef, useMemo } from "react";
import {
  X,
  Upload,
  Download,
  Plus,
  Trash2,
  Play,
  Pause,
  Sparkles,
  Layers,
  MessageSquare,
  Sliders,
  CheckCircle,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import {
  PetCharacterManifest,
  PetState,
  PetAnimationDef,
  PetVoiceLines,
} from "../types";
import { usePetStore } from "../store/petStore";
import { MIMI_CHARACTER } from "../presets";

interface PetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCharacter?: PetCharacterManifest;
}

const ALL_STATES: { state: PetState; label: string; icon: string }[] = [
  { state: "idle", label: "Parado (Idle)", icon: "✨" },
  { state: "walk", label: "Andando", icon: "🐾" },
  { state: "happy", label: "Feliz / Comemorando", icon: "🥰" },
  { state: "sad", label: "Triste / Carente", icon: "🥺" },
  { state: "hungry", label: "Com Fome", icon: "🍖" },
  { state: "eat", label: "Comendo", icon: "😋" },
  { state: "drink", label: "Bebendo Água", icon: "💧" },
  { state: "play", label: "Brincando", icon: "🎾" },
  { state: "sleep", label: "Dormindo", icon: "💤" },
  { state: "wake", label: "Acordando", icon: "☀️" },
  { state: "pet_head", label: "Cafuné na Cabeça", icon: "💖" },
  { state: "pet_body", label: "Carinho no Corpo", icon: "💕" },
  { state: "drag", label: "Sendo Arrastado", icon: "🫳" },
];

export const PetEditorModal: React.FC<PetEditorModalProps> = ({
  isOpen,
  onClose,
  initialCharacter,
}) => {
  const { saveCustomCharacter, selectCharacter } = usePetStore();

  const [activeTab, setActiveTab] = useState<"general" | "animations" | "voice" | "export">("general");
  const [character, setCharacter] = useState<PetCharacterManifest>(() => {
    if (initialCharacter) return JSON.parse(JSON.stringify(initialCharacter));
    return {
      version: "1.0.0",
      id: `custom-pet-${Date.now()}`,
      name: "Novo Personagem",
      author: "Esposa & Marido Dev 💕",
      description: "Um companheiro fofinho criado com carinho.",
      species: "Gatinho",
      previewImage: "",
      defaultScale: 1.15,
      moveSpeed: 60,
      hitbox: { width: 120, height: 120, offsetX: 0, offsetY: 0 },
      voiceLines: {
        greetings: ["Oie amor! Bom te ver! 💕", "Miau! Cheguei pra te fazer companhia!"],
        hungry: ["Estou com fomezinha... Me dá um lanche? 🥪", "Barriguinha roncando!"],
        thirsty: ["Que sede... Pode me dar uma aguinha fresca? 💧"],
        sleepy: ["Que soninho gostoso... 💤", "Vou cochilar um pouquinho."],
        happy: ["Estou tão feliz com você! 🥰", "Você é o melhor do mundo!"],
        afterCare: ["Amo seu carinho! 💕", "Purr... Que gostosinho!"],
        idle: ["Cuidando de você enquanto trabalha ✨", "Estou por aqui explorando a tela!"],
      },
      animations: JSON.parse(JSON.stringify(MIMI_CHARACTER.animations)),
    };
  });

  // Estado da aba de animações
  const [selectedState, setSelectedState] = useState<PetState>("idle");
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  const currentAnim = character.animations[selectedState] || {
    name: selectedState,
    frames: [],
    frameDuration: 150,
    loop: true,
  };

  // Loop de prévia da animação selecionada
  React.useEffect(() => {
    if (!previewPlaying || !currentAnim.frames.length) {
      setPreviewFrameIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPreviewFrameIndex((prev) => {
        if (prev + 1 >= currentAnim.frames.length) {
          return currentAnim.loop !== false ? 0 : prev;
        }
        return prev + 1;
      });
    }, currentAnim.frameDuration || 150);

    return () => clearInterval(interval);
  }, [previewPlaying, currentAnim]);

  if (!isOpen) return null;

  // Adicionar quadros de imagens (PNG, GIF, SVG, WebP)
  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        if (result) {
          setCharacter((prev) => {
            const nextAnims = { ...prev.animations };
            const anim = nextAnims[selectedState] || {
              name: selectedState,
              frames: [],
              frameDuration: 150,
              loop: true,
            };
            nextAnims[selectedState] = {
              ...anim,
              frames: [...anim.frames, result],
            };
            return {
              ...prev,
              previewImage: prev.previewImage || result,
              animations: nextAnims,
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFrame = (index: number) => {
    setCharacter((prev) => {
      const nextAnims = { ...prev.animations };
      const anim = nextAnims[selectedState];
      if (!anim) return prev;
      nextAnims[selectedState] = {
        ...anim,
        frames: anim.frames.filter((_, i) => i !== index),
      };
      return { ...prev, animations: nextAnims };
    });
  };

  const handleUpdateAnimProperty = (field: keyof PetAnimationDef, val: any) => {
    setCharacter((prev) => {
      const nextAnims = { ...prev.animations };
      const anim = nextAnims[selectedState] || {
        name: selectedState,
        frames: [],
        frameDuration: 150,
        loop: true,
      };
      nextAnims[selectedState] = { ...anim, [field]: val };
      return { ...prev, animations: nextAnims };
    });
  };

  // Exportar Pacote .pet.json
  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(character, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `${character.id || "personagem"}.pet.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar Pacote .pet.json
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      try {
        const parsed = JSON.parse(loadEvt.target?.result as string);
        if (!parsed.name || !parsed.animations) {
          setImportStatus("Arquivo inválido! Certifique-se de que é um pacote .pet.json");
          return;
        }
        setCharacter(parsed);
        setImportStatus(`Personagem "${parsed.name}" importado com sucesso! 🎉`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus("Erro ao ler JSON: Formato corrompido ou incompatível.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAndAdopt = () => {
    saveCustomCharacter(character);
    selectCharacter(character.id);
    onClose();
  };

  const currentPreviewFrame = currentAnim.frames[previewFrameIndex] || "";
  const isSvg =
    currentPreviewFrame.trim().startsWith("<svg") ||
    currentPreviewFrame.includes("</svg>");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-theme-surface border border-theme-border/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border/50 bg-theme-surface-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-soft">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                Editor de Personagem (VPet Mod Maker)
                <span className="text-[10px] bg-pink-500/20 text-pink-500 px-2 py-0.5 rounded-full font-bold">
                  v{character.version}
                </span>
              </h2>
              <p className="text-xs text-theme-text-muted">
                Crie, personalize spritesheets, falas e comportamentos do seu bichinho virtual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-theme-text-muted hover:text-theme-text hover:bg-theme-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas do Editor */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-theme-border/40 bg-theme-surface">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === "general"
                ? "border-pink-500 text-pink-500 bg-theme-surface-card"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Sliders size={14} />
            Dados & Identidade
          </button>
          <button
            onClick={() => setActiveTab("animations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === "animations"
                ? "border-pink-500 text-pink-500 bg-theme-surface-card"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Layers size={14} />
            Animações & Quadros
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === "voice"
                ? "border-pink-500 text-pink-500 bg-theme-surface-card"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <MessageSquare size={14} />
            Falas em Português
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === "export"
                ? "border-pink-500 text-pink-500 bg-theme-surface-card"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <FileCode size={14} />
            Importar / Exportar
          </button>
        </div>

        {/* Mensagem de Feedback de Importação */}
        {importStatus && (
          <div className="mx-6 mt-3 p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl text-xs font-bold text-pink-500 flex items-center gap-2">
            <CheckCircle size={16} />
            {importStatus}
          </div>
        )}

        {/* Conteúdo Principal Rolável */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ABA 1: GERAL & DADOS */}
          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-theme-text mb-1 block">
                    Nome do Personagem:
                  </label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) =>
                      setCharacter({ ...character, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-theme-surface-card border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-theme-text mb-1 block">
                    Espécie / Tipo:
                  </label>
                  <input
                    type="text"
                    value={character.species}
                    onChange={(e) =>
                      setCharacter({ ...character, species: e.target.value })
                    }
                    placeholder="Ex: Gatinho Chibi, Waifu, Raposinha, Ursinho"
                    className="w-full px-3 py-2 bg-theme-surface-card border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-theme-text mb-1 block">
                    Autor(es):
                  </label>
                  <input
                    type="text"
                    value={character.author}
                    onChange={(e) =>
                      setCharacter({ ...character, author: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-theme-surface-card border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-theme-text mb-1 block">
                    Descrição Carinhosa:
                  </label>
                  <textarea
                    rows={3}
                    value={character.description}
                    onChange={(e) =>
                      setCharacter({ ...character, description: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-theme-surface-card border border-theme-border/60 rounded-xl text-xs text-theme-text focus:outline-none focus:border-pink-500 resize-none"
                  />
                </div>
              </div>

              {/* Ajustes de Escala e Hitbox */}
              <div className="flex flex-col gap-4 bg-theme-surface-card p-4 rounded-2xl border border-theme-border/60">
                <span className="text-xs font-extrabold text-theme-text flex items-center gap-1.5">
                  <Sliders size={14} className="text-pink-500" /> Parâmetros de Exibição & Hitbox
                </span>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                    <span>Escala Padrão no Desktop:</span>
                    <span className="text-pink-500">{character.defaultScale}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={character.defaultScale}
                    onChange={(e) =>
                      setCharacter({
                        ...character,
                        defaultScale: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-pink-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                    <span>Velocidade de Caminhada (px/s):</span>
                    <span className="text-pink-500">{character.moveSpeed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="180"
                    step="5"
                    value={character.moveSpeed}
                    onChange={(e) =>
                      setCharacter({
                        ...character,
                        moveSpeed: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-theme-border/40">
                  <div>
                    <label className="text-[11px] font-bold text-theme-text-muted mb-1 block">
                      Largura da Hitbox (px):
                    </label>
                    <input
                      type="number"
                      value={character.hitbox.width}
                      onChange={(e) =>
                        setCharacter({
                          ...character,
                          hitbox: {
                            ...character.hitbox,
                            width: parseInt(e.target.value, 10) || 100,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-border/60 rounded-xl text-xs text-theme-text"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-theme-text-muted mb-1 block">
                      Altura da Hitbox (px):
                    </label>
                    <input
                      type="number"
                      value={character.hitbox.height}
                      onChange={(e) =>
                        setCharacter({
                          ...character,
                          hitbox: {
                            ...character.hitbox,
                            height: parseInt(e.target.value, 10) || 100,
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

          {/* ABA 2: ANIMAÇÕES & QUADROS */}
          {activeTab === "animations" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Coluna 1: Lista de Estados de Animação */}
              <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto pr-1">
                <span className="text-xs font-extrabold text-theme-text mb-1">
                  Estados de Comportamento
                </span>
                {ALL_STATES.map((item) => {
                  const hasFrames =
                    character.animations[item.state]?.frames?.length > 0;
                  const isSelected = selectedState === item.state;
                  return (
                    <button
                      key={item.state}
                      onClick={() => {
                        setSelectedState(item.state);
                        setPreviewFrameIndex(0);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                        isSelected
                          ? "bg-pink-500 text-white shadow-soft"
                          : "bg-theme-surface-card hover:bg-theme-surface border border-theme-border/40 text-theme-text"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          hasFrames
                            ? isSelected
                              ? "bg-white/20 text-white"
                              : "bg-emerald-500/10 text-emerald-400"
                            : isSelected
                            ? "bg-white/10 text-white"
                            : "bg-theme-border/40 text-theme-text-muted"
                        }`}
                      >
                        {character.animations[item.state]?.frames?.length || 0}{" "}
                        q.
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Coluna 2: Prévia e Ajustes da Animação Selecionada */}
              <div className="flex flex-col gap-4 bg-theme-surface-card p-4 rounded-2xl border border-theme-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-theme-text">
                    Prévia em Tempo Real
                  </span>
                  <button
                    onClick={() => setPreviewPlaying(!previewPlaying)}
                    className="p-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface-card text-theme-text border border-theme-border/50 text-xs flex items-center gap-1 font-bold"
                  >
                    {previewPlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{previewPlaying ? "Pausar" : "Tocar"}</span>
                  </button>
                </div>

                {/* Caixa de Prévia Visual */}
                <div className="w-full h-48 bg-theme-surface rounded-2xl border border-dashed border-theme-border/80 flex items-center justify-center overflow-hidden relative">
                  {currentPreviewFrame ? (
                    isSvg ? (
                      <div
                        className="w-32 h-32 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: currentPreviewFrame }}
                      />
                    ) : (
                      <img
                        src={currentPreviewFrame}
                        alt="Prévia"
                        className="w-32 h-32 object-contain"
                      />
                    )
                  ) : (
                    <div className="text-center text-xs text-theme-text-muted flex flex-col items-center gap-1">
                      <ImageIcon size={24} className="opacity-40" />
                      <span>Sem quadros neste estado</span>
                    </div>
                  )}

                  {currentAnim.frames.length > 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">
                      Q: {previewFrameIndex + 1}/{currentAnim.frames.length}
                    </div>
                  )}
                </div>

                {/* Configurações do Frame / Duração / Loop */}
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
                      <span>Duração do Quadro (ms):</span>
                      <span className="text-pink-500">
                        {currentAnim.frameDuration || 150} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="600"
                      step="10"
                      value={currentAnim.frameDuration || 150}
                      onChange={(e) =>
                        handleUpdateAnimProperty(
                          "frameDuration",
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-full accent-pink-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs font-bold text-theme-text flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentAnim.loop !== false}
                        onChange={(e) =>
                          handleUpdateAnimProperty("loop", e.target.checked)
                        }
                        className="accent-pink-500 rounded"
                      />
                      <span>Repetir continuamente (Loop)</span>
                    </label>

                    <label className="text-xs font-bold text-theme-text flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!currentAnim.flipHorizontal}
                        onChange={(e) =>
                          handleUpdateAnimProperty("flipHorizontal", e.target.checked)
                        }
                        className="accent-pink-500 rounded"
                      />
                      <span>Inverter Horizontal</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Gerenciamento de Quadros (Adicionar/Remover) */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-theme-text">
                    Quadros ({currentAnim.frames.length})
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-soft transition-all"
                  >
                    <Plus size={14} />
                    <span>Adicionar</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/gif,image/webp,image/svg+xml"
                    multiple
                    onChange={handleFrameUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 max-h-[380px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {currentAnim.frames.map((frame, idx) => (
                    <div
                      key={idx}
                      className={`relative bg-theme-surface-card border rounded-xl p-1.5 flex flex-col items-center justify-center group ${
                        previewFrameIndex === idx
                          ? "border-pink-500 bg-pink-500/5"
                          : "border-theme-border/50"
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
                        title="Remover quadro"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {currentAnim.frames.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-xs text-theme-text-muted border border-dashed border-theme-border/60 rounded-xl">
                      Nenhum quadro adicionado ainda. Clique em "Adicionar" para enviar PNGs ou SVGs.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: FALAS EM PORTUGUÊS */}
          {activeTab === "voice" && (
            <div className="flex flex-col gap-6">
              <p className="text-xs text-theme-text-muted">
                Personalize as falas fofas que o seu bichinho dirá na tela em cada momento do dia.
              </p>

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
                    className="bg-theme-surface-card p-4 rounded-2xl border border-theme-border/50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-theme-text">
                        {label}
                      </span>
                      <button
                        onClick={() => {
                          const text = prompt("Digite uma nova fala para o bichinho:");
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
                          className="bg-theme-surface px-3 py-1.5 rounded-xl border border-theme-border/50 text-xs text-theme-text flex items-center gap-2 group"
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

          {/* ABA 4: IMPORTAR / EXPORTAR */}
          {activeTab === "export" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Exportar */}
              <div className="bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                    <Download size={24} />
                  </div>
                  <h3 className="text-sm font-extrabold text-theme-text">
                    Exportar Pacote (.pet.json)
                  </h3>
                  <p className="text-xs text-theme-text-muted leading-relaxed">
                    Gera um arquivo compacto e autocontido contendo todos os dados, quadros em base64/SVG e falas. Você pode compartilhar este mod com amigos ou fazer backup.
                  </p>
                </div>
                <button
                  onClick={handleExportJson}
                  className="w-full py-3 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Baixar Arquivo {character.name}.pet.json
                </button>
              </div>

              {/* Importar */}
              <div className="bg-theme-surface-card p-6 rounded-3xl border border-theme-border/60 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <h3 className="text-sm font-extrabold text-theme-text">
                    Importar Pacote Existente
                  </h3>
                  <p className="text-xs text-theme-text-muted leading-relaxed">
                    Carregue um arquivo .pet.json baixado ou exportado anteriormente para continuar editando ou adicioná-lo à sua coleção de pets.
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
                  onChange={handleImportJson}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-theme-border/50 bg-theme-surface-card">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-theme-border/60 text-xs font-bold text-theme-text-muted hover:text-theme-text hover:bg-theme-surface transition-all"
          >
            Cancelar
          </button>

          <button
            onClick={handleSaveAndAdopt}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs shadow-soft transition-all transform active:scale-95"
          >
            <CheckCircle size={16} />
            <span>Salvar e Adotar Personagem 💕</span>
          </button>
        </div>
      </div>
    </div>
  );
};
