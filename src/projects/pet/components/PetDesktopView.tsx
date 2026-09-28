import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  Heart,
  Sparkles,
  X,
  Settings,
  Utensils,
  Coffee,
  Moon,
  Sun,
  Package,
  Move,
} from "lucide-react";
import { usePetStore } from "../store/petStore";
import { PetState, PetItem } from "../types";

const DRAG_THRESHOLD_PX = 4;

export const PetDesktopView: React.FC = () => {
  const {
    getActiveCharacter,
    currentState,
    facing,
    stats,
    config,
    caressPet,
    feedPet,
    giveDrink,
    playWithPet,
    putToSleep,
    wakeUpPet,
    closePetOnDesktop,
    inventory,
    setPetState,
  } = usePetStore();

  const character = getActiveCharacter();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isChestOpen, setIsChestOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<PetItem | null>(null);
  const [isHoveringDrop, setIsHoveringDrop] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Animação 2D Real dos Sprites do Baú (Golden / Wooden)
  const [chestTheme, setChestTheme] = useState<"golden" | "wooden">("golden");
  const [chestAnimFrame, setChestAnimFrame] = useState(0);

  // Efeito de transição de frames do baú (0 a 4) ao abrir ou fechar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isChestOpen) {
      interval = setInterval(() => {
        setChestAnimFrame((prev) => {
          if (prev >= 4) {
            clearInterval(interval);
            return 4;
          }
          return prev + 1;
        });
      }, 75);
    } else {
      interval = setInterval(() => {
        setChestAnimFrame((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 65);
    }
    return () => clearInterval(interval);
  }, [isChestOpen]);

  // Posição arrastável do Baú dentro da janela
  const [chestPos, setChestPos] = useState<{ x: number; y: number }>({ x: 310, y: 320 });
  const isDraggingChestRef = useRef(false);
  const chestStartPosRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Controle de Arraste Nativo do Pet (Janela)
  const isMouseDownPetRef = useRef(false);
  const isDraggingPetRef = useRef(false);
  const petPressStartRef = useRef<{ x: number; y: number } | null>(null);

  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animação ativa do estado atual
  const activeAnimation = useMemo(() => {
    return character.animations[currentState] || character.animations.idle;
  }, [character, currentState]);

  // Loop de frames da animação
  useEffect(() => {
    if (!activeAnimation || !activeAnimation.frames || activeAnimation.frames.length <= 1) {
      setCurrentFrameIndex(0);
      return;
    }

    const duration = activeAnimation.frameDuration || 180;
    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev + 1 >= activeAnimation.frames.length) {
          return activeAnimation.loop !== false ? 0 : prev;
        }
        return prev + 1;
      });
    }, duration);

    return () => clearInterval(interval);
  }, [activeAnimation]);

  // Exibição e rotação de falas em pt-BR (garantindo que nunca fique cortado)
  const triggerSpeech = (customText?: string) => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);

    let text = customText;
    if (!text) {
      const v = character.voiceLines;
      if (stats.hunger < 35 && v.hungry?.length) {
        text = v.hungry[Math.floor(Math.random() * v.hungry.length)];
      } else if (stats.thirst < 35 && v.thirsty?.length) {
        text = v.thirsty[Math.floor(Math.random() * v.thirsty.length)];
      } else if (stats.energy < 25 && v.sleepy?.length) {
        text = v.sleepy[Math.floor(Math.random() * v.sleepy.length)];
      } else if (stats.happiness > 80 && v.happy?.length) {
        text = v.happy[Math.floor(Math.random() * v.happy.length)];
      } else if (v.idle?.length) {
        text = v.idle[Math.floor(Math.random() * v.idle.length)];
      }
    }

    if (text) {
      setSpeechBubble(text);
      speechTimeoutRef.current = setTimeout(() => {
        setSpeechBubble(null);
      }, 4800);
    }
  };

  // Fala inicial ao abrir
  useEffect(() => {
    const greetings = character.voiceLines.greetings;
    if (greetings && greetings.length > 0) {
      triggerSpeech(greetings[Math.floor(Math.random() * greetings.length)]);
    }

    const speechInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        triggerSpeech();
      }
    }, 28000);

    return () => {
      clearInterval(speechInterval);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, [character]);

  // Listener nativo do Tauri para soltura e detecção dos cantos da tela ("jogar pros cantos")
  useEffect(() => {
    let win: ReturnType<typeof getCurrentWebviewWindow>;
    try {
      win = getCurrentWebviewWindow();
    } catch {
      return;
    }

    let moveDebounceTimer: number | undefined;
    let unlisten: (() => void) | undefined;

    win
      .onMoved(({ payload }) => {
        if (!isDraggingPetRef.current) return;
        window.clearTimeout(moveDebounceTimer);

        // Enquanto move a janela, o pet fica no estado "drag"
        moveDebounceTimer = window.setTimeout(async () => {
          if (!isDraggingPetRef.current) return;
          isDraggingPetRef.current = false;

          // Soltou o pet! Aplica física de queda (fall) como no VPet original
          setPetState("fall");

          // Dimensões da tela do monitor para detecção dos cantos
          const screenW = window.screen.availWidth || 1920;
          const windowW = 440;

          // Detecta se foi jogada no canto esquerdo ou direito da tela
          if (payload.x <= 50) {
            // Canto esquerdo: vira para a direita e fala
            setPetState("idle", "right");
            triggerSpeech("Cheguei no cantinho esquerdo da sua tela! 🐾");
          } else if (payload.x >= screenW - windowW - 50) {
            // Canto direito: vira para a esquerda e fala
            setPetState("idle", "left");
            triggerSpeech("Vigiando sua tela aqui do cantinho direito! 💕");
          } else {
            // Aterrissagem suave no chão/área após queda
            setTimeout(() => {
              setPetState("idle");
            }, 500);
          }
        }, 220);
      })
      .then((u) => {
        unlisten = u;
      })
      .catch(() => {});

    return () => {
      window.clearTimeout(moveDebounceTimer);
      unlisten?.();
    };
  }, [setPetState]);

  // Arraste Nativo do Pet (Janela do VPet)
  const handlePetMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      setShowContextMenu(true);
      return;
    }
    if (e.button !== 0) return;

    setShowContextMenu(false);
    petPressStartRef.current = { x: e.screenX, y: e.screenY };
    isMouseDownPetRef.current = true;
  };

  const handlePetMouseMove = async (e: React.MouseEvent) => {
    if (!isMouseDownPetRef.current || !petPressStartRef.current) return;

    const deltaX = Math.abs(e.screenX - petPressStartRef.current.x);
    const deltaY = Math.abs(e.screenY - petPressStartRef.current.y);

    if (deltaX + deltaY >= DRAG_THRESHOLD_PX) {
      isMouseDownPetRef.current = false;
      isDraggingPetRef.current = true;

      // Ativa estado "drag" (sprites oficiais da VUP levantada pelas axilas)
      setPetState("drag");

      try {
        const win = getCurrentWebviewWindow();
        await win.startDragging();
      } catch (err) {
        console.warn("[Pet] Erro no startDragging:", err);
      }
    }
  };

  const handlePetMouseUp = (e: React.MouseEvent) => {
    if (isMouseDownPetRef.current && petPressStartRef.current) {
      isMouseDownPetRef.current = false;
      petPressStartRef.current = null;
      // Foi apenas um clique simples: fazer cafuné!
      handlePetClick(e);
    }
  };

  // Clique de carinho com coraçõezinhos e som kawaii
  const handlePetClick = (e: React.MouseEvent) => {
    caressPet("head");

    const rect = e.currentTarget.getBoundingClientRect();
    const heartId = Date.now() + Math.random();
    setHearts((prev) => [
      ...prev,
      { id: heartId, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1200);

    if (character.voiceLines.afterCare?.length && Math.random() > 0.3) {
      const careLines = character.voiceLines.afterCare;
      triggerSpeech(careLines[Math.floor(Math.random() * careLines.length)]);
    }
  };

  // Alimentar ou dar item (por clique ou por arrastar e soltar do baú)
  const handleUseItemOnPet = (item: PetItem) => {
    if (item.category === "drink") {
      giveDrink(item);
      triggerSpeech(`Glup glup! Que aguinha fresca amor! 💧`);
    } else if (item.category === "toy") {
      playWithPet(item);
      triggerSpeech(`Eba! Adoro brincar de ${item.name}! 🎾`);
    } else {
      feedPet(item);
      triggerSpeech(`Nham nham! ${item.name} estava delicioso! 💕`);
    }

    // Partículas de satisfação
    const heartId = Date.now();
    setHearts((prev) => [
      ...prev,
      { id: heartId, x: 100, y: 70 },
      { id: heartId + 1, x: 130, y: 50 },
    ]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId && h.id !== heartId + 1));
    }, 1400);
  };

  // Drop do item arrastado do baú sobre a mascotinha
  const handlePetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveringDrop(false);
    if (draggedItem) {
      handleUseItemOnPet(draggedItem);
      setDraggedItem(null);
    }
  };

  // Arraste do Baú dentro da janela
  const handleChestMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    isDraggingChestRef.current = false;
    chestStartPosRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: chestPos.x,
      startY: chestPos.y,
    };

    const handleWindowMouseMove = (moveEvt: MouseEvent) => {
      if (!chestStartPosRef.current) return;
      const dx = moveEvt.clientX - chestStartPosRef.current.mouseX;
      const dy = moveEvt.clientY - chestStartPosRef.current.mouseY;

      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
        isDraggingChestRef.current = true;
        setChestPos({
          x: Math.max(10, Math.min(370, chestStartPosRef.current.startX + dx)),
          y: Math.max(80, Math.min(410, chestStartPosRef.current.startY + dy)),
        });
      }
    };

    const handleWindowMouseUp = () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);

      // Se não arrastou, é um clique para alternar aberto/fechado
      if (!isDraggingChestRef.current) {
        setIsChestOpen((prev) => !prev);
      }
      isDraggingChestRef.current = false;
      chestStartPosRef.current = null;
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  };

  const openMainWindow = async () => {
    try {
      await invoke("show_main_window");
    } catch {
      window.location.hash = "/pet";
    }
    setShowContextMenu(false);
  };

  const currentFrame = activeAnimation?.frames?.[currentFrameIndex] || "";
  const scale = config.scale || character.defaultScale || 1.15;

  return (
    <div
      className="relative w-[440px] h-[480px] flex flex-col items-center justify-between select-none overflow-visible p-3"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowContextMenu(true);
      }}
    >
      {/* 1. ÁREA SUPERIOR: BALÃO DE FALA (Nunca é cortado, com folga garantida do teto) */}
      <div className="w-full min-h-[80px] flex items-end justify-center pointer-events-none z-40 px-2 pt-2">
        {speechBubble && (
          <div
            onMouseDown={(e) => {
              if (e.button === 0) {
                try {
                  getCurrentWebviewWindow().startDragging();
                } catch {}
              }
            }}
            className="max-w-[320px] px-4 py-2.5 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-100 text-xs font-semibold rounded-2xl shadow-2xl border border-pink-400/50 backdrop-blur-md animate-fadeIn text-center relative pointer-events-auto cursor-grab active:cursor-grabbing leading-snug"
          >
            {speechBubble}
            {/* Pontinha apontando diretamente para a cabeça do mascote */}
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3.5 h-3.5 bg-white dark:bg-zinc-900 rotate-45 border-r border-b border-pink-400/50" />
          </div>
        )}
      </div>

      {/* 2. ÁREA CENTRAL: MASCOTE INTERATIVO (Com suporte a Arraste Nativo, Física de Soltura e Drop de Itens) */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        {/* Partículas de Corações Flutuantes */}
        {hearts.map((h) => (
          <div
            key={h.id}
            className="absolute pointer-events-none text-pink-500 animate-float-heart z-50"
            style={{ left: h.x, top: h.y }}
          >
            <Heart size={24} className="fill-pink-500 drop-shadow-lg" />
          </div>
        ))}

        <div
          onMouseDown={handlePetMouseDown}
          onMouseMove={handlePetMouseMove}
          onMouseUp={handlePetMouseUp}
          onDragOver={(e) => {
            e.preventDefault();
            setIsHoveringDrop(true);
          }}
          onDragLeave={() => setIsHoveringDrop(false)}
          onDrop={handlePetDrop}
          className={`cursor-grab active:cursor-grabbing transform transition-all group relative pointer-events-auto flex items-center justify-center ${
            isHoveringDrop ? "scale-110 drop-shadow-[0_0_15px_rgba(244,114,182,0.8)]" : ""
          }`}
          style={{
            transform: `scale(${scale}) ${
              facing === "left" || activeAnimation?.flipHorizontal ? "scaleX(-1)" : "scaleX(1)"
            }`,
          }}
          title="Clique para fazer cafuné, arraste para mudar de lugar na tela ou solte comidinhas do baú para alimentá-la!"
        >
          {currentFrame.trim().startsWith("<svg") && !currentFrame.startsWith("data:") ? (
            <div
              className="w-44 h-44 flex items-center justify-center pointer-events-auto drop-shadow-xl"
              dangerouslySetInnerHTML={{ __html: currentFrame }}
            />
          ) : (
            <img
              src={currentFrame || "/vpet/vup/idle/idle_0.png"}
              alt={character.name}
              className="w-44 h-44 object-contain pointer-events-auto drop-shadow-xl select-none"
              draggable={false}
            />
          )}

          {/* Destaque visual fofo ao arrastar comida para cima dela */}
          {isHoveringDrop && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full shadow-lg animate-bounce pointer-events-none whitespace-nowrap">
              😋 Solte aqui para me dar!
            </div>
          )}
        </div>
      </div>

      {/* 3. BAÚ FOFO 2D COM ANIMAÇÕES DE ABRIR/FECHAR E ARRASTÁVEL */}
      <div
        className="absolute z-40 select-none pointer-events-auto"
        style={{ left: `${chestPos.x}px`, top: `${chestPos.y}px` }}
      >
        {/* Botão / Visual do Baú 2D com Animação Pixel Art Real */}
        <div
          onMouseDown={handleChestMouseDown}
          className="group relative cursor-grab active:cursor-grabbing p-1 transition-transform hover:scale-110 active:scale-95 flex flex-col items-center"
          title="Clique para abrir/fechar o Baú ou segure para arrastá-lo pela tela!"
        >
          {/* Animação Real de Frames (frame_0 a frame_4) */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <img
              src={`/vpet/chest/${chestTheme}/frame_${chestAnimFrame}.png`}
              alt="Baú 2D"
              className="w-16 h-16 object-contain drop-shadow-2xl select-none pointer-events-none"
              draggable={false}
            />

            {/* Brilhos mágicos quando totalmente aberto */}
            {isChestOpen && chestAnimFrame >= 3 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <Sparkles size={16} className="text-yellow-300 animate-ping absolute -top-1" />
                <Sparkles size={12} className="text-pink-400 animate-pulse absolute -right-1" />
              </div>
            )}
          </div>

          {/* Dica flutuante de arrastar */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/85 text-[9px] text-amber-300 font-bold px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none flex items-center gap-1 mt-0.5">
            <Move size={8} />
            <span>{isChestOpen ? "Baú Aberto" : "Clique ou Arraste"}</span>
          </div>
        </div>

        {/* GAVETA DE ITENS (Popup Fofo ao Abrir o Baú) */}
        {isChestOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute -top-64 -left-36 z-50 w-72 bg-white/95 dark:bg-zinc-900/95 border-2 border-amber-500/50 rounded-3xl p-3 shadow-2xl backdrop-blur-md animate-fadeIn flex flex-col gap-2"
          >
            {/* Cabeçalho da Gaveta */}
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Baú de Mimos da Esposa</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setChestTheme((prev) => (prev === "golden" ? "wooden" : "golden"))}
                  className="text-[9px] px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 font-bold transition-colors"
                  title="Alternar estilo do baú"
                >
                  {chestTheme === "golden" ? "👑 Ouro" : "🪵 Madeira"}
                </button>
                <button
                  onClick={() => setIsChestOpen(false)}
                  className="w-5 h-5 rounded-full hover:bg-rose-500/20 text-zinc-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Arraste até a mascotinha ou clique para alimentar:
            </p>

            {/* Grade de Itens para Alimentar / Brincar */}
            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
              {inventory.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", item.id);
                    setDraggedItem(item);
                  }}
                  onClick={() => handleUseItemOnPet(item)}
                  className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 hover:bg-amber-500/20 border border-amber-500/30 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all group relative"
                  title={`${item.name} (${item.desc}) - Arraste até ela ou clique para dar!`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-700 dark:text-zinc-200 truncate max-w-[50px] text-center">
                    {item.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
              <span>🍗 Fome: {stats.hunger}%</span>
              <span>💧 Sede: {stats.thirst}%</span>
              <span>💖 Nível: {stats.bondLevel}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. MENU DE CONTEXTO AO CLICAR COM BOTÃO DIREITO */}
      {showContextMenu && (
        <div
          className="absolute right-4 top-16 z-50 bg-white/95 dark:bg-zinc-900/95 border border-pink-500/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 w-48 text-xs font-semibold animate-fadeIn text-zinc-700 dark:text-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[11px] font-bold text-pink-500 border-b border-pink-500/20 flex items-center justify-between">
            <span>🐾 {character.name}</span>
            <button
              onClick={() => setShowContextMenu(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={13} />
            </button>
          </div>

          <button
            onClick={() => {
              setIsChestOpen(true);
              setShowContextMenu(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left"
          >
            <Package size={14} className="text-amber-500" />
            Abrir Baú de Mimos 📦
          </button>

          <button
            onClick={() => {
              const food = inventory.find((i) => i.category === "food");
              if (food) handleUseItemOnPet(food);
              setShowContextMenu(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-pink-500/10 hover:text-pink-500 transition-colors text-left"
          >
            <Utensils size={14} className="text-pink-500" />
            Alimentar Lanchinho 🍖
          </button>

          <button
            onClick={() => {
              const drink = inventory.find((i) => i.category === "drink");
              if (drink) handleUseItemOnPet(drink);
              setShowContextMenu(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-sky-500/10 hover:text-sky-500 transition-colors text-left"
          >
            <Coffee size={14} className="text-sky-500" />
            Dar Água Fresca 💧
          </button>

          {currentState === "sleep" ? (
            <button
              onClick={() => {
                wakeUpPet();
                setShowContextMenu(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left"
            >
              <Sun size={14} className="text-amber-500" />
              Acordar ☀️
            </button>
          ) : (
            <button
              onClick={() => {
                putToSleep();
                setShowContextMenu(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors text-left"
            >
              <Moon size={14} className="text-indigo-500" />
              Colocar para Dormir 💤
            </button>
          )}

          <div className="border-t border-pink-500/20 my-1" />

          <button
            onClick={openMainWindow}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-purple-500/10 hover:text-purple-500 transition-colors text-left"
          >
            <Settings size={14} className="text-purple-500" />
            Painel do Jogo & Mods 🪟
          </button>

          <button
            onClick={closePetOnDesktop}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors text-left"
          >
            <X size={14} />
            Recolher do Desktop
          </button>
        </div>
      )}
    </div>
  );
};

export default PetDesktopView;
