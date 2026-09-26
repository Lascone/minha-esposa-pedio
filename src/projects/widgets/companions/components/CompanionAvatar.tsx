import React, { useState, useEffect, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import {
  CompanionActionState,
  CompanionInstance,
  CompanionManifest,
} from "../types";
import { useCompanionsStore } from "../store/companionsStore";
import { getCompanionManifest } from "../registry";
import { CompanionContextMenu } from "./CompanionContextMenu";
import { frameCount, spriteStyle } from "../sprite";

interface CompanionAvatarProps {
  instance: CompanionInstance;
  interactive?: boolean;
  onSelect?: () => void;
}

// Gentle cute Web Audio chime / purr synthesizer
const playCuteSound = (type: "click" | "purr" = "click") => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "click") {
      // Kawaii ascending bell chime
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.28);
      });
    }
  } catch {}
};

export const CompanionAvatar: React.FC<CompanionAvatarProps> = ({
  instance,
  interactive = true,
  onSelect,
}) => {
  const { customCompanions, settings, updateCompanionState, setCompanionAction } =
    useCompanionsStore();

  const manifest: CompanionManifest | undefined = getCompanionManifest(
    instance.companionId,
    customCompanions
  );

  const [frameIndex, setFrameIndex] = useState(0);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const isDraggingRef = useRef(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentState = instance.currentState || "idle";
  const animDef =
    manifest?.animations[currentState] || manifest?.animations.idle;

  const isSpritesheet = Boolean(animDef?.spritesheet);
  const frames = animDef?.frames && animDef.frames.length > 0
    ? animDef.frames
    : [manifest?.preview || ""];
  const totalFrames = isSpritesheet ? frameCount(animDef, 1) : frames.length;
  const frameDuration = animDef?.frameDuration || 300;

  // 1. Frame Animation Loop
  useEffect(() => {
    if (instance.isPaused || totalFrames <= 1) {
      setFrameIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % totalFrames);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [instance.isPaused, totalFrames, frameDuration, currentState]);

  // 2. Autonomous Roaming State Machine (only if interactive)
  useEffect(() => {
    if (!interactive || instance.isPaused) return;

    // Timer to pick next random autonomous activity
    const roamInterval = setInterval(() => {
      if (instance.currentState === "drag" || instance.currentState === "click") {
        return;
      }

      const roll = Math.random();
      let nextState: CompanionActionState = "idle";
      let nextFacing = instance.facing;

      if (roll < 0.45) {
        // Idle breathing / looking
        nextState = "idle";
      } else if (roll < 0.75) {
        // Walk around
        nextState = "walk";
        // 50% chance to flip direction
        if (Math.random() > 0.5) {
          nextFacing = nextFacing === "left" ? "right" : "left";
        }
      } else if (roll < 0.90) {
        // Sit down
        nextState = "sit";
      } else {
        // Take a nap
        nextState = "sleep";
      }

      updateCompanionState(instance.instanceId, {
        currentState: nextState,
        facing: nextFacing,
      });
    }, 4500 + Math.random() * 4000);

    return () => clearInterval(roamInterval);
  }, [interactive, instance.isPaused, instance.currentState, instance.facing]);

  // 3. Movement execution during 'walk' state
  useEffect(() => {
    if (!interactive || instance.isPaused || instance.currentState !== "walk") {
      return;
    }

    const speed = (manifest?.speed || 30) * (instance.scale || 1.0);
    const intervalMs = settings.fpsCap === 60 ? 16 : 33;
    const step = (speed * (intervalMs / 1000));

    const moveTimer = setInterval(async () => {
      let currentX = instance.x;
      let currentY = instance.y;
      let facing = instance.facing;

      const screenWidth = window.screen.width || 1920;
      const margin = settings.boundaryMargin || 30;

      // Update position
      if (facing === "right") {
        currentX += step;
        if (currentX > screenWidth - margin - 120) {
          facing = "left";
          currentX = screenWidth - margin - 120;
        }
      } else {
        currentX -= step;
        if (currentX < margin) {
          facing = "right";
          currentX = margin;
        }
      }

      updateCompanionState(instance.instanceId, {
        x: currentX,
        facing,
      });

      // Synchronize native Tauri window position
      try {
        await invoke("companion_set_position", {
          companionId: instance.instanceId,
          x: Math.round(currentX),
          y: Math.round(currentY),
        });
      } catch {}
    }, intervalMs);

    return () => clearInterval(moveTimer);
  }, [
    interactive,
    instance.isPaused,
    instance.currentState,
    instance.x,
    instance.y,
    instance.facing,
    instance.scale,
    manifest?.speed,
    settings.fpsCap,
    settings.boundaryMargin,
  ]);

  // 4. Click Handler: Pet / Heart reaction
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contextMenuOpen) {
      setContextMenuOpen(false);
      return;
    }

    if (settings.soundEnabled) {
      playCuteSound("click");
    }

    // Spawn cute floating heart particles
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const heartId = Date.now() + Math.random();
    setHearts((prev) => [...prev.slice(-4), { id: heartId, x, y }]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1200);

    // Trigger click / happy animation
    setCompanionAction(instance.instanceId, "click");

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setCompanionAction(instance.instanceId, "idle");
    }, 1600);

    if (onSelect) onSelect();
  };

  // 5. Native Dragging Handlers
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 2) {
      // Right click opens context menu
      e.preventDefault();
      setContextMenuOpen((prev) => !prev);
      return;
    }

    if (e.button !== 0) return;

    isDraggingRef.current = true;
    updateCompanionState(instance.instanceId, { currentState: "drag" });

    try {
      const win = getCurrentWebviewWindow();
      if (win && win.label.startsWith("companion-")) {
        await win.startDragging();
      }
    } catch {}
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      updateCompanionState(instance.instanceId, { currentState: "idle" });
    }
  };

  const currentFrameSrc = frames[frameIndex] || manifest?.preview || "";
  const baseWidth = manifest?.dimensions.width || 100;
  const baseHeight = manifest?.dimensions.height || 100;
  const finalScale = instance.scale || 1.0;

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenuOpen(true);
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleAvatarClick}
      className="relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing group"
      style={{
        width: `${baseWidth * finalScale}px`,
        height: `${baseHeight * finalScale}px`,
        opacity: instance.opacity || 1.0,
      }}
    >
      {/* Sprite / Frame with Direction Flipping */}
      {animDef?.spritesheet ? (
        <div
          style={spriteStyle(
            animDef.spritesheet,
            frameIndex,
            baseWidth * finalScale,
            baseHeight * finalScale,
            instance.facing === "left"
          )}
          className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
        />
      ) : (
        <img
          src={currentFrameSrc}
          alt={manifest?.name || "Companheiro"}
          draggable={false}
          className="w-full h-full object-contain pointer-events-none transition-transform duration-100 drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
          style={{
            transform: instance.facing === "left" ? "scaleX(-1)" : "scaleX(1)",
          }}
        />
      )}

      {/* Floating Love Heart Particles */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-none text-pink-500 font-bold text-lg animate-out fade-out slide-out-to-top duration-1000"
          style={{
            left: `${h.x}px`,
            top: `${h.y - 20}px`,
            filter: "drop-shadow(0 2px 4px rgba(236,72,153,0.6))",
          }}
        >
          💖
        </div>
      ))}

      {/* Sleeping Indicator ZzZ */}
      {instance.currentState === "sleep" && (
        <div className="absolute -top-3 right-0 text-pink-400 font-bold text-xs animate-bounce pointer-events-none drop-shadow">
          💤 zZz
        </div>
      )}

      {/* Paused Indicator */}
      {instance.isPaused && (
        <div className="absolute top-0 right-0 bg-black/60 text-white/80 rounded-full px-1.5 py-0.5 text-[9px] pointer-events-none">
          ⏸️
        </div>
      )}

      {/* Cute Context Menu */}
      {contextMenuOpen && (
        <CompanionContextMenu
          instance={instance}
          onClose={() => setContextMenuOpen(false)}
        />
      )}
    </div>
  );
};
