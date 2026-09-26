import React from "react";
import { useWidgetsStore } from "../store/widgetsStore";
import { Eye, EyeOff, Settings, Trash2, Pin, Lock, Unlock, RotateCcw, Sparkles } from "lucide-react";
import { getWidgetDefinition } from "../registry";

interface ActiveWidgetsListViewProps {
  onConfigureWidget: (id: string) => void;
  onNavigateToGallery: () => void;
}

export const ActiveWidgetsListView: React.FC<ActiveWidgetsListViewProps> = ({
  onConfigureWidget,
  onNavigateToGallery,
}) => {
  const {
    activeWidgets,
    toggleWidgetVisibility,
    setWidgetAlwaysOnTop,
    setWidgetLocked,
    updateWidgetPosition,
    removeWidget,
  } = useWidgetsStore();

  if (activeWidgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-cuter bg-theme-surface border border-theme-border/60">
        <div className="w-16 h-16 rounded-3xl bg-pink-100 dark:bg-pink-950/60 text-pink-500 flex items-center justify-center text-3xl mb-4 shadow-soft">
          🪟
        </div>
        <h4 className="text-base font-extrabold text-theme-text mb-1">
          Nenhum Gadget Ativo no Momento
        </h4>
        <p className="text-xs text-theme-text-muted max-w-sm mb-5 leading-relaxed">
          Sua área de trabalho está limpinha! Visite a Galeria para adicionar relógios, previsão do tempo, notas rápidas ou monitores de hardware.
        </p>
        <button
          onClick={onNavigateToGallery}
          className="px-4 py-2 rounded-cute bg-theme-primary text-white text-xs font-bold shadow-soft flex items-center gap-1.5 hover:opacity-95 transition-opacity"
        >
          <Sparkles size={14} />
          Explorar Galeria de Gadgets
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activeWidgets.map((w) => {
        const def = getWidgetDefinition(w.type);

        return (
          <div
            key={w.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-theme-surface border border-theme-border/70 shadow-sm hover:border-pink-400/50 transition-colors gap-4"
          >
            {/* Widget Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-500 text-white flex items-center justify-center text-xl shadow-soft flex-shrink-0">
                {def?.icon || "✨"}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-theme-text">{w.title}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      w.visible ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    title={w.visible ? "Visível na área de trabalho" : "Oculto"}
                  />
                </div>
                <span className="text-[11px] text-theme-text-muted">
                  X: {Math.round(w.x)}px • Y: {Math.round(w.y)}px • Escala: {Math.round(w.scale * 100)}% • Opacidade: {Math.round(w.opacity * 100)}%
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => toggleWidgetVisibility(w.id)}
                className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                  w.visible
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30"
                    : "bg-theme-surface-card text-theme-text-muted border-theme-border/60 hover:text-theme-text"
                }`}
                title={w.visible ? "Ocultar gadget" : "Exibir na tela"}
              >
                {w.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              <button
                onClick={() => setWidgetAlwaysOnTop(w.id, !w.alwaysOnTop)}
                className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                  w.alwaysOnTop
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-theme-surface-card text-theme-text-muted border-theme-border/60 hover:text-theme-text"
                }`}
                title={w.alwaysOnTop ? "Sempre no topo" : "Fixado na área de trabalho"}
              >
                <Pin size={14} />
              </button>

              <button
                onClick={() => setWidgetLocked(w.id, !w.locked)}
                className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                  w.locked
                    ? "bg-amber-500 text-white border-amber-400"
                    : "bg-theme-surface-card text-theme-text-muted border-theme-border/60 hover:text-theme-text"
                }`}
                title={w.locked ? "Posição travada" : "Livre para mover"}
              >
                {w.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>

              <button
                onClick={() => updateWidgetPosition(w.id, 100, 100)}
                className="p-2 rounded-xl bg-theme-surface-card hover:bg-theme-surface border border-theme-border/60 text-theme-text-muted hover:text-theme-text transition-colors"
                title="Centralizar posição"
              >
                <RotateCcw size={14} />
              </button>

              <button
                onClick={() => onConfigureWidget(w.id)}
                className="p-2 rounded-xl bg-theme-surface-card hover:bg-theme-primary hover:text-white border border-theme-border/60 text-theme-text-muted transition-colors"
                title="Configurações e tema"
              >
                <Settings size={14} />
              </button>

              <button
                onClick={() => removeWidget(w.id)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-400/30 transition-colors"
                title="Remover gadget"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
