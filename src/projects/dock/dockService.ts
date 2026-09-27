import { invoke } from "@tauri-apps/api/core";
import { DockMonitor, DockWindowInfo, Rect, ResolvedDockItem } from "./types";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface TaskbarChange {
  id: string;
  label: string;
  current: number | null;
  target: number;
  applied: boolean;
  error: string | null;
}

export interface TaskbarStatus {
  active: boolean;
  windowsBuild: number;
  isWindows11: boolean;
  autohide: boolean;
  hidden: boolean;
  changes: TaskbarChange[];
  backupPath: string;
}

export type DockShellAction =
  | "start"
  | "quicklinks"
  | "desktop"
  | "tray"
  | "quicksettings"
  | "notifications"
  | "language"
  | "search"
  | "taskview"
  | "widgets"
  | "explorer"
  | "settings";

export interface StartApp {
  name: string;
  path: string;
  folder: string;
}

export type PowerAction = "lock" | "signout" | "restart" | "shutdown";

/** Real indicators from `dock_tray_state`; null = Windows did not report it. */
export interface TrayState {
  language: string | null;
  network: "internet" | "local" | "none" | null;
  battery: { percent: number; charging: boolean } | null;
}

async function call<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  if (!isTauriRuntime()) {
    if (fallback !== undefined) return fallback;
    throw new Error("Disponível apenas no aplicativo instalado.");
  }
  return invoke<T>(cmd, args);
}

export const dockService = {
  openWindow: () => call<void>("dock_open_window"),
  closeWindow: () => (isTauriRuntime() ? invoke<void>("dock_close_window") : Promise.resolve()),
  setBounds: (r: Rect) =>
    call<void>("dock_set_bounds", { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }),
  setHitRect: (rect: Rect | null, bar: Rect | null) => call<void>("dock_set_hit_rect", { rect, bar }),
  envState: () => call<{ fullscreen: boolean; overlap: boolean }>("dock_env_state", undefined, { fullscreen: false, overlap: false }),
  setEffect: (effect: "acrylic" | "mica" | "none", radius?: number) => call<void>("dock_set_effect", { effect, radius: radius ?? null }),
  listWindows: () => call<DockWindowInfo[]>("dock_list_windows", undefined, []),
  windowAction: (hwnd: number, action: "focus" | "restore" | "minimize" | "close") => call<void>("dock_window_action", { hwnd, action }),
  launch: (path: string, args?: string | null) => call<void>("dock_launch", { path, args: args || null }),
  reveal: (path: string) => call<void>("dock_reveal", { path }),
  resolveItem: (path: string) => call<ResolvedDockItem>("dock_resolve_item", { path }),
  getIcon: (path: string) => call<string>("dock_get_icon", { path }),
  listMonitors: () => call<DockMonitor[]>("dock_list_monitors", undefined, []),
  pickItems: (kind: "files" | "folder" | "icon") => call<string[]>("dock_pick_items", { kind }),
  shellAction: (action: DockShellAction) => call<void>("dock_shell_action", { action }),
  trayOpen: () => call<void>("dock_tray_open"),
  trayClose: () => (isTauriRuntime() ? invoke<void>("dock_tray_close") : Promise.resolve()),
  traySetBounds: (r: Rect, visible: boolean) =>
    call<void>("dock_tray_set_bounds", { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), visible }),
  trayState: () => call<TrayState>("dock_tray_state"),
  menuToggle: () => call<boolean>("dock_menu_toggle"),
  menuHide: () => (isTauriRuntime() ? invoke<void>("dock_menu_hide") : Promise.resolve()),
  menuSetBounds: (r: Rect, show: boolean) =>
    call<void>("dock_menu_set_bounds", { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), show }),
  listStartApps: () => call<StartApp[]>("dock_list_start_apps", undefined, []),
  userName: () => call<string | null>("dock_user_name", undefined, null),
  powerAction: (action: PowerAction) => call<void>("dock_power_action", { action }),
  readImage: (path: string) => call<string>("dock_read_image", { path }),
  setAppBar: (reserve: boolean, edge: string, thickness: number, monitor: number) =>
    call<Rect | null>("dock_set_appbar", { reserve, edge, thickness: Math.round(thickness), monitor }, null),

  taskbarStatus: () => call<TaskbarStatus>("taskbar_mode_status"),
  taskbarApply: (autohide: boolean, hide = false) => call<TaskbarStatus>("taskbar_mode_apply", { autohide, hide }),
  taskbarRestore: () => call<TaskbarStatus>("taskbar_mode_restore"),
  taskbarPeek: () => call<void>("taskbar_peek"),
};

const iconCache = new Map<string, Promise<string | null>>();

/** Icon for a path, shared by every component (the Rust side also caches). */
export function loadIcon(path: string): Promise<string | null> {
  if (!path) return Promise.resolve(null);
  let p = iconCache.get(path);
  if (!p) {
    p = dockService.getIcon(path).catch(() => null);
    iconCache.set(path, p);
  }
  return p;
}
