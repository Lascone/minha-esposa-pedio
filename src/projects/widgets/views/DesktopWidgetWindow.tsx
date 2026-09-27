import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetRenderer } from "../components/WidgetRenderer";
import { WidgetConfigModal } from "../components/WidgetConfigModal";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/window";
import { getWidgetDefinition } from "../registry";
import { useCustomWidgetsStore } from "../custom/customWidgetsStore";
import { WidgetInstance, WidgetType } from "../types";
import { CONSOLE_SNES_TYPE, gameIdFromWidgetType, isConsoleWidgetType } from "../console/types";
import { useWindowHitArea } from "../hooks/useWindowHitArea";
import { DRAG_THRESHOLD_PX, isDragExempt } from "../dragLogic";

const MIN_WIDGET_SCALE = 0.5;
const MAX_WIDGET_SCALE = 2;

interface DesktopWidgetWindowProps {
  widgetId?: string;
}

export const DesktopWidgetWindow: React.FC<DesktopWidgetWindowProps> = ({
  widgetId: propWidgetId,
}) => {
  const { activeWidgets, globalTheme, globalScale, globalOpacity, recordWidgetBounds, setWidgetScale } = useWidgetsStore();
  const { packages: customPackages } = useCustomWidgetsStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Extract widget ID from prop, global window label, URL hash, or Tauri window label
  let targetId = propWidgetId;
  let windowLabel = "";

  if (typeof window !== "undefined" && (window as any).__TAURI_WINDOW_LABEL__) {
    windowLabel = (window as any).__TAURI_WINDOW_LABEL__;
  }

  if (!targetId && windowLabel) {
    targetId = windowLabel;
  }

  if (!targetId) {
    const hash = window.location.hash;
    const match = hash.match(/\/widget\/([^/?#]+)/);
    targetId = match ? match[1] : undefined;
  }

  if (!targetId) {
    try {
      const currentWin = getCurrentWebviewWindow();
      if (currentWin && currentWin.label && currentWin.label !== "main") {
        targetId = currentWin.label;
        windowLabel = currentWin.label;
      }
    } catch {}
  }

  // Resolve widget instance with ultra-resilient fallback
  const resolvedWidget: WidgetInstance = useMemo(() => {
    // 1. Try finding in activeWidgets store
    const exact = activeWidgets.find(
      (w) =>
        w.id === targetId ||
        `widget-${w.id}` === targetId ||
        (targetId && targetId.replace("widget-", "") === w.id)
    );
    if (exact) {
      return {
        ...exact,
        settings: exact.settings || {},
        alwaysOnTop: exact.alwaysOnTop ?? false,
      };
    }

    // 2. Infer type from label / targetId (e.g. "widget-pomodoro-12345" -> "pomodoro")
    const cleanId = (targetId || windowLabel || "widget-analog-clock-1").replace("widget-", "");
    const candidateId = cleanId.replace(/-\d+$/, "");

    if (isConsoleWidgetType(candidateId)) {
      return {
        id: targetId || `widget-${candidateId}`,
        type: CONSOLE_SNES_TYPE as WidgetType,
        title: "Mini Console SNES",
        enabled: true,
        visible: true,
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 1,
        opacity: 1,
        theme: globalTheme || "aero-glass",
        alwaysOnTop: false,
        locked: false,
        settings: { gameId: gameIdFromWidgetType(candidateId) },
      };
    }
    const matchType = cleanId.split("-")[0] + (cleanId.split("-")[1] && isNaN(Number(cleanId.split("-")[1])) ? `-${cleanId.split("-")[1]}` : "");
    const def = getWidgetDefinition(candidateId) || getWidgetDefinition(matchType) || getWidgetDefinition(cleanId);
    const customPkg = customPackages.find(
      (p) => p.manifest.id === candidateId || p.manifest.id === cleanId || p.manifest.id === targetId || p.manifest.id === matchType
    );

    const finalType = (customPkg ? customPkg.manifest.id : def ? def.type : "analog-clock") as WidgetType;
    const finalTitle = customPkg ? customPkg.manifest.name : def ? def.name : "Gadget";
    const width = customPkg ? customPkg.manifest.defaultWidth : def ? def.defaultWidth : 240;
    const height = customPkg ? customPkg.manifest.defaultHeight : def ? def.defaultHeight : 240;

    return {
      id: targetId || `widget-${finalType}`,
      type: finalType,
      title: finalTitle,
      enabled: true,
      visible: true,
      x: 0,
      y: 0,
      width,
      height,
      scale: globalScale || 1.0,
      opacity: globalOpacity || 0.95,
      theme: globalTheme || "aero-glass",
      alwaysOnTop: false,
      locked: false,
      settings: {},
    };
  }, [activeWidgets, targetId, windowLabel, customPackages, globalTheme, globalScale, globalOpacity]);

  // Set window background to 100% transparent in WebView2
  useEffect(() => {
    document.documentElement.classList.add("is-transparent-window");
    document.body.classList.add("is-transparent-window");
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.documentElement.style.overflow = "hidden";
    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.body.style.overflow = "hidden";
    const root = document.getElementById("root");
    if (root) {
      root.style.background = "transparent";
      root.style.backgroundColor = "transparent";
    }

    return () => {
      document.documentElement.classList.remove("is-transparent-window");
      document.body.classList.remove("is-transparent-window");
    };
  }, []);

  const isConsole = isConsoleWidgetType(resolvedWidget.type);
  const storeId = activeWidgets.some((w) => w.id === resolvedWidget.id) ? resolvedWidget.id : null;
  const scale = resolvedWidget.scale || 1;

  const modalOpenRef = useRef(modalOpen);
  modalOpenRef.current = modalOpen;
  const sizeRef = useRef({ width: resolvedWidget.width, height: resolvedWidget.height, scale });
  sizeRef.current = { width: resolvedWidget.width, height: resolvedWidget.height, scale };
  const storeIdRef = useRef(storeId);
  storeIdRef.current = storeId;

  // The native window always measures width × scale, so the frame fills it exactly.
  // While settings are open the window grows temporarily and shrinks back afterwards.
  useEffect(() => {
    if (isConsole) return;
    let win: ReturnType<typeof getCurrentWebviewWindow>;
    try {
      win = getCurrentWebviewWindow();
    } catch {
      return;
    }
    const targetW = Math.round(resolvedWidget.width * scale);
    const targetH = Math.round(resolvedWidget.height * scale);
    const wantW = modalOpen ? Math.max(targetW, 380) : targetW;
    const wantH = modalOpen ? Math.max(targetH, 560) : targetH;
    (async () => {
      await win.setMinSize(
        modalOpen
          ? null
          : new LogicalSize(
              Math.round(resolvedWidget.width * MIN_WIDGET_SCALE),
              Math.round(resolvedWidget.height * MIN_WIDGET_SCALE)
            )
      );
      const factor = await win.scaleFactor();
      const inner = (await win.innerSize()).toLogical(factor);
      if (Math.abs(inner.width - wantW) > 2 || Math.abs(inner.height - wantH) > 2) {
        await win.setSize(new LogicalSize(wantW, wantH));
      }
    })().catch(() => {});
  }, [isConsole, resolvedWidget.width, resolvedWidget.height, scale, modalOpen]);

  // Moving is remembered; dragging an edge zooms the whole widget (keeping its
  // proportions) instead of cropping it. The mini console handles its own window.
  useEffect(() => {
    if (isConsole) return;
    let win: ReturnType<typeof getCurrentWebviewWindow>;
    try {
      win = getCurrentWebviewWindow();
    } catch {
      return;
    }
    let timer: number | undefined;
    const unlisteners: Array<() => void> = [];
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const id = storeIdRef.current;
        if (!id || modalOpenRef.current) return;
        try {
          const factor = await win.scaleFactor();
          const pos = (await win.outerPosition()).toLogical(factor);
          const size = (await win.innerSize()).toLogical(factor);
          if (modalOpenRef.current) return;
          const { width, height, scale: current } = sizeRef.current;
          recordWidgetBounds(id, { x: pos.x, y: pos.y, width, height });
          const fitted = Math.min(size.width / width, size.height / height);
          const next = Math.round(Math.min(MAX_WIDGET_SCALE, Math.max(MIN_WIDGET_SCALE, fitted)) * 100) / 100;
          if (Math.abs(next - current) >= 0.01) {
            setWidgetScale(id, next);
          } else if (Math.abs(size.width - width * current) > 2 || Math.abs(size.height - height * current) > 2) {
            await win.setSize(new LogicalSize(Math.round(width * current), Math.round(height * current)));
          }
        } catch {}
      }, 400);
    };
    win.onMoved(save).then((u) => unlisteners.push(u)).catch(() => {});
    win.onResized(save).then((u) => unlisteners.push(u)).catch(() => {});
    return () => {
      window.clearTimeout(timer);
      unlisteners.forEach((u) => u());
    };
  }, [isConsole, recordWidgetBounds, setWidgetScale]);

  // Only the visible card takes the mouse; transparent corners/margins let clicks reach the desktop.
  useWindowHitArea(null, {
    selector: "[data-widget-card]",
    radius: 24 * scale,
    full: modalOpen,
    enabled: !isConsole,
  });

  const [lockedHint, setLockedHint] = useState(false);
  const lockedRef = useRef(resolvedWidget.locked);
  lockedRef.current = resolvedWidget.locked;

  const startWindowDrag = useCallback(() => {
    if (lockedRef.current) {
      setLockedHint(true);
      return;
    }
    try {
      getCurrentWebviewWindow().startDragging().catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!lockedHint) return;
    const t = window.setTimeout(() => setLockedHint(false), 1600);
    return () => window.clearTimeout(t);
  }, [lockedHint]);

  // Custom widgets live in a sandboxed iframe, so their "hold and drag" arrives as a message.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "widget:drag") return;
      const fromChild = Array.from(document.querySelectorAll("iframe")).some(
        (f) => f.contentWindow === event.source
      );
      if (fromChild) startWindowDrag();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [startWindowDrag]);

  // Ctrl + wheel zooms the widget without hunting for the window edge.
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey || isConsole || !storeId || modalOpen) return;
    const next = Math.round(Math.min(MAX_WIDGET_SCALE, Math.max(MIN_WIDGET_SCALE, scale + (e.deltaY < 0 ? 0.05 : -0.05))) * 100) / 100;
    if (next !== scale) setWidgetScale(storeId, next);
  };

  // Brief "85%" badge whenever the size changes (resize or Ctrl + wheel).
  const [scaleBadge, setScaleBadge] = useState(false);
  const firstScaleRef = useRef(true);
  useEffect(() => {
    if (firstScaleRef.current) {
      firstScaleRef.current = false;
      return;
    }
    setScaleBadge(true);
    const t = window.setTimeout(() => setScaleBadge(false), 1200);
    return () => window.clearTimeout(t);
  }, [scale]);

  // Hold and drag anywhere that is not a control; a plain click stays a click.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isDragExempt(e.target)) {
      pressRef.current = null;
      return;
    }
    pressRef.current = { x: e.screenX, y: e.screenY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const press = pressRef.current;
    if (!press) return;
    if ((e.buttons & 1) === 0) {
      pressRef.current = null;
      return;
    }
    if (Math.abs(e.screenX - press.x) + Math.abs(e.screenY - press.y) >= DRAG_THRESHOLD_PX) {
      pressRef.current = null;
      startWindowDrag();
    }
  };

  return (
    <div
      id="widget-desktop-root"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (pressRef.current = null)}
      onWheel={onWheel}
      className="relative w-screen h-screen select-none overflow-hidden"
      style={{ background: "transparent" }}
    >
      {scaleBadge && !modalOpen && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
          {Math.round(scale * 100)}%
        </div>
      )}
      {lockedHint && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
          🔒 Posição travada — destrave no cadeado
        </div>
      )}
      <div className={modalOpen ? "invisible" : "contents"}>
        <WidgetRenderer
          widget={resolvedWidget}
          fillWindow
          onOpenSettings={() => setModalOpen(true)}
          onStartWindowDrag={startWindowDrag}
        />
      </div>

      {modalOpen && (
        <WidgetConfigModal
          widget={resolvedWidget}
          inWindow
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DesktopWidgetWindow;
