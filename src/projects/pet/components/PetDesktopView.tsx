import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Heart,
  Sparkles,
  X,
  Settings,
  Utensils,
  Coffee,
  Gamepad2,
  Moon,
  Sun,
  Package,
} from "lucide-react";
import { usePetStore } from "../store/petStore";
import { PetState, PetItem } from "../types";

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
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
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

  // Exibição e rotação de falas em pt-BR
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
      }, 4500);
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

  // Clique de carinho com coraçõezinhos
  const handlePetClick = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      setShowContextMenu((prev) => !prev);
      return;
    }

    setShowContextMenu(false);
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
    setHearts((prev) => [...prev, { id: heartId, x: 80, y: 40 }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1200);
  };

  // Drop do item arrastado do baú sobre o pet
  const handlePetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) {
      handleUseItemOnPet(draggedItem);
      setDraggedItem(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
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
      className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-visible p-2"
      onContextMenu={handleContextMenu}
    >
      {/* Balão de Fala Flutuante */}
      {speechBubble && (
        <div
          data-tauri-drag-region
          className="absolute -top-10 z-40 max-w-[220px] px-3.5 py-2 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-100 text-[11px] font-semibold rounded-2xl shadow-xl border border-pink-400/40 backdrop-blur-md animate-fadeIn text-center pointer-events-auto cursor-grab active:cursor-grabbing leading-snug"
        >
          {speechBubble}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white dark:bg-zinc-900 rotate-45 border-r border-b border-pink-400/40" />
        </div>
      )}

      {/* Partículas de Coração Flutuante ao receber carinho */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-none text-pink-500 animate-float-heart z-50"
          style={{ left: h.x, top: h.y }}
        >
          <Heart size={22} className="fill-pink-500 drop-shadow-md" />
        </div>
      ))}

      {/* Mascote Interativo (com suporte a drag nativo e drop de comida) */}
      <div
        data-tauri-drag-region
        onClick={handlePetClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handlePetDrop}
        className="cursor-grab active:cursor-grabbing transform transition-transform group relative pointer-events-auto flex items-center justify-center"
        style={{
          transform: `scale(${scale}) ${
            facing === "left" || activeAnimation?.flipHorizontal ? "scaleX(-1)" : "scaleX(1)"
          }`,
        }}
        title="Clique para fazer cafuné ou arraste a comida do baú para alimentá-la!"
      >
        {currentFrame.trim().startsWith("<svg") && !currentFrame.startsWith("data:") ? (
          <div
            className="w-40 h-40 flex items-center justify-center pointer-events-auto drop-shadow-lg"
            dangerouslySetInnerHTML={{ __html: currentFrame }}
          />
        ) : (
          <img
            src={currentFrame || "/vpet/vup/idle/idle_0.png"}
            alt={character.name}
            className="w-40 h-40 object-contain pointer-events-auto drop-shadow-lg select-none"
            draggable={false}
          />
        )}
      </div>

      {/* Baú do Minecraft Flutuante ao lado do Mascote */}
      <div className="absolute bottom-2 right-4 z-40 flex flex-col items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsChestOpen((prev) => !prev);
          }}
          className="group relative p-1 rounded-xl bg-amber-950/40 hover:bg-amber-950/70 border border-amber-600/40 backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95 shadow-lg"
          title="Clique para abrir o Baú do Minecraft com comidinhas!"
        >
          {/* SVG 3D Pixel Art do Baú do Minecraft */}
          <svg
            viewBox="0 0 32 32"
            width="32"
            height="32"
            className="drop-shadow-md"
          >
            {/* Corpo de Madeira */}
            <rect x="2" y="5" width="28" height="23" fill="#8c5828" />
            <rect x="3" y="6" width="26" height="21" fill="#b3783c" />
            {/* Feixes de Ferro/Escuro */}
            <rect x="2" y="5" width="28" height="3" fill="#2d1c0c" />
            <rect x="2" y="14" width="28" height="3" fill="#2d1c0c" />
            <rect x="2" y="25" width="28" height="3" fill="#2d1c0c" />
            <rect x="2" y="5" width="3" height="23" fill="#2d1c0c" />
            <rect x="27" y="5" width="3" height="23" fill="#2d1c0c" />
            {/* Fecho de Ouro */}
            <rect x="14" y="11" width="4" height="6" fill="#e5b83b" />
            <rect x="15" y="13" width="2" height="2" fill="#58400a" />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-[9px] text-amber-300 font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap pointer-events-none">
            Baú 📦
          </span>
        </button>
      </div>

      {/* POPUP: MINECRAFT CHEST GUI (Inventário no Desktop) */}
      {isChestOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-fadeIn"
          style={{
            width: "310px",
            backgroundColor: "#c6c6c6",
            borderTop: "3px solid #ffffff",
            borderLeft: "3px solid #ffffff",
            borderRight: "3px solid #555555",
            borderBottom: "3px solid #555555",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            fontFamily: "monospace",
          }}
        >
          {/* Header do Baú estilo Minecraft */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border-b-2 border-[#555555]"
            style={{ backgroundColor: "#8b8b8b" }}
          >
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
              <span>📦</span>
              <span>Baú da Esposa</span>
            </span>
            <button
              onClick={() => setIsChestOpen(false)}
              className="text-white hover:text-rose-400 font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="p-3">
            <p className="text-[10px] text-[#373737] font-bold mb-2">
              Clique ou arraste a comidinha até a mascotinha:
            </p>

            {/* Grade de Slots de Inventário do Minecraft */}
            <div className="grid grid-cols-4 gap-2">
              {inventory.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedItem(item)}
                  onClick={() => handleUseItemOnPet(item)}
                  className="w-14 h-14 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 group relative"
                  style={{
                    backgroundColor: "#8b8b8b",
                    borderTop: "2px solid #373737",
                    borderLeft: "2px solid #373737",
                    borderRight: "2px solid #ffffff",
                    borderBottom: "2px solid #ffffff",
                  }}
                  title={`${item.name} (${item.desc}) - Clique para dar!`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="text-[8px] text-white font-bold leading-none truncate max-w-[50px] text-center mt-0.5">
                    {item.name.split(" ")[0]}
                  </span>

                  {/* Tooltip rápida flutuante */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex z-50 bg-[#100010] text-[#a800a8] border-2 border-[#5000ff] px-2 py-0.5 rounded text-[9px] whitespace-nowrap shadow-lg">
                    <span className="text-white font-bold">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#8b8b8b] flex items-center justify-between text-[9px] text-[#373737] font-bold">
              <span>🍖 Fome: {stats.hunger}%</span>
              <span>💧 Sede: {stats.thirst}%</span>
              <span>💖 Nível: {stats.bondLevel}</span>
            </div>
          </div>
        </div>
      )}

      {/* Menu Contextual ao Clicar com Botão Direito */}
      {showContextMenu && (
        <div
          className="absolute right-2 top-2 z-50 bg-white/95 dark:bg-zinc-900/95 border border-pink-500/40 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex flex-col gap-1 w-44 text-xs font-semibold animate-fadeIn text-zinc-700 dark:text-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-bold text-pink-500 border-b border-pink-500/20 flex items-center justify-between">
            <span>🐾 {character.name}</span>
            <button
              onClick={() => setShowContextMenu(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={12} />
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
            Abrir Baú de Itens 📦
          </button>

          <button
            onClick={() => {
              const food = inventory.find((i) => i.category === "food");
              if (food) feedPet(food);
              setShowContextMenu(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-pink-500/10 hover:text-pink-500 transition-colors text-left"
          >
            <Utensils size={14} className="text-pink-500" />
            Alimentar Lanche 🍖
          </button>

          <button
            onClick={() => {
              const drink = inventory.find((i) => i.category === "drink");
              if (drink) giveDrink(drink);
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
            Painel do Jogo 🪟
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
