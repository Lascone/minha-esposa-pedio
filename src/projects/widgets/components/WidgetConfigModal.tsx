import React, { useState } from "react";
import { WidgetInstance, WidgetTheme } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { X, Sparkles, Pin, Lock, Sliders, Trash2, RotateCcw } from "lucide-react";

interface WidgetConfigModalProps {
  widget: WidgetInstance | null;
  onClose: () => void;
}

export const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  widget,
  onClose,
}) => {
  const {
    updateWidgetSettings,
    setWidgetTheme,
    setWidgetOpacity,
    setWidgetScale,
    setWidgetAlwaysOnTop,
    setWidgetLocked,
    updateWidgetPosition,
    removeWidget,
  } = useWidgetsStore();

  if (!widget) return null;

  const themes: { id: WidgetTheme; name: string; icon: string }[] = [
    { id: "aero-glass", name: "Aero Glass (Win 7)", icon: "💎" },
    { id: "cute-pastel", name: "Rosa Pastel Delicado", icon: "🌸" },
    { id: "dark-modern", name: "Escuro Moderno", icon: "🌙" },
    { id: "cyber-neon", name: "Cyber Neon", icon: "⚡" },
    { id: "minimal-white", name: "Branco Clean", icon: "✨" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md rounded-cuter bg-theme-surface border border-theme-border/80 shadow-2xl p-6 flex flex-col gap-5 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-theme-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-500 text-white flex items-center justify-center shadow-soft">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-theme-text">
                Personalizar Gadget
              </h3>
              <span className="text-xs text-theme-text-muted">
                {widget.title}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-theme-surface-card text-theme-text-muted hover:text-theme-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Theme Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-theme-text flex items-center gap-1.5">
              <Sparkles size={14} className="text-pink-500" />
              Tema Visual
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setWidgetTheme(widget.id, t.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    widget.theme === t.id
                      ? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold"
                      : "border-theme-border/60 hover:bg-theme-surface-card text-theme-text-muted"
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-theme-text">
              <span>Opacidade / Transparência</span>
              <span className="text-pink-500">{Math.round(widget.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={widget.opacity}
              onChange={(e) => setWidgetOpacity(widget.id, parseFloat(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Scale Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-theme-text">
              <span>Escala (Tamanho na Tela)</span>
              <span className="text-pink-500">{Math.round(widget.scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={widget.scale}
              onChange={(e) => setWidgetScale(widget.id, parseFloat(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Toggles: Pin and Lock */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-theme-border/40">
            <button
              onClick={() => setWidgetAlwaysOnTop(widget.id, !widget.alwaysOnTop)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                widget.alwaysOnTop
                  ? "bg-purple-600 text-white border-purple-500 shadow-soft"
                  : "border-theme-border/60 text-theme-text-muted hover:bg-theme-surface-card"
              }`}
            >
              <Pin size={14} />
              <span>{widget.alwaysOnTop ? "Sempre no Topo" : "Na Área de Trabalho"}</span>
            </button>

            <button
              onClick={() => setWidgetLocked(widget.id, !widget.locked)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                widget.locked
                  ? "bg-amber-500 text-white border-amber-400 shadow-soft"
                  : "border-theme-border/60 text-theme-text-muted hover:bg-theme-surface-card"
              }`}
            >
              <Lock size={14} />
              <span>{widget.locked ? "Posição Travada" : "Livre p/ Arrastar"}</span>
            </button>
          </div>

          {/* Position Info and Reset */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-theme-surface-card border border-theme-border/60 text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-theme-text">Posição Atual</span>
              <span className="text-theme-text-muted">
                X: {Math.round(widget.x)}px • Y: {Math.round(widget.y)}px
              </span>
            </div>
            <button
              onClick={() => updateWidgetPosition(widget.id, 100, 100)}
              className="px-2.5 py-1 rounded-xl bg-theme-surface hover:bg-pink-500 hover:text-white border border-theme-border/80 text-[11px] font-bold text-theme-text flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} />
              Centralizar
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-theme-border/60">
          <button
            onClick={() => {
              removeWidget(widget.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-cute bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-bold transition-all"
          >
            <Trash2 size={14} />
            Remover Gadget
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-cute bg-theme-primary text-white text-xs font-bold shadow-soft hover:opacity-95 transition-opacity"
          >
            Pronto ✨
          </button>
        </div>
      </div>
    </div>
  );
};
