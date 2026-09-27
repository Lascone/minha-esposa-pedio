import { RefObject, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface HitRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Visible box of `el` inside the window (CSS px = logical px), or null when it shows nothing. */
export function measureHitRect(el: HTMLElement | null, radius = 0): HitRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    x: Math.max(0, Math.floor(r.left)),
    y: Math.max(0, Math.floor(r.top)),
    width: Math.ceil(r.width),
    height: Math.ceil(r.height),
    radius,
  };
}

/**
 * Tells the native side which part of this desktop window is visible; everywhere else the mouse
 * goes straight to the desktop/apps below (transparent areas never block clicks).
 * `full`: the whole window takes the mouse (menus, settings open).
 */
export function useWindowHitArea(
  ref: RefObject<HTMLElement | null> | null,
  options: { radius?: number; full?: boolean; enabled?: boolean; selector?: string }
) {
  const { radius = 0, full = false, enabled = true, selector } = options;
  useEffect(() => {
    if (!enabled || !isTauri()) return;
    let label: string;
    try {
      label = getCurrentWebviewWindow().label;
    } catch {
      return;
    }
    if (label === "main") return;
    let last = "";
    const target = () => (selector ? document.querySelector<HTMLElement>(selector) : ref?.current ?? null);
    const push = () => {
      const rect = full
        ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, radius: 0 }
        : measureHitRect(target(), radius);
      const rects = rect ? [rect] : [];
      const key = JSON.stringify(rects);
      if (key === last) return;
      last = key;
      invoke("widget_set_hit_rects", { label, rects }).catch(() => {});
    };
    push();
    const ro = new ResizeObserver(push);
    const el = target();
    if (el) ro.observe(el);
    window.addEventListener("resize", push);
    // Animations and CSS transforms do not trigger the observer.
    const timer = window.setInterval(push, 500);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", push);
      window.clearInterval(timer);
      invoke("widget_set_hit_rects", { label, rects: null }).catch(() => {});
    };
  }, [ref, radius, full, enabled, selector]);
}
