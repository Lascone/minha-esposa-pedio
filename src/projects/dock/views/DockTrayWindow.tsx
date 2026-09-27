import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { dockService, DockShellAction, TrayState } from "../dockService";
import { useDockStore } from "../store/dockStore";
import { pickMonitor, trayWindowRect } from "../logic";
import { DockAppearance, DockMonitor } from "../types";
import { TrayPill } from "../components/TrayPill";

/**
 * Separate always-on-top window with the tray/clock pill. Sits at the opposite end of the dock's edge
 * (bottom-right for a left-aligned bottom dock), exactly as big as the pill, so it never blocks the desktop.
 */
export const DockTrayWindow: React.FC = () => {
  const appearance = useDockStore((s) => s.appearance);
  const hideOnFullscreen = useDockStore((s) => s.behavior.hideOnFullscreen);
  const trayItems = useDockStore((s) => s.behavior.trayItems);
  const [monitors, setMonitors] = useState<DockMonitor[]>([]);
  const [state, setState] = useState<TrayState | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.style.background = "transparent";
    dockService.listMonitors().then(setMonitors).catch(() => {});
    const offs = [
      listen<DockMonitor[]>("dock://displays-changed", (e) => setMonitors(e.payload)),
      listen<boolean>("dock://fullscreen", (e) => setFullscreen(e.payload)),
    ];
    return () => offs.forEach((p) => p.then((f) => f()).catch(() => {}));
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      dockService
        .trayState()
        .then((s) => alive && setState(s))
        .catch(() => {});
    load();
    const t = window.setInterval(load, 2000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) => (prev && Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5 ? prev : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const monitor = pickMonitor(monitors, appearance.monitor);
  const hidden = fullscreen && hideOnFullscreen;

  useEffect(() => {
    if (!monitor || !size) return;
    const rect = trayWindowRect(appearance, monitor, size);
    dockService.traySetBounds(rect, !hidden).catch(() => {});
  }, [appearance, monitor, size, hidden]);

  const onAction = (action: DockShellAction | "peek") => {
    const run = action === "peek" ? dockService.taskbarPeek() : dockService.shellAction(action);
    run.catch(() => {});
  };

  const look: DockAppearance = appearance.background === "acrylic" ? { ...appearance, background: "glass", bgOpacity: Math.max(0.5, appearance.bgOpacity) } : appearance;

  return (
    <div className="fixed left-0 top-0" style={{ width: "max-content" }} ref={pillRef}>
      <TrayPill appearance={look} state={state} onAction={onAction} items={trayItems} />
    </div>
  );
};