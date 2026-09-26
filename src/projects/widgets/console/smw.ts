import { crc32, readSnesHeader, stripCopierHeader } from "./patcher";

/** Headerless CRC32 of the retail Super Mario World (USA) dump; other regions are matched by title. */
const KNOWN_SMW_CRC32: Record<number, string> = {
  0xb19ed489: "Super Mario World (EUA)",
};

export interface SmwCheck {
  isSmw: boolean;
  knownDump: string | null;
  title: string;
  message: string;
}

export function checkSuperMarioWorld(rom: Uint8Array): SmwCheck {
  const header = readSnesHeader(rom);
  const title = header?.title ?? "";
  const crc = crc32(stripCopierHeader(rom));
  const knownDump = KNOWN_SMW_CRC32[crc] ?? null;
  const titleMatches = title.replace(/\s/g, "").toUpperCase() === "SUPERMARIOWORLD";

  if (knownDump) {
    return { isSmw: true, knownDump, title, message: `Reconhecido: ${knownDump}.` };
  }
  if (titleMatches) {
    return {
      isSmw: true,
      knownDump: null,
      title,
      message: "Parece ser Super Mario World, mas não é uma versão original conhecida (pode ser modificada).",
    };
  }
  if (title && /\.COM|\.BR|WWW|ROMS?\b/i.test(title)) {
    return {
      isSmw: false,
      knownDump: null,
      title,
      message: `O título interno foi trocado por "${title}" (comum em versões traduzidas/modificadas por sites). Se este é o seu Super Mario World, marque "Usar mesmo assim".`,
    };
  }
  return {
    isSmw: false,
    knownDump: null,
    title,
    message: title
      ? `Este arquivo parece ser "${title}", não Super Mario World.`
      : "Não consegui identificar este arquivo como Super Mario World.",
  };
}

/** Friendly default name: "Super Mario World" when recognized, otherwise the file name without tags like "(BR)". */
export function suggestGameName(fileName: string, check: SmwCheck | null): string {
  if (check?.isSmw) return "Super Mario World";
  const clean = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[([][^)\]]*[)\]]/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || fileName).slice(0, 60);
}

/** Hint that a dump is already translated to Portuguese, from its file name or internal title. */
export function looksLikePtBrDump(fileName: string, title = ""): boolean {
  const text = `${fileName} ${title}`;
  return /\((BR|PT-?BR|PT)\)|\[(BR|PT-?BR)\]|pt-?br|portugu[eê]s|traduzid|tradu[cç][aã]o|\.com\.br|romsportugues/i.test(text);
}
