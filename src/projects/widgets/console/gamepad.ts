/**
 * Game controller support for the Mini Console (Gamepad API, works with anything Windows exposes:
 * Xbox/XInput pads, GameSir, PlayStation, Switch Pro, 8BitDo and generic USB/Bluetooth controllers).
 *
 * Bindings are tokens: "b<n>" = button n, "a<n>+" / "a<n>-" = axis n pushed past the dead zone.
 * The same evaluation runs inside the emulator frame (public/console/player.js); keep them in sync.
 */

/** SNES button indices used by EmulatorJS. */
export const SNES = { B: 0, Y: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8, X: 9, L: 10, R: 11 } as const;

export type PadLayout = "position" | "letters";
export type PadBindings = Record<number, string[]>;
export type ControllerKind = "xbox" | "gamesir" | "playstation" | "nintendo" | "8bitdo" | "generic";

export interface PadProfile {
  layout: PadLayout;
  /** Left stick also works as the D-pad. */
  stick: boolean;
  /** Manual overrides per SNES button; missing = automatic. */
  custom: PadBindings;
}

export interface ControllerInfo {
  kind: ControllerKind;
  name: string;
  /** Chromium recognised the controller and reports the standard layout (automatic setup works). */
  standard: boolean;
}

export interface PadSnapshot {
  buttons: number[];
  axes: number[];
}

export const DEFAULT_DEADZONE = 0.45;

export const DEFAULT_PROFILE: PadProfile = { layout: "position", stick: true, custom: {} };

const STICK_TOKENS: PadBindings = {
  [SNES.UP]: ["a1-"],
  [SNES.DOWN]: ["a1+"],
  [SNES.LEFT]: ["a0-"],
  [SNES.RIGHT]: ["a0+"],
};

/**
 * Standard mapping (W3C): 0 bottom, 1 right, 2 left, 3 top, 4/5 bumpers, 6/7 triggers, 8 back/select,
 * 9 start, 12-15 D-pad. "position" matches the SNES pad physically (SNES B is the bottom button);
 * "letters" follows the Xbox letters (Xbox A = SNES A).
 */
export function autoBindings(layout: PadLayout): PadBindings {
  const face: PadBindings =
    layout === "position"
      ? { [SNES.B]: ["b0"], [SNES.A]: ["b1"], [SNES.Y]: ["b2"], [SNES.X]: ["b3"] }
      : { [SNES.A]: ["b0"], [SNES.B]: ["b1"], [SNES.X]: ["b2"], [SNES.Y]: ["b3"] };
  return {
    ...face,
    [SNES.UP]: ["b12"],
    [SNES.DOWN]: ["b13"],
    [SNES.LEFT]: ["b14"],
    [SNES.RIGHT]: ["b15"],
    [SNES.L]: ["b4", "b6"],
    [SNES.R]: ["b5", "b7"],
    [SNES.SELECT]: ["b8"],
    [SNES.START]: ["b9"],
  };
}

/** What each SNES button actually listens to for this profile. */
export function resolveBindings(profile: PadProfile): PadBindings {
  const out: PadBindings = { ...autoBindings(profile.layout) };
  for (const [idx, tokens] of Object.entries(profile.custom)) out[Number(idx)] = [...tokens];
  if (profile.stick) {
    for (const [idx, tokens] of Object.entries(STICK_TOKENS)) {
      const cur = out[Number(idx)] || [];
      out[Number(idx)] = [...cur, ...tokens.filter((t) => !cur.includes(t))];
    }
  }
  return out;
}

export function tokenActive(token: string, pad: PadSnapshot, deadzone = DEFAULT_DEADZONE): boolean {
  const m = /^([ab])(\d+)([+-])?$/.exec(token);
  if (!m) return false;
  const n = Number(m[2]);
  if (m[1] === "b") return (pad.buttons[n] ?? 0) > 0.5;
  const v = pad.axes[n] ?? 0;
  return m[3] === "-" ? v < -deadzone : v > deadzone;
}

/** SNES buttons held on this controller. */
export function pressedButtons(bindings: PadBindings, pad: PadSnapshot, deadzone = DEFAULT_DEADZONE): Set<number> {
  const out = new Set<number>();
  for (const [idx, tokens] of Object.entries(bindings)) {
    if (tokens.some((t) => tokenActive(t, pad, deadzone))) out.add(Number(idx));
  }
  return out;
}

/** First input that became active between two snapshots (used by "press a button to assign"). */
export function newInput(prev: PadSnapshot | null, next: PadSnapshot, deadzone = 0.6): string | null {
  for (let i = 0; i < next.buttons.length; i++) {
    if (next.buttons[i] > 0.5 && !((prev?.buttons[i] ?? 0) > 0.5)) return `b${i}`;
  }
  for (let i = 0; i < next.axes.length; i++) {
    const v = next.axes[i];
    const p = prev?.axes[i] ?? 0;
    if (v > deadzone && p <= deadzone) return `a${i}+`;
    if (v < -deadzone && p >= -deadzone) return `a${i}-`;
  }
  return null;
}

/** Recognises the controller from the Gamepad API id (name plus USB vendor id). */
export function detectController(id: string, mapping: string): ControllerInfo {
  const lower = id.toLowerCase();
  const vendor = /vendor:\s*([0-9a-f]{4})/i.exec(id)?.[1]?.toLowerCase() || /^([0-9a-f]{4})-[0-9a-f]{4}-/i.exec(id)?.[1]?.toLowerCase();
  const standard = mapping === "standard";
  const name = id.replace(/\s*\((?:standard gamepad\s*)?vendor:.*\)\s*$/i, "").replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, "").trim() || "Controle";
  let kind: ControllerKind = "generic";
  if (lower.includes("gamesir") || vendor === "3537") kind = "gamesir";
  else if (lower.includes("8bitdo") || vendor === "2dc8") kind = "8bitdo";
  else if (lower.includes("xinput") || lower.includes("xbox") || vendor === "045e") kind = "xbox";
  else if (lower.includes("dualsense") || lower.includes("dualshock") || vendor === "054c") kind = "playstation";
  else if (lower.includes("pro controller") || lower.includes("joy-con") || vendor === "057e") kind = "nintendo";
  const friendly: Record<ControllerKind, string> = {
    xbox: "Controle Xbox / XInput",
    gamesir: "GameSir",
    playstation: "Controle PlayStation",
    nintendo: "Controle Nintendo",
    "8bitdo": "8BitDo",
    generic: "Controle genérico",
  };
  return { kind, name: kind === "generic" ? name : `${friendly[kind]}${name && !/xinput/i.test(name) ? ` · ${name}` : ""}`, standard };
}

const FACE_LABELS: Record<ControllerKind, [string, string, string, string]> = {
  xbox: ["A", "B", "X", "Y"],
  gamesir: ["A", "B", "X", "Y"],
  "8bitdo": ["B", "A", "Y", "X"],
  playstation: ["✕", "○", "□", "△"],
  nintendo: ["B", "A", "Y", "X"],
  generic: ["Baixo", "Direita", "Esquerda", "Cima"],
};

/** Friendly name of a binding token on this kind of controller (standard layout). */
export function tokenLabel(token: string, kind: ControllerKind = "generic", standard = true): string {
  const m = /^([ab])(\d+)([+-])?$/.exec(token);
  if (!m) return token;
  const n = Number(m[2]);
  if (m[1] === "a") {
    if (standard && n <= 1) return `Analógico ${n === 0 ? (m[3] === "-" ? "←" : "→") : m[3] === "-" ? "↑" : "↓"}`;
    if (standard && n <= 3) return `Analógico dir. ${n === 2 ? (m[3] === "-" ? "←" : "→") : m[3] === "-" ? "↑" : "↓"}`;
    return `Eixo ${n}${m[3]}`;
  }
  if (!standard) return `Botão ${n + 1}`;
  const face = FACE_LABELS[kind];
  const ps = kind === "playstation";
  const named: Record<number, string> = {
    0: face[0],
    1: face[1],
    2: face[2],
    3: face[3],
    4: ps ? "L1" : kind === "nintendo" ? "L" : "LB",
    5: ps ? "R1" : kind === "nintendo" ? "R" : "RB",
    6: ps ? "L2" : kind === "nintendo" ? "ZL" : "LT",
    7: ps ? "R2" : kind === "nintendo" ? "ZR" : "RT",
    8: ps ? "Share" : kind === "nintendo" ? "−" : "View",
    9: ps ? "Options" : kind === "nintendo" ? "+" : "Menu",
    10: "L3",
    11: "R3",
    12: "D-pad ↑",
    13: "D-pad ↓",
    14: "D-pad ←",
    15: "D-pad →",
    16: ps ? "PS" : kind === "nintendo" ? "Home" : "Guia",
  };
  return named[n] ?? `Botão ${n + 1}`;
}

export function snapshotOf(pad: Gamepad): PadSnapshot {
  return { buttons: pad.buttons.map((b) => (b.pressed ? 1 : b.value)), axes: [...pad.axes] };
}

/** Key used to remember settings per controller model. */
export function profileKey(id: string): string {
  return id.replace(/\s+/g, " ").trim().toLowerCase();
}
