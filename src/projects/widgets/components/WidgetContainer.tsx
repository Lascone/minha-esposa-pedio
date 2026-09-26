import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { Settings, X, Lock, Unlock, Pin, Move } from "lucide-react";

interface WidgetContainerProps {
  widget: WidgetInstance;
  children: React.ReactNode;
  onOpenSettings?: () => void;
  isDesktopPreview?: boolean;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  children,
  onOpenSettings,
  isDesktopPreview = false,
}) => {
  const {
    removeWidget,
    toggleWidgetVisibility,
    setWidgetAlwaysOnTop,
    setWidgetLocked,
    updateWidgetPosition,
  } = useWidgetsStore();

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Theme styling presets
  const getThemeClass = () => {
    switch (widget.theme) {
      case "dark-modern":
        return "bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 text-slate-100 shadow-2xl";
      case "cute-pastel":
        return "bg-pink-100/90 dark:bg-pink-950/80 backdrop-blur-xl border border-pink-300/60 dark:border-pink-800/60 text-pink-950 dark:text-pink-100 shadow-xl shadow-pink-500/10";
      case "cyber-neon":
        return "bg-slate-950/90 backdrop-blur-xl border border-cyan-500/60 text-cyan-200 shadow-2xl shadow-cyan-500/20";
      case "minimal-white":
        return "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-lg";
      case "aero-glass":
      default:
        // Windows 7 Iconic Aero Glass gradient & reflection
        return "bg-gradient-to-b from-white/35 via-white/20 to-white/10 dark:from-slate-800/50 dark:via-slate-900/40 dark:to-slate-950/30 backdrop-blur-2xl border border-white/60 dark:border-white/20 text-slate-900 dark:text-white shadow-2xl shadow-black/25";
    }
  };

  // Drag handling inside canvas/preview
  const handleMouseDown = (e: React.MouseEvent) => {
    if (widget.locked || !isDesktopPreview) return;
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - widget.x,
      y: e.clientY - widget.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || widget.locked || !isDesktopPreview) return;
    const newX = Math.max(0, e.clientX - dragOffset.x);
    const newY = Math.max(0, e.clientY - dragOffset.y);
    updateWidgetPosition(widget.id, newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDragging(false);
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        width: `${widget.width}px`,
        height: `${widget.height}px`,
        opacity: widget.opacity,
        transform: `scale(${widget.scale})`,
        transformOrigin: "top left",
        ...(isDesktopPreview
          ? {
              position: "absolute" as const,
              left: `${widget.x}px`,
              top: `${widget.y}px`,
            }
          : {}),
      }}
      className={`group relative rounded-3xl transition-shadow select-none overflow-hidden ${getThemeClass()} ${
        isDragging ? "cursor-grabbing ring-2 ring-pink-400" : isDesktopPreview && !widget.locked ? "cursor-grab" : ""
      }`}
    >
      {/* Aero Glass Specular Highlight (Windows 7 classic gloss effect) */}
      {widget.theme === "aero-glass" && (
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-3xl pointer-events-none" />
      )}

      {/* Floating Hover Controls (Windows 7 Gadget toolbar) */}
      <div
        className={`absolute top-2 right-2 flex items-center gap-1 z-30 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {isDesktopPreview && (
          <div
            title="Arraste para mover"
            className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white/90 cursor-grab active:cursor-grabbing backdrop-blur-md"
          >
            <Move size={12} />
          </div>
        )}

        <button
          onClick={() => setWidgetLocked(widget.id, !widget.locked)}
          className={`p-1 rounded-full backdrop-blur-md transition-colors ${
            widget.locked
              ? "bg-amber-500/80 text-white"
              : "bg-black/30 hover:bg-black/50 text-white/90"
          }`}
          title={widget.locked ? "Destravar posição" : "Travar posição"}
        >
          {widget.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>

        <button
          onClick={() => setWidgetAlwaysOnTop(widget.id, !widget.alwaysOnTop)}
          className={`p-1 rounded-full backdrop-blur-md transition-colors ${
            widget.alwaysOnTop
              ? "bg-purple-600/80 text-white"
              : "bg-black/30 hover:bg-black/50 text-white/90"
          }`}
          title={widget.alwaysOnTop ? "Sempre no Topo: Ativado" : "Fixar Sempre no Topo"}
        >
          <Pin size={12} />
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white/90 backdrop-blur-md transition-colors"
            title="Configurações do Gadget"
          >
            <Settings size={12} />
          </button>
        )}

        <button
          onClick={() => removeWidget(widget.id)}
          className="p-1 rounded-full bg-rose-500/80 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
          title="Fechar Gadget"
        >
          <X size={12} />
        </button>
      </div>

      {/* Widget Body Content */}
      <div className="relative z-10 w-full h-full p-4 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};
