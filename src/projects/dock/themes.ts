import { DockAppearance, DockTheme } from "./types";

export const DEFAULT_APPEARANCE: DockAppearance = {
  edge: "bottom",
  monitor: 0,
  align: "center",
  length: "auto",
  iconSize: 48,
  spacing: 8,
  padding: 10,
  offset: 10,
  magnify: 1.5,
  background: "glass",
  bgColor: "#1c1a2b",
  bgOpacity: 0.55,
  blur: 18,
  borderColor: "#ffffff",
  borderOpacity: 0.18,
  borderWidth: 1,
  radius: 22,
  shadow: 0.35,
  indicator: "dot",
  indicatorColor: "#f472b6",
  animations: true,
  animSpeed: 1,
  showLabels: true,
  startIcon: "windows",
};

/** Only visual fields: applying a theme never moves the dock or changes its size. */
export const THEME_FIELDS: (keyof DockAppearance)[] = [
  "background",
  "bgColor",
  "bgOpacity",
  "blur",
  "borderColor",
  "borderOpacity",
  "borderWidth",
  "radius",
  "shadow",
  "indicator",
  "indicatorColor",
  "startIcon",
];

export const MACOS_THEME_ID = "macos";
export const WIN11_THEME_ID = "windows11-float";

export const BUILTIN_THEMES: DockTheme[] = ([
  {
    id: WIN11_THEME_ID,
    name: "Windows 11 flutuante",
    builtin: true,
    appearance: {
      background: "glass",
      bgColor: "#e4e4e9",
      bgOpacity: 0.72,
      blur: 30,
      borderColor: "#ffffff",
      borderOpacity: 0.55,
      borderWidth: 1,
      radius: 10,
      shadow: 0.25,
      indicator: "bar",
      indicatorColor: "#4f8ef7",
      startIcon: "win11",
    },
  },
  {
    id: MACOS_THEME_ID,
    name: "macOS",
    builtin: true,
    appearance: {
      background: "glass",
      bgColor: "#f5f5f7",
      bgOpacity: 0.3,
      blur: 30,
      borderColor: "#ffffff",
      borderOpacity: 0.38,
      borderWidth: 1,
      radius: 20,
      shadow: 0.4,
      indicator: "dot",
      indicatorColor: "#f5f5f7",
      startIcon: "launchpad",
    },
  },
  {
    id: "aero-glass",
    name: "Aero Glass",
    builtin: true,
    appearance: { background: "glass", bgColor: "#9ec5ff", bgOpacity: 0.22, blur: 22, borderColor: "#ffffff", borderOpacity: 0.45, borderWidth: 1, radius: 20, shadow: 0.3, indicator: "bar", indicatorColor: "#e0f2fe" },
  },
  {
    id: "cute-pastel",
    name: "Cute Pastel",
    builtin: true,
    appearance: { background: "translucent", bgColor: "#fce7f3", bgOpacity: 0.78, blur: 14, borderColor: "#f9a8d4", borderOpacity: 0.7, borderWidth: 2, radius: 28, shadow: 0.25, indicator: "dot", indicatorColor: "#ec4899" },
  },
  {
    id: "dark-modern",
    name: "Dark Modern",
    builtin: true,
    appearance: { background: "solid", bgColor: "#111318", bgOpacity: 0.92, blur: 0, borderColor: "#ffffff", borderOpacity: 0.08, borderWidth: 1, radius: 18, shadow: 0.5, indicator: "dot", indicatorColor: "#e5e7eb" },
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon",
    builtin: true,
    appearance: { background: "translucent", bgColor: "#0b0620", bgOpacity: 0.8, blur: 10, borderColor: "#22d3ee", borderOpacity: 0.85, borderWidth: 2, radius: 14, shadow: 0.6, indicator: "glow", indicatorColor: "#f0abfc" },
  },
  {
    id: "clean-light",
    name: "Clean Claro",
    builtin: true,
    appearance: { background: "glass", bgColor: "#ffffff", bgOpacity: 0.6, blur: 24, borderColor: "#ffffff", borderOpacity: 0.7, borderWidth: 1, radius: 24, shadow: 0.2, indicator: "dot", indicatorColor: "#334155" },
  },
] as DockTheme[]).map((t): DockTheme => ({ ...t, appearance: { startIcon: "windows", ...t.appearance } }));

/** Layout that goes with the macOS look (applied by "Ativar estilo macOS", not by the theme). */
export const MACOS_LAYOUT: Partial<DockAppearance> = {
  edge: "bottom",
  align: "center",
  length: "auto",
  iconSize: 52,
  spacing: 6,
  padding: 7,
  offset: 6,
  magnify: 1.8,
  animations: true,
  showLabels: true,
};

/** Floating Windows 11 look: small icons on the left, no magnification, tray pill on the right. */
export const WIN11_LAYOUT: Partial<DockAppearance> = {
  edge: "bottom",
  align: "start",
  length: "auto",
  iconSize: 34,
  spacing: 4,
  padding: 6,
  offset: 6,
  magnify: 1,
  animations: true,
  showLabels: true,
};

/** Readable text color for content drawn on the dock background. */
export function contrastText(bgHex: string, opacity: number): string {
  const clean = bgHex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 && opacity >= 0.35 ? "#1f2328" : "#ffffff";
}

export function pickThemeFields(appearance: DockAppearance): Partial<DockAppearance> {
  const out: Partial<DockAppearance> = {};
  for (const key of THEME_FIELDS) (out as any)[key] = appearance[key];
  return out;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
