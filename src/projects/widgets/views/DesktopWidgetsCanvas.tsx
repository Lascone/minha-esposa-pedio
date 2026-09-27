import React, { useEffect, useRef, useState } from "react";
import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetRenderer } from "../components/WidgetRenderer";
import { Grid, Sparkles, Monitor, RotateCcw, Settings, Lock, Unlock } from "lucide-react";
import { WidgetInstance } from "../types";
import { isConsoleWidgetType } from "../console/types";
import { clampToArea, DRAG_THRESHOLD_PX, simulatorScale } from "../dragLogic";
import { getPrimaryMonitorInfo, MonitorInfo } from "../monitor";

interface DesktopWidgetsCanvasProps {
  onConfigureWidget: (id: string) => void;
}

const MAX_SIMULATOR_HEIGHT = 620;

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

export const DesktopWidgetsCanvas: React.FC<DesktopWidgetsCanvasProps> = ({
  onConfigureWidget,
}) => {
  const { activeWidgets, resetAllPositions, updateWidgetPosition, setWidgetLocked } = useWidgetsStore();
  const [showGrid, setShowGrid] = useState(true);
  const [monitor, setMonitor] = useState<MonitorInfo | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const visibleWidgets = activeWidgets.filter((w) => w.visible);

  useEffect(() => {
    let alive = true;
    const load = () => getPrimaryMonitorInfo().then((m) => alive && setMonitor(m));
    load();
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.removeEventListener("focus", load);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const screen = monitor?.screen ?? { x: 0, y: 0, width: 1920, height: 1080 };
  const work = monitor?.work ?? screen;
  const k = simulatorScale(containerWidth, screen, MAX_SIMULATOR_HEIGHT);
  const taskbarHeight = Math.max(0, screen.y + screen.height - (work.y + work.height));

  const boxOf = (w: WidgetInstance) => ({ width: w.width * (w.scale || 1), height: w.height * (w.scale || 1) });

  const onPointerDown = (e: React.PointerEvent, widget: WidgetInstance) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-no-drag]") || widget.locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = clampToArea(widget.x, widget.y, boxOf(widget), screen);
    dragRef.current = {
      id: widget.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent, widget: WidgetInstance) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== widget.id || drag.pointerId !== e.pointerId || k <= 0) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const next = clampToArea(drag.originX + dx / k, drag.originY + dy / k, boxOf(widget), screen);
    setDragPos({ id: widget.id, ...next });
  };

  const onPointerUp = (e: React.PointerEvent, widget: WidgetInstance) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== widget.id) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag.moved && dragPos && dragPos.id === widget.id) {
      updateWidgetPosition(widget.id, dragPos.x, dragPos.y);
    }
    setDragPos(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-pink-500" />
          <span className="text-xs font-bold text-theme-text">
            Simulador da Área de Trabalho (segure e arraste para organizar)
          </span>
          <span className="text-[10px] font-mono text-theme-text-muted">
            {monitor
              ? `Monitor principal ${screen.width} × ${screen.height}${
                  monitor.scaleFactor !== 1 ? ` · escala ${Math.round(monitor.scaleFactor * 100)}%` : ""
                }`
              : "Lendo o monitor…"}
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

      <div ref={containerRef} className="w-full">
        {/* Simulated monitor, same proportions as the real one */}
        <div
          className={`relative mx-auto rounded-cuter overflow-hidden border border-theme-border/80 shadow-2xl ${
            showGrid
              ? "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]"
              : ""
          } bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 select-none`}
          style={{
            width: Math.round(screen.width * k),
            height: Math.round(screen.height * k),
            backgroundSize: showGrid ? `${Math.max(8, 48 * k)}px ${Math.max(8, 48 * k)}px` : undefined,
          }}
        >
          <div className="absolute top-1/4 left-1/3 w-1/3 h-1/3 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {taskbarHeight > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-3 z-20 pointer-events-none"
              style={{ height: Math.max(12, Math.round(taskbarHeight * k)) }}
            >
              <span className="text-[9px] font-bold text-white/70">Barra de tarefas</span>
              <span className="text-[9px] text-white/60 font-mono">Widgets ativos ({visibleWidgets.length})</span>
            </div>
          )}

          {k > 0 &&
            visibleWidgets.map((widget) => {
              const box = boxOf(widget);
              const pos =
                dragPos && dragPos.id === widget.id ? dragPos : clampToArea(widget.x, widget.y, box, screen);
              const dragging = dragPos?.id === widget.id;
              return (
                <div
                  key={widget.id}
                  onPointerDown={(e) => onPointerDown(e, widget)}
                  onPointerMove={(e) => onPointerMove(e, widget)}
                  onPointerUp={(e) => onPointerUp(e, widget)}
                  onPointerCancel={(e) => onPointerUp(e, widget)}
                  onDoubleClick={() => onConfigureWidget(widget.id)}
                  title={widget.locked ? `${widget.title} (travado)` : `${widget.title} — segure e arraste`}
                  className={`group absolute ${dragging ? "z-40" : "z-10"} ${
                    widget.locked ? "cursor-not-allowed" : dragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{
                    left: Math.round((pos.x - screen.x) * k),
                    top: Math.round((pos.y - screen.y) * k),
                    width: Math.round(box.width * k),
                    height: Math.round(box.height * k),
                    touchAction: "none",
                  }}
                >
                  <div
                    className={`w-full h-full rounded-xl ${dragging ? "ring-2 ring-pink-400 shadow-2xl" : "group-hover:ring-2 group-hover:ring-pink-300/60"}`}
                  >
                    {isConsoleWidgetType(widget.type) ? (
                      <div className="w-full h-full rounded-xl bg-slate-900/80 border border-white/15 flex items-center justify-center text-[10px] text-white/80 text-center p-1 pointer-events-none">
                        🎮 {widget.title}
                      </div>
                    ) : (
                      <div
                        className="pointer-events-none"
                        style={{
                          width: widget.width,
                          height: widget.height,
                          transform: `scale(${(widget.scale || 1) * k})`,
                          transformOrigin: "top left",
                          opacity: widget.opacity,
                        }}
                      >
                        <WidgetRenderer widget={widget} thumbnail />
                      </div>
                    )}
                  </div>

                  <div
                    data-no-drag
                    className="absolute top-1 right-1 z-50 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      data-no-drag
                      onClick={() => setWidgetLocked(widget.id, !widget.locked)}
                      className={`p-1 rounded-full shadow ${
                        widget.locked ? "bg-amber-500 text-white" : "bg-slate-800/90 text-white/90 hover:bg-slate-700"
                      }`}
                      title={widget.locked ? "Destravar posição" : "Travar posição"}
                    >
                      {widget.locked ? <Lock size={10} /> : <Unlock size={10} />}
                    </button>
                    <button
                      data-no-drag
                      onClick={() => onConfigureWidget(widget.id)}
                      className="p-1 rounded-full bg-slate-800/90 text-white/90 hover:bg-slate-700 shadow"
                      title="Configurações do Gadget"
                    >
                      <Settings size={10} />
                    </button>
                  </div>
                </div>
              );
            })}

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
    </div>
  );
};
