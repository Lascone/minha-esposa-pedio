import React, { useState } from "react";
import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetRenderer } from "../components/WidgetRenderer";
import { Grid, Sparkles, Monitor, RotateCcw } from "lucide-react";

interface DesktopWidgetsCanvasProps {
  onConfigureWidget: (id: string) => void;
}

export const DesktopWidgetsCanvas: React.FC<DesktopWidgetsCanvasProps> = ({
  onConfigureWidget,
}) => {
  const { activeWidgets, resetAllPositions } = useWidgetsStore();
  const [showGrid, setShowGrid] = useState(true);

  const visibleWidgets = activeWidgets.filter((w) => w.visible);

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-pink-500" />
          <span className="text-xs font-bold text-theme-text">
            Simulador da Área de Trabalho (Arraste para organizar)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
              showGrid
                ? "bg-pink-500 text-white border-pink-400"
                : "bg-theme-surface border-theme-border/60 text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Grid size={12} />
            <span>Grade Guia</span>
          </button>

          <button
            onClick={resetAllPositions}
            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-theme-border/60 bg-theme-surface text-theme-text-muted hover:text-theme-text flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Alinhar Todos</span>
          </button>
        </div>
      </div>

      {/* Simulated Desktop Workspace */}
      <div
        className={`relative w-full h-[540px] rounded-cuter overflow-hidden border border-theme-border/80 shadow-2xl ${
          showGrid
            ? "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
            : ""
        } bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 select-none`}
      >
        {/* Subtle decorative Windows desktop backdrop glow */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Windows 7 / 11 Taskbar Mock at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-950/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 z-20 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-pink-500/80 flex items-center justify-center text-white text-xs">
              💕
            </div>
            <span className="text-[10px] font-bold text-white/70">
              Área de Trabalho Ativa
            </span>
          </div>
          <div className="text-[10px] text-white/60 font-mono">
            Windows Desktop • Widgets Ativos ({visibleWidgets.length})
          </div>
        </div>

        {/* Render Active Widgets in Canvas */}
        {visibleWidgets.map((widget) => (
          <WidgetRenderer
            key={widget.id}
            widget={widget}
            isDesktopPreview={true}
            onOpenSettings={() => onConfigureWidget(widget.id)}
          />
        ))}

        {visibleWidgets.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white/50 pointer-events-none">
            <Sparkles size={28} className="mb-2 text-pink-400" />
            <span className="text-sm font-bold text-white/80">
              Nenhum gadget visível nesta tela
            </span>
            <span className="text-xs text-white/50 mt-1">
              Ative ou adicione gadgets na aba "Galeria" para visualizá-los aqui!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
