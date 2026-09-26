import { describe, it, expect } from "vitest";
import {
  applyBps,
  applyIps,
  applyPatch,
  applyUps,
  crc32,
  detectPatchFormat,
  PatchError,
  readSnesHeader,
  sha1Hex,
} from "../src/projects/widgets/console/patcher";
import { checkSuperMarioWorld, looksLikePtBrDump, suggestGameName } from "../src/projects/widgets/console/smw";
import { getSystem, keyCodeLabel, validateRomBasics } from "../src/projects/widgets/console/systems";
import {
  CONSOLE_SNES_TYPE,
  ConsoleGame,
  consoleCardAction,
  consoleWidgetGameId,
  DEFAULT_PREFS,
  gameIdFromWidgetType,
  isConsoleWidgetType,
  migrateConsoleWidget,
  playableSha1,
  sanitizeLibrary,
} from "../src/projects/widgets/console/types";
import { migrateWidgetsState } from "../src/projects/widgets/store/widgetsStore";
import { findDuplicateRom, newGameId } from "../src/projects/widgets/console/importer";

const enc = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));

function varint(n: number): number[] {
  const out: number[] = [];
  for (;;) {
    const x = n & 0x7f;
    n = Math.floor(n / 128);
    if (n === 0) {
      out.push(0x80 | x);
      break;
    }
    out.push(x);
    n--;
  }
  return out;
}

function u32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

function withFooter(body: number[], src: Uint8Array, dst: Uint8Array): Uint8Array {
  const head = new Uint8Array([...body, ...u32(crc32(src)), ...u32(crc32(dst))]);
  return new Uint8Array([...head, ...u32(crc32(head))]);
}

function makeUps(src: Uint8Array, dst: Uint8Array): Uint8Array {
  const body = [...enc("UPS1"), ...varint(src.length), ...varint(dst.length)];
  let last = 0;
  let i = 0;
  while (i < dst.length) {
    if ((src[i] ?? 0) === dst[i]) {
      i++;
      continue;
    }
    body.push(...varint(i - last));
    while (i < dst.length && (src[i] ?? 0) !== dst[i]) {
      body.push((src[i] ?? 0) ^ dst[i]);
      i++;
    }
    body.push(0);
    i++;
    last = i;
  }
  return withFooter(body, src, dst);
}

function makeBps(src: Uint8Array, dst: Uint8Array, keep: number): Uint8Array {
  const body = [...enc("BPS1"), ...varint(src.length), ...varint(dst.length), ...varint(0)];
  body.push(...varint(((keep - 1) << 2) | 0));
  const rest = dst.length - keep;
  body.push(...varint(((rest - 1) << 2) | 1), ...dst.slice(keep));
  return withFooter(body, src, dst);
}

/** Minimal 512 KB LoROM image with an internal header. */
function makeSnesRom(title: string, validChecksum = true): Uint8Array {
  const rom = new Uint8Array(512 * 1024);
  for (let i = 0; i < rom.length; i++) rom[i] = (i * 7) & 0xff;
  const base = 0x7fc0;
  const padded = title.padEnd(21, " ");
  for (let i = 0; i < 21; i++) rom[base + i] = padded.charCodeAt(i);
  const checksum = 0x1234;
  const complement = validChecksum ? checksum ^ 0xffff : 0x0000;
  rom[base + 0x1c] = complement & 0xff;
  rom[base + 0x1d] = complement >> 8;
  rom[base + 0x1e] = checksum & 0xff;
  rom[base + 0x1f] = checksum >> 8;
  return rom;
}

function addCopierHeader(rom: Uint8Array): Uint8Array {
  const out = new Uint8Array(rom.length + 512);
  out.set(rom, 512);
  return out;
}

describe("Mini console: checksums", () => {
  it("computes the standard CRC32 check value", () => {
    expect(crc32(new Uint8Array(enc("123456789")))).toBe(0xcbf43926);
  });

  it("computes SHA-1 hex digests", async () => {
    expect(await sha1Hex(new Uint8Array(enc("abc")))).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });
});

describe("Mini console: patches", () => {
  it("detects patch formats by magic", () => {
    expect(detectPatchFormat(new Uint8Array(enc("PATCHxx")))).toBe("ips");
    expect(detectPatchFormat(new Uint8Array(enc("UPS1...")))).toBe("ups");
    expect(detectPatchFormat(new Uint8Array(enc("BPS1...")))).toBe("bps");
    expect(detectPatchFormat(new Uint8Array(enc("hello")))).toBeNull();
  });

  it("applies IPS records, RLE and growth without touching the original", () => {
    const rom = new Uint8Array([1, 2, 3, 4]);
    const patch = new Uint8Array([
      ...enc("PATCH"),
      0, 0, 1, 0, 2, 9, 9, // offset 1, size 2: [9, 9]
      0, 0, 5, 0, 0, 0, 3, 7, // offset 5, RLE 3 x 7
      ...enc("EOF"),
    ]);
    const out = applyIps(rom, patch);
    expect(Array.from(out)).toEqual([1, 9, 9, 4, 0, 7, 7, 7]);
    expect(Array.from(rom)).toEqual([1, 2, 3, 4]);
  });

  it("rejects IPS without EOF", () => {
    expect(() => applyIps(new Uint8Array(4), new Uint8Array([...enc("PATCH"), 0, 0, 0, 0, 1, 5]))).toThrow(PatchError);
  });

  it("applies UPS and validates the source CRC32", () => {
    const src = makeSnesRom("ORIGINAL");
    const dst = makeSnesRom("TRADUZIDO");
    const patch = makeUps(src, dst);
    expect(Array.from(applyUps(src, patch).slice(0x7fc0, 0x7fc9))).toEqual(enc("TRADUZIDO"));
    expect(() => applyUps(makeSnesRom("OUTRO JOGO"), patch)).toThrow(/não é compatível/);
  });

  it("applies BPS (source read + target read)", () => {
    const src = makeSnesRom("ORIGINAL");
    const dst = makeSnesRom("ORIGINAL");
    dst.set(enc("NOVO FINAL"), dst.length - 10);
    const out = applyBps(src, makeBps(src, dst, dst.length - 10));
    expect(crc32(out)).toBe(crc32(dst));
  });

  it("detects a corrupted checksummed patch", () => {
    const src = makeSnesRom("A");
    const patch = makeUps(src, makeSnesRom("B"));
    patch[6] ^= 0xff;
    expect(() => applyPatch(src, patch)).toThrow(/corrompido/);
  });

  it("matches BPS/UPS against a headered ROM by stripping the copier header", () => {
    const src = makeSnesRom("ORIGINAL");
    const dst = makeSnesRom("PT-BR");
    const res = applyPatch(addCopierHeader(src), makeUps(src, dst));
    expect(res.adjustedHeader).toBe(true);
    expect(crc32(res.output)).toBe(crc32(dst));
  });

  it("picks the IPS variant that yields a valid SNES header", () => {
    const src = makeSnesRom("ORIGINAL", false);
    // Patch written for the headerless ROM that fixes the checksum complement.
    const fixed = 0x1234 ^ 0xffff;
    const patch = new Uint8Array([...enc("PATCH"), 0x00, 0x7f, 0xdc, 0, 2, fixed & 0xff, fixed >> 8, ...enc("EOF")]);
    const res = applyPatch(addCopierHeader(src), patch);
    expect(res.adjustedHeader).toBe(true);
    expect(res.output.length).toBe(src.length);
    expect(readSnesHeader(res.output)?.checksumValid).toBe(true);
  });

  it("warns when an IPS result cannot be confirmed", () => {
    const src = makeSnesRom("ORIGINAL", false);
    const patch = new Uint8Array([...enc("PATCH"), 0, 0, 0, 0, 1, 0x42, ...enc("EOF")]);
    const res = applyPatch(src, patch);
    expect(res.warnings.length).toBe(1);
  });
});

describe("Mini console: Super Mario World detection", () => {
  it("recognizes the SMW internal title (with or without copier header)", () => {
    const rom = makeSnesRom("SUPER MARIOWORLD");
    expect(checkSuperMarioWorld(rom).isSmw).toBe(true);
    expect(checkSuperMarioWorld(addCopierHeader(rom)).isSmw).toBe(true);
    expect(checkSuperMarioWorld(rom).knownDump).toBeNull();
  });

  it("flags other games", () => {
    const res = checkSuperMarioWorld(makeSnesRom("DONKEY KONG COUNTRY"));
    expect(res.isSmw).toBe(false);
    expect(res.message).toContain("DONKEY KONG COUNTRY");
  });

  it("explains titles rewritten by translation sites instead of calling them another game", () => {
    const res = checkSuperMarioWorld(makeSnesRom("SNESFOREVER.COM.BR"));
    expect(res.isSmw).toBe(false);
    expect(res.message).toContain("Usar mesmo assim");
    expect(res.message).not.toContain("não Super Mario World");
  });

  it("guesses already-translated dumps from file name or title", () => {
    expect(looksLikePtBrDump("Super Mundo Mario (BR) (www.romsportugues.com).smc")).toBe(true);
    expect(looksLikePtBrDump("Super Mario World.sfc", "SNESFOREVER.COM.BR")).toBe(true);
    expect(looksLikePtBrDump("smw-traduzido.sfc")).toBe(true);
    expect(looksLikePtBrDump("Super Mario World (USA).sfc", "SUPER MARIOWORLD")).toBe(false);
  });
});

describe("Mini console: file validation", () => {
  const snes = getSystem("snes")!;

  it("accepts .sfc/.smc within limits", () => {
    expect(validateRomBasics(snes, "Mario.SFC", 512 * 1024)).toBeNull();
    expect(validateRomBasics(snes, "mario.smc", 512 * 1024 + 512)).toBeNull();
  });

  it("rejects wrong extension, empty and oversize files with clear messages", () => {
    expect(validateRomBasics(snes, "mario.zip", 1000)?.kind).toBe("extension");
    expect(validateRomBasics(snes, "mario.sfc", 0)?.kind).toBe("empty");
    expect(validateRomBasics(snes, "mario.sfc", 1000)?.kind).toBe("too-small");
    expect(validateRomBasics(snes, "mario.sfc", 20 * 1024 * 1024)?.kind).toBe("too-large");
  });

  it("labels keys in PT-BR", () => {
    expect(keyCodeLabel(32)).toBe("Espaço");
    expect(keyCodeLabel(88)).toBe("X");
    expect(keyCodeLabel(undefined)).toBe("(nenhuma)");
  });

  it("has a default key for every SNES button", () => {
    for (const b of snes.buttons) expect(snes.defaultKeys[b.index]).toBeGreaterThan(0);
    expect(new Set(Object.values(snes.defaultKeys)).size).toBe(snes.buttons.length);
  });
});

const baseGame: ConsoleGame = {
  id: "g-aaaaaaaaaa",
  name: "Jogo",
  system: "snes",
  isBuiltin: false,
  translatedPtBr: false,
  prefs: DEFAULT_PREFS,
  createdAt: 0,
  updatedAt: 0,
};

describe("Mini console: library", () => {
  it("ships with no games: an empty library stays empty", () => {
    expect(sanitizeLibrary({ games: [] })).toEqual([]);
    expect(sanitizeLibrary(null)).toEqual([]);
  });

  it("drops the old unconfigured Super Mario World placeholder but keeps a configured one as a normal game", () => {
    const placeholder = { id: "smw", name: "Super Mario World", system: "snes" };
    expect(sanitizeLibrary({ games: [placeholder] })).toEqual([]);
    const kept = sanitizeLibrary({ games: [{ ...placeholder, romSha1: "a".repeat(40), isBuiltin: true }] });
    expect(kept).toHaveLength(1);
    expect(kept[0].isBuiltin).toBe(false);
  });

  it("holds any number of games", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...baseGame, id: `g-${i}`, name: `Jogo ${i}`, romSha1: String(i).padStart(40, "0") }));
    expect(sanitizeLibrary({ games: many })).toHaveLength(12);
  });

  it("reports Jogar once a ROM is stored and prefers the patched copy", () => {
    expect(consoleCardAction(baseGame)).toBe("configurar");
    expect(consoleCardAction({ ...baseGame, romSha1: "a".repeat(40) })).toBe("jogar");
    expect(playableSha1({ ...baseGame, romSha1: "a".repeat(40), patchedSha1: "b".repeat(40) })).toBe("b".repeat(40));
  });

  it("sanitizes the stored library", () => {
    const games = sanitizeLibrary({ games: [{ id: "g-1", name: "Jogo", romSha1: "d".repeat(40), prefs: { volume: 0.2 } }, { bad: true }] });
    expect(games).toHaveLength(1);
    expect(games[0].prefs).toEqual({ volume: 0.2, muted: false, slot: 1 });
  });

  it("suggests friendly names", () => {
    expect(suggestGameName("Donkey_Kong_Country (USA).sfc", null)).toBe("Donkey Kong Country");
    expect(suggestGameName("qualquer.smc", { isSmw: true, knownDump: null, title: "SUPER MARIOWORLD", message: "" })).toBe("Super Mario World");
  });

  it("detects duplicate imports and creates unique ids", () => {
    const sha = "c".repeat(40);
    const games = [{ ...baseGame, id: "g-cccccccccc", name: "Jogo X", romSha1: sha }];
    expect(findDuplicateRom(games, sha)?.name).toBe("Jogo X");
    expect(findDuplicateRom(games, sha, "g-cccccccccc")).toBeUndefined();
    expect(newGameId(sha, games)).toBe("g-cccccccccc-2");
  });
});

describe("Mini console: single SNES widget", () => {
  it("recognizes the new and legacy console widget types", () => {
    expect(isConsoleWidgetType(CONSOLE_SNES_TYPE)).toBe(true);
    expect(isConsoleWidgetType("console-game-smw")).toBe(true);
    expect(isConsoleWidgetType("analog-clock")).toBe(false);
    expect(gameIdFromWidgetType("console-game-g-abc")).toBe("g-abc");
  });

  it("reads the selected game from settings, falling back to the legacy type", () => {
    expect(consoleWidgetGameId({ type: CONSOLE_SNES_TYPE, settings: { gameId: "g-1" } })).toBe("g-1");
    expect(consoleWidgetGameId({ type: CONSOLE_SNES_TYPE, settings: {} })).toBeNull();
    expect(consoleWidgetGameId({ type: "console-game-smw" })).toBe("smw");
  });

  it("migrates per-game widgets into one console-snes widget", () => {
    const state = migrateWidgetsState(
      {
        activeWidgets: [
          { id: "a", type: "console-game-smw", visible: false, settings: {} },
          { id: "b", type: "console-game-g-1", visible: true, settings: {} },
          { id: "c", type: "analog-clock", visible: true, settings: {} },
        ],
      },
      2
    );
    expect(state.activeWidgets.map((w: any) => w.id)).toEqual(["b", "c"]);
    expect(state.activeWidgets[0]).toMatchObject({ type: CONSOLE_SNES_TYPE, settings: { gameId: "g-1" } });
    expect(migrateConsoleWidget({ type: "analog-clock" })).toEqual({ type: "analog-clock" });
  });
});
