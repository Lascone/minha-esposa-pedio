import React, { useEffect, useMemo, useState } from "react";
import { DockAppearance, DockEntry, DockShellButton, DockStartMenuSections, DockTrayItems, DockWindowInfo } from "../types";
import { START_MENU_SIZE, buildSlots, flattenItems, matchWindows } from "../logic";
import { StartMenuPanel } from "../views/DockStartMenu";
import { dockService, isTauriRuntime, TrayState } from "../dockService";
import { DockBar } from "./DockBar";
import { TrayPill } from "./TrayPill";

interface DockPreviewProps {
  entries: DockEntry[];
  appearance: DockAppearance;
  showRunning: boolean;
  startButton?: boolean;
  compactTaskbar?: boolean;
  /** The native taskbar auto-hides (drawn faded in the preview). */
  taskbarAutohide?: boolean;
  /** The dock replaces the native taskbar: no taskbar drawn, tray/clock button in the dock. */
  taskbarHidden?: boolean;
  trayStyle?: "inDock" | "pill";
  shellButtons?: DockShellButton[];
  trayItems?: DockTrayItems;
  /** Set when Start opens the dock's own menu: clicking Start in the preview shows it. */
  startMenuSections?: DockStartMenuSections;
  onMove?: (id: string, toIndex: number) => void;
  onGroup?: (sourceId: string, targetId: string) => void;
  onSelect?: (id: string) => void;
  height?: number;
}

/** Mock desktop with the real dock component, so every change is visible immediately. */
export const DockPreview: React.FC<DockPreviewProps> = ({
  entries,
  appearance,
  showRunning,
  startButton = false,
  compactTaskbar,
  taskbarAutohide,
  taskbarHidden = false,
  trayStyle = "inDock",
  shellButtons = [],
  trayItems,
  startMenuSections,
  onMove,
  onGroup,
  onSelect,
  height = 270,
}) => {
  const [windows, setWindows] = useState<DockWindowInfo[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!startMenuSections || !startButton) setMenuOpen(false);
  }, [startMenuSections, startButton]);

  useEffect(() => {
    if (!showRunning) return;
    let alive = true;
    const load = () => dockService.listWindows().then((w) => alive && setWindows(w)).catch(() => {});
    load();
    const t = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [showRunning]);

  const [trayState, setTrayState] = useState<TrayState | null>(null);
  const showPill = taskbarHidden && trayStyle === "pill";
  useEffect(() => {
    if (!showPill || !isTauriRuntime()) return;
    dockService.trayState().then(setTrayState).catch(() => {});
  }, [showPill]);

  const slots = useMemo(
    () => buildSlots(entries, matchWindows(entries, windows), showRunning, startButton, taskbarHidden && trayStyle === "inDock", shellButtons),
    [entries, windows, showRunning, startButton, taskbarHidden, trayStyle, shellButtons]
  );
  const pinned = useMemo(() => flattenItems(entries), [entries]);
  const menuScale = Math.min(0.62, (height - 70) / START_MENU_SIZE.h);
  const vertical = appearance.edge === "left" || appearance.edge === "right";
  const align = appearance.align === "start" ? "flex-start" : appearance.align === "end" ? "flex-end" : "center";
  const edge = appearance.edge === "bottom" || appearance.edge === "right" ? "flex-end" : "flex-start";
  // Real Windows acrylic can't be shown inside the page; approximate it.
  const previewAppearance: DockAppearance =
    appearance.background === "acrylic" ? { ...appearance, background: "glass", bgOpacity: Math.max(0.35, appearance.bgOpacity), magnify: 1 } : appearance;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-theme-border/60 shadow-inner"
      style={{
        height,
        background:
          "radial-gradient(circle at 20% 20%, rgba(244,114,182,0.55), transparent 45%), radial-gradient(circle at 80% 30%, rgba(129,140,248,0.55), transparent 50%), radial-gradient(circle at 50% 90%, rgba(45,212,191,0.45), transparent 55%), linear-gradient(135deg, #2b2141, #1a2340)",
      }}
    >
      <div className="pointer-events-none absolute left-[12%] top-[14%] h-[42%] w-[38%] rounded-lg border border-white/15 bg-white/10 shadow-xl backdrop-blur-sm">
        <div className="h-5 rounded-t-lg bg-white/15" />
      </div>
      <div className="pointer-events-none absolute left-[46%] top-[26%] h-[36%] w-[32%] rounded-lg border border-white/15 bg-white/[0.07] shadow-xl">
        <div className="h-5 rounded-t-lg bg-white/10" />
      </div>

      <div
        className="absolute inset-x-0 top-0 flex"
        style={{
          bottom: taskbarHidden ? 0 : taskbarAutohide ? 2 : 30,
          transition: "bottom 500ms ease",
          flexDirection: vertical ? "row" : "column",
          justifyContent: edge,
          alignItems: appearance.length === "full" ? "stretch" : align,
          padding: appearance.offset,
        }}
      >
        <div
          style={{
            ...(appearance.length === "full" ? (vertical ? { height: "100%" } : { width: "100%" }) : {}),
            ...(slots.length === 0 ? { visibility: "hidden" as const } : {}),
          }}
        >
          <DockBar
            slots={slots}
            appearance={previewAppearance}
            onMove={onMove}
            onGroup={onGroup}
            onActivate={(slot) => {
              if (slot.kind === "start" && startMenuSections) setMenuOpen((o) => !o);
              if (slot.kind === "item" || slot.kind === "group") onSelect?.(slot.kind === "item" ? slot.item.id : slot.group.id);
            }}
          />
        </div>
        {slots.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/80">
            Adicione apps abaixo ou arraste atalhos para esta página ✨
          </div>
        )}
      </div>

      {taskbarHidden && trayStyle === "pill" && (
        <div
          className="absolute"
          style={{
            margin: appearance.offset,
            ...(vertical
              ? { [appearance.edge]: 0, ...(appearance.align === "end" ? { top: 0 } : { bottom: 0 }) }
              : { [appearance.edge]: 0, ...(appearance.align === "end" ? { left: 0 } : { right: 0 }) }),
          }}
        >
          <TrayPill appearance={previewAppearance} state={trayState} onAction={() => {}} items={trayItems} />
        </div>
      )}
      {menuOpen && startMenuSections && (
        <div
          className="absolute"
          title="Prévia do menu Iniciar do dock"
          style={{
            width: START_MENU_SIZE.w,
            height: START_MENU_SIZE.h,
            transform: `scale(${menuScale})`,
            transformOrigin: appearance.edge === "top" ? "top left" : appearance.edge === "right" ? "bottom right" : "bottom left",
            ...(appearance.edge === "top"
              ? { top: appearance.offset + appearance.iconSize + appearance.padding * 2 + 12, left: 16 }
              : appearance.edge === "left"
              ? { bottom: 16, left: appearance.offset + appearance.iconSize + appearance.padding * 2 + 12 }
              : appearance.edge === "right"
              ? { bottom: 16, right: appearance.offset + appearance.iconSize + appearance.padding * 2 + 12 }
              : { bottom: appearance.offset + appearance.iconSize + appearance.padding * 2 + 14, left: 16 }),
            ...((appearance.edge === "top" || appearance.edge === "bottom") && appearance.align === "center"
              ? { left: "50%", marginLeft: -(START_MENU_SIZE.w * menuScale) / 2 }
              : {}),
          }}
        >
          <StartMenuPanel
            appearance={appearance}
            sections={startMenuSections}
            pinned={pinned}
            apps={[]}
            userName="Você"
            onLaunch={() => {}}
            onShell={() => {}}
            onPower={() => {}}
            onClose={() => setMenuOpen(false)}
          />
        </div>
      )}
      {!taskbarHidden && <TaskbarMock compact={!!compactTaskbar} autohide={taskbarAutohide} />}
    </div>
  );
};

/** Very small drawing of the Windows taskbar (Start on the left or center, tray on the right). */
export const TaskbarMock: React.FC<{ compact: boolean; autohide?: boolean }> = ({ compact, autohide }) => (
  <div
    className="absolute inset-x-0 bottom-0 flex h-[30px] items-center gap-1.5 border-t border-white/10 bg-black/45 px-2 backdrop-blur-md transition-all duration-500"
    title={autohide ? "Barra do Windows oculta: aparece ao encostar o mouse na borda" : undefined}
    style={{ transform: autohide ? "translateY(28px)" : "none" }}
  >
    <div className="flex h-5 w-5 items-center justify-center rounded bg-sky-400/80 text-[9px] font-bold text-white" title="Iniciar">
      ⊞
    </div>
    {!compact && (
      <>
        <div className="h-4 w-20 rounded-full bg-white/15" title="Pesquisa" />
        <div className="h-4 w-4 rounded bg-white/20" title="Visão de tarefas" />
        <div className="h-4 w-4 rounded bg-white/20" title="Widgets" />
      </>
    )}
    <div className={`${compact ? "" : "mx-auto"} flex gap-1.5`} title="Apps abertos (o Windows sempre mostra)">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`rounded bg-white/25 ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
      ))}
    </div>
    <div className="ml-auto flex items-center gap-1.5 text-[9px] text-white/80" title="Bandeja e relógio">
      <span className="h-3 w-3 rounded-full bg-white/30" />
      <span className="h-3 w-3 rounded-full bg-white/30" />
      <span>12:00</span>
    </div>
  </div>
);
