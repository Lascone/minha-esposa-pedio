import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { Settings, X, Lock, Unlock, Pin, Move } from "lucide-react";

interface WidgetContainerProps {
  widget: WidgetInstance;
  children: React.ReactNode;
  onOpenSettings?: () => void;
  isDesktopPreview?: boolean;
  /** Own native window: the frame always matches the window, whatever its size. */
  fillWindow?: boolean;
  /** Static gallery thumbnail: no toolbar, no interaction. */
  thumbnail?: boolean;
  /** Custom widgets draw their own card, so the glass frame would double it. */
  frameless?: boolean;
  onStartWindowDrag?: () => void;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  children,
  onOpenSettings,
  isDesktopPreview = false,
  fillWindow = false,
  thumbnail = false,
  frameless = false,
  onStartWindowDrag,
}) => {
  const { removeWidget, setWidgetAlwaysOnTop, setWidgetLocked } = useWidgetsStore();

  const [isHovered, setIsHovered] = useState(false);

  // Theme styling presets
  const getThemeClass = () => {
    if (frameless) return "bg-transparent text-white";
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
        // Windows 7 Iconic Aero Glass gradient & reflection with rich contrast
        return "bg-gradient-to-b from-white/75 via-white/55 to-white/45 dark:from-slate-900/85 dark:via-slate-900/75 dark:to-slate-950/65 backdrop-blur-2xl border border-white/80 dark:border-white/20 text-slate-900 dark:text-white shadow-2xl shadow-black/35";
    }
  };

  const scale = widget.scale || 1;
  // A native window is resized to (width × scale); the unscaled layout box is
  // then 100%/scale of the window, so content never overflows or gets clipped.
  const sizeStyle: React.CSSProperties = fillWindow
    ? { width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})` }
    : thumbnail
    ? { width: `${widget.width}px`, height: `${widget.height}px` }
    : { width: `${widget.width}px`, height: `${widget.height}px`, transform: `scale(${scale})` };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...sizeStyle,
        opacity: thumbnail ? 1 : widget.opacity,
        transformOrigin: "top left",
        ...(isDesktopPreview
          ? {
              position: "absolute" as const,
              left: `${widget.x}px`,
              top: `${widget.y}px`,
            }
          : {}),
      }}
      data-widget-card
      className={`group relative rounded-3xl transition-shadow select-none overflow-hidden ${getThemeClass()} ${
        onStartWindowDrag && !widget.locked ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {/* Aero Glass Specular Highlight (Windows 7 classic gloss effect) */}
      {widget.theme === "aero-glass" && !frameless && (
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-3xl pointer-events-none" />
      )}

      {/* Floating Hover Controls (Windows 7 Gadget toolbar) */}
      {!thumbnail && (
      <div
        className={`absolute top-2 right-2 flex items-center gap-1 z-30 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {onStartWindowDrag && (
          <div
            title={widget.locked ? "Posição travada (destrave no cadeado)" : "Segure e arraste para mover"}
            data-no-drag
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              onStartWindowDrag();
            }}
            className={`p-1 rounded-full bg-black/30 hover:bg-black/50 text-white/90 backdrop-blur-md ${
              widget.locked ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing"
            }`}
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
      )}

      {/* Widget Body Content */}
      <div
        className={`relative z-10 w-full h-full flex flex-col items-center justify-center ${
          frameless ? "" : "p-4"
        }`}
      >
        {children}
      </div>
    </div>
  );
};
