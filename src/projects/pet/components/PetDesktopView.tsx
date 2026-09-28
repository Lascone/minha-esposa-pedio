import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Heart, Sparkles, X, Settings, Utensils, Coffee, Gamepad2, Moon, Sun } from "lucide-react";
import { usePetStore } from "../store/petStore";
import { PetState } from "../types";

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

    const duration = activeAnimation.frameDuration || 150;
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

    // Intervalo de falas ocasionais durante o dia
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
    // Se for clique direito, abre menu
    if (e.button === 2) {
      e.preventDefault();
      setShowContextMenu((prev) => !prev);
      return;
    }

    setShowContextMenu(false);
    caressPet("head");

    // Adiciona partícula de coração
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
  const isSvg = currentFrame.trim().startsWith("<svg") || currentFrame.includes("</svg>");
  const scale = config.scale || character.defaultScale || 1.15;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-visible"
      onContextMenu={handleContextMenu}
    >
      {/* Balão de Fala Flutuante */}
      {speechBubble && (
        <div
          data-tauri-drag-region
          className="absolute -top-12 z-40 max-w-[210px] px-3.5 py-2 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-100 text-[11px] font-semibold rounded-2xl shadow-xl border border-pink-400/40 backdrop-blur-md animate-fadeIn text-center pointer-events-auto cursor-grab active:cursor-grabbing leading-snug"
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
          <Heart size={20} className="fill-pink-500" />
        </div>
      ))}

      {/* Sprite Interativo com Área de Arrastar Nativa */}
      <div
        data-tauri-drag-region
        onClick={handlePetClick}
        className="cursor-grab active:cursor-grabbing transform transition-transform group relative"
        style={{
          transform: `scale(${scale}) ${
            facing === "left" || activeAnimation?.flipHorizontal ? "scaleX(-1)" : "scaleX(1)"
          }`,
        }}
      >
        {isSvg ? (
          <div
            className="w-32 h-32 flex items-center justify-center pointer-events-auto drop-shadow-md"
            dangerouslySetInnerHTML={{ __html: currentFrame }}
          />
        ) : (
          <img
            src={currentFrame}
            alt={character.name}
            className="w-32 h-32 object-contain pointer-events-auto drop-shadow-md"
            draggable={false}
          />
        )}
      </div>

      {/* Menu Contextual ao Clicar com Botão Direito */}
      {showContextMenu && (
        <div
          className="absolute right-0 top-0 z-50 bg-white/95 dark:bg-zinc-900/95 border border-pink-500/40 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex flex-col gap-1 w-44 text-xs font-semibold animate-fadeIn text-zinc-700 dark:text-zinc-200"
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

          <button
            onClick={() => {
              const toy = inventory.find((i) => i.category === "toy");
              if (toy) playWithPet(toy);
              setShowContextMenu(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left"
          >
            <Gamepad2 size={14} className="text-amber-500" />
            Brincar Junto 🎾
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
            Painel Completo 🪟
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
