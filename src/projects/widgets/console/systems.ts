export type ConsoleSystemId = "snes";

export interface ConsoleButton {
  /** Index used by EmulatorJS controller maps. */
  index: number;
  label: string;
}

export interface ConsoleSystem {
  id: ConsoleSystemId;
  label: string;
  shortLabel: string;
  /** EmulatorJS core name. */
  core: string;
  extensions: string[];
  /** Display aspect ratio (width / height). */
  aspect: number;
  minSizeBytes: number;
  maxSizeBytes: number;
  buttons: ConsoleButton[];
  /** Default keyboard map (button index -> KeyboardEvent.keyCode). */
  defaultKeys: Record<number, number>;
  coreLicense: string;
}

export const EMULATORJS_VERSION = "4.2.3";
export const EMULATORJS_CDN_DATA = `https://cdn.emulatorjs.org/${EMULATORJS_VERSION}/data/`;

export const SUPPORTED_SYSTEMS: ConsoleSystem[] = [
  {
    id: "snes",
    label: "Super Nintendo (SNES)",
    shortLabel: "SNES",
    core: "snes9x",
    extensions: [".sfc", ".smc"],
    aspect: 4 / 3,
    minSizeBytes: 32 * 1024,
    maxSizeBytes: 8 * 1024 * 1024 + 512,
    buttons: [
      { index: 4, label: "Cima" },
      { index: 5, label: "Baixo" },
      { index: 6, label: "Esquerda" },
      { index: 7, label: "Direita" },
      { index: 8, label: "A" },
      { index: 0, label: "B" },
      { index: 9, label: "X" },
      { index: 1, label: "Y" },
      { index: 10, label: "L" },
      { index: 11, label: "R" },
      { index: 3, label: "Start" },
      { index: 2, label: "Select" },
    ],
    defaultKeys: {
      4: 38, // seta cima
      5: 40, // seta baixo
      6: 37, // seta esquerda
      7: 39, // seta direita
      8: 88, // X
      0: 90, // Z
      9: 83, // S
      1: 65, // A
      10: 81, // Q
      11: 87, // W
      3: 13, // Enter
      2: 16, // Shift
    },
    coreLicense:
      "Snes9x: licença própria, uso não comercial permitido (uso pessoal ok).",
  },
];

export function getSystem(id: string | undefined): ConsoleSystem | undefined {
  return SUPPORTED_SYSTEMS.find((s) => s.id === id);
}

export function fileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

export type RomValidationError =
  | { kind: "extension"; message: string }
  | { kind: "empty"; message: string }
  | { kind: "too-small"; message: string }
  | { kind: "too-large"; message: string };

export function validateRomBasics(
  system: ConsoleSystem,
  fileName: string,
  size: number
): RomValidationError | null {
  const ext = fileExtension(fileName);
  if (!system.extensions.includes(ext)) {
    return {
      kind: "extension",
      message: `Arquivo "${fileName}" não é um jogo de ${system.shortLabel}. Use ${system.extensions.join(" ou ")}.`,
    };
  }
  if (size === 0) {
    return { kind: "empty", message: "O arquivo está vazio." };
  }
  if (size < system.minSizeBytes) {
    return { kind: "too-small", message: "O arquivo é pequeno demais para ser um jogo válido." };
  }
  if (size > system.maxSizeBytes) {
    const mb = Math.round(system.maxSizeBytes / 1024 / 1024);
    return { kind: "too-large", message: `O arquivo é grande demais (máximo ${mb} MB para ${system.shortLabel}).` };
  }
  return null;
}

/** Friendly PT-BR name for a KeyboardEvent.keyCode. */
export function keyCodeLabel(code: number | undefined): string {
  if (code === undefined || code === 0) return "(nenhuma)";
  const named: Record<number, string> = {
    8: "Backspace",
    9: "Tab",
    13: "Enter",
    16: "Shift",
    17: "Ctrl",
    18: "Alt",
    27: "Esc",
    32: "Espaço",
    37: "Seta ←",
    38: "Seta ↑",
    39: "Seta →",
    40: "Seta ↓",
    186: "Ç / ;",
    188: ",",
    190: ".",
    191: "/",
  };
  if (named[code]) return named[code];
  if (code >= 65 && code <= 90) return String.fromCharCode(code);
  if (code >= 48 && code <= 57) return String.fromCharCode(code);
  if (code >= 96 && code <= 105) return `Num ${code - 96}`;
  if (code >= 112 && code <= 123) return `F${code - 111}`;
  return `Tecla ${code}`;
}
