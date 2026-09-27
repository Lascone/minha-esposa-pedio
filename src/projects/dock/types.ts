export type DockItemKind = "app" | "file" | "folder" | "url" | "missing";

export interface DockLaunchItem {
  id: string;
  type: "item";
  /** What gets opened: an .exe, .lnk, file, folder or URL. */
  path: string;
  name: string;
  kind: DockItemKind;
  /** Resolved shortcut target (used to match running windows). */
  target?: string;
  args?: string;
  /** Custom icon chosen by the user (data URL). */
  customIcon?: string;
}

export interface DockSeparator {
  id: string;
  type: "separator";
}

export interface DockGroup {
  id: string;
  type: "group";
  name: string;
  items: DockLaunchItem[];
}

export type DockEntry = DockLaunchItem | DockSeparator | DockGroup;

export type DockEdge = "bottom" | "top" | "left" | "right";
export type DockAlign = "start" | "center" | "end";
export type DockBackground = "solid" | "translucent" | "glass" | "acrylic";
export type DockIndicator = "dot" | "bar" | "glow" | "none";
export type DockAutoHide = "never" | "auto" | "smart";
export type DockLength = "auto" | "full";

export interface DockAppearance {
  edge: DockEdge;
  /** Monitor index from `dock_list_monitors` (0 = primary). */
  monitor: number;
  align: DockAlign;
  length: DockLength;
  iconSize: number;
  spacing: number;
  padding: number;
  /** Distance between the bar and the screen edge. */
  offset: number;
  /** 1 = no magnification. */
  magnify: number;
  background: DockBackground;
  bgColor: string;
  bgOpacity: number;
  blur: number;
  borderColor: string;
  borderOpacity: number;
  borderWidth: number;
  radius: number;
  shadow: number;
  indicator: DockIndicator;
  indicatorColor: string;
  animations: boolean;
  /** Multiplier: 0.5 = slower, 2 = faster. */
  animSpeed: number;
  showLabels: boolean;
  /** Look of the Start button: tinted Windows tile, plain Windows 11 logo, or a macOS Launchpad-style grid. */
  startIcon: "windows" | "win11" | "launchpad";
}

export interface DockBehavior {
  autoHide: DockAutoHide;
  /** Reserve screen space like the taskbar (only when always visible). */
  reserveSpace: boolean;
  hideOnFullscreen: boolean;
  showRunning: boolean;
  /** Start the dock automatically together with the app. */
  startWithApp: boolean;
  /** First icon opens the real Windows Start menu (macOS-like: the dock becomes the main bar). */
  startButton: boolean;
  /**
   * Where tray/clock go while the dock replaces the taskbar: a clock icon inside the dock, or a
   * separate floating pill at the other end of the edge (Windows 11 "floating taskbar" look).
   */
  trayStyle: "inDock" | "pill";
  /** System buttons shown right after Start, in this order (like the Windows 11 taskbar). */
  shellButtons: DockShellButton[];
  /** What the Start button opens: the real Windows Start menu or the dock's own themed menu. */
  startMenu: "windows" | "dock";
  startMenuSections: DockStartMenuSections;
  /** What the tray pill shows. */
  trayItems: DockTrayItems;
}

export type DockShellButton = "search" | "taskview" | "widgets" | "explorer" | "desktop" | "settings";

export interface DockStartMenuSections {
  pinned: boolean;
  allApps: boolean;
  power: boolean;
  user: boolean;
}

export interface DockTrayItems {
  chevron: boolean;
  language: boolean;
  quick: boolean;
  seconds: boolean;
  date: boolean;
}

export interface DockTheme {
  id: string;
  name: string;
  builtin?: boolean;
  appearance: Partial<DockAppearance>;
}

export interface DockTaskbarMode {
  enabled: boolean;
  autohide: boolean;
  /** Hide the native taskbar while the dock is open (the dock's tray button shows it on demand). */
  hide: boolean;
}

/** Window reported by `dock_list_windows`. */
export interface DockWindowInfo {
  hwnd: number;
  title: string;
  exe: string;
  pid: number;
  minimized: boolean;
  focused: boolean;
}

export interface DockMonitor {
  index: number;
  name: string;
  primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  workX: number;
  workY: number;
  workWidth: number;
  workHeight: number;
  scale: number;
}

export interface ResolvedDockItem {
  kind: DockItemKind;
  path: string;
  target?: string | null;
  args?: string | null;
  name: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
