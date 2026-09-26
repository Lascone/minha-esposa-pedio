import React from "react";
import {
  Heart,
  Moon,
  Sun,
  Pause,
  Play,
  Maximize2,
  Pin,
  Trash2,
  X,
} from "lucide-react";
import { CompanionInstance } from "../types";
import { useCompanionsStore } from "../store/companionsStore";

interface CompanionContextMenuProps {
  instance: CompanionInstance;
  onClose: () => void;
}

export const CompanionContextMenu: React.FC<CompanionContextMenuProps> = ({
  instance,
  onClose,
}) => {
  const { updateCompanionState, setCompanionAction, removeCompanion } =
    useCompanionsStore();

  const isSleeping = instance.currentState === "sleep";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 left-0 z-50 min-w-[170px] bg-slate-900/95 text-white/90 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-pink-500/30 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
      style={{
        boxShadow: "0 10px 25px -5px rgba(236, 72, 153, 0.3)",
      }}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1">
        <span className="font-semibold text-pink-300 truncate max-w-[120px]">
          {instance.customName || "Companheiro"}
        </span>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Pet / Carinho */}
      <button
        onClick={() => {
          setCompanionAction(instance.instanceId, "click");
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-pink-500/20 text-pink-200 transition-colors text-left"
      >
        <Heart className="w-3.5 h-3.5 text-pink-400" />
        <span>Fazer Carinho 💕</span>
      </button>

      {/* 2. Sleep / Wake */}
      <button
        onClick={() => {
          setCompanionAction(
            instance.instanceId,
            isSleeping ? "idle" : "sleep"
          );
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
      >
        {isSleeping ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Acordar ☀️</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dormir 💤</span>
          </>
        )}
      </button>

      {/* 3. Pause / Play */}
      <button
        onClick={() => {
          updateCompanionState(instance.instanceId, {
            isPaused: !instance.isPaused,
          });
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
      >
        {instance.isPaused ? (
          <>
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Despausar ▶️</span>
          </>
        ) : (
          <>
            <Pause className="w-3.5 h-3.5 text-amber-400" />
            <span>Pausar ⏸️</span>
          </>
        )}
      </button>

      {/* 4. Scale options */}
      <div className="px-2.5 py-1.5 text-[11px] text-white/50 border-t border-white/10 mt-1 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Maximize2 className="w-3 h-3 text-pink-400" /> Tamanho:
        </span>
        <div className="flex gap-1">
          {[0.8, 1.0, 1.4].map((s) => (
            <button
              key={s}
              onClick={() =>
                updateCompanionState(instance.instanceId, { scale: s })
              }
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                Math.abs(instance.scale - s) < 0.05
                  ? "bg-pink-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {s === 0.8 ? "P" : s === 1.0 ? "M" : "G"}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Pin / Always on top */}
      <button
        onClick={() => {
          updateCompanionState(instance.instanceId, {
            alwaysOnTop: !instance.alwaysOnTop,
          });
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Pin className="w-3.5 h-3.5 text-sky-400" />
          <span>Ficar no topo</span>
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
            instance.alwaysOnTop ? "text-pink-400" : "text-white/40"
          }`}
        >
          {instance.alwaysOnTop ? "ON" : "OFF"}
        </span>
      </button>

      {/* 6. Dismiss */}
      <button
        onClick={() => {
          removeCompanion(instance.instanceId);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 text-red-300 transition-colors text-left border-t border-white/10 mt-1"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        <span>Guardar (Remover)</span>
      </button>
    </div>
  );
};
