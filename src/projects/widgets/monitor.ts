import { primaryMonitor } from "@tauri-apps/api/window";
import type { MonitorArea } from "./dragLogic";

export interface MonitorInfo {
  /** Whole primary monitor, logical px (same units as widget x/y). */
  screen: MonitorArea;
  /** Area not covered by the Windows taskbar. */
  work: MonitorArea;
  scaleFactor: number;
}

function fromBrowser(): MonitorInfo {
  const w = typeof window !== "undefined" ? window : undefined;
  const s = w?.screen;
  const width = s?.width || 1920;
  const height = s?.height || 1080;
  return {
    screen: { x: 0, y: 0, width, height },
    work: { x: 0, y: 0, width: s?.availWidth || width, height: s?.availHeight || height },
    scaleFactor: w?.devicePixelRatio || 1,
  };
}

export async function getPrimaryMonitorInfo(): Promise<MonitorInfo> {
  try {
    const mon = await primaryMonitor();
    if (!mon) return fromBrowser();
    const f = mon.scaleFactor || 1;
    const screen = {
      x: Math.round(mon.position.x / f),
      y: Math.round(mon.position.y / f),
      width: Math.round(mon.size.width / f),
      height: Math.round(mon.size.height / f),
    };
    const wa = mon.workArea;
    const work = wa
      ? {
          x: Math.round(wa.position.x / f),
          y: Math.round(wa.position.y / f),
          width: Math.round(wa.size.width / f),
          height: Math.round(wa.size.height / f),
        }
      : screen;
    return { screen, work, scaleFactor: f };
  } catch {
    return fromBrowser();
  }
}
