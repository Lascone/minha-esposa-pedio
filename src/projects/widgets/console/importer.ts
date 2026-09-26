import * as service from "./consoleService";
import { applyPatch, PatchError, PatchResult, sha1Hex } from "./patcher";
import { checkSuperMarioWorld, SmwCheck } from "./smw";
import { ConsoleSystem, fileExtension, validateRomBasics } from "./systems";
import { ConsoleGame, DEFAULT_PREFS } from "./types";

export const PATCH_EXTENSIONS = [".ips", ".bps", ".ups"];
export const COVER_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
export const MAX_COVER_BYTES = 2 * 1024 * 1024;
export const MAX_PATCH_BYTES = 16 * 1024 * 1024;

export async function readBrowserFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export interface InspectedRom {
  fileName: string;
  ext: string;
  bytes: Uint8Array;
  sha1: string;
  smw: SmwCheck | null;
}

export async function inspectRom(file: File, system: ConsoleSystem, checkSmw = false): Promise<InspectedRom> {
  const basic = validateRomBasics(system, file.name, file.size);
  if (basic) throw new Error(basic.message);
  const bytes = await readBrowserFile(file);
  return {
    fileName: file.name,
    ext: fileExtension(file.name),
    bytes,
    sha1: await sha1Hex(bytes),
    smw: checkSmw ? checkSuperMarioWorld(bytes) : null,
  };
}

export interface InspectedPatch {
  fileName: string;
  ext: string;
  bytes: Uint8Array;
  sha1: string;
  result: PatchResult;
  patchedSha1: string;
}

export async function inspectPatch(file: File, rom: InspectedRom): Promise<InspectedPatch> {
  const ext = fileExtension(file.name);
  if (!PATCH_EXTENSIONS.includes(ext)) {
    throw new Error(`"${file.name}" não é um patch suportado. Use .ips, .bps ou .ups.`);
  }
  if (file.size === 0) throw new Error("O arquivo de patch está vazio.");
  if (file.size > MAX_PATCH_BYTES) throw new Error("O arquivo de patch é grande demais.");
  const bytes = await readBrowserFile(file);
  let result: PatchResult;
  try {
    result = applyPatch(rom.bytes, bytes);
  } catch (e) {
    throw new Error(e instanceof PatchError ? e.message : `Falha ao aplicar o patch: ${String(e)}`);
  }
  return { fileName: file.name, ext, bytes, sha1: await sha1Hex(bytes), result, patchedSha1: await sha1Hex(result.output) };
}

export interface InspectedCover {
  ext: string;
  mime: string;
  bytes: Uint8Array;
  sha1: string;
}

export async function inspectCover(file: File): Promise<InspectedCover> {
  const ext = fileExtension(file.name);
  if (!COVER_EXTENSIONS.includes(ext)) throw new Error("A capa precisa ser uma imagem PNG, JPG, WEBP ou GIF.");
  if (file.size === 0) throw new Error("A imagem da capa está vazia.");
  if (file.size > MAX_COVER_BYTES) throw new Error("A capa é grande demais (máximo 2 MB).");
  const bytes = await readBrowserFile(file);
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : `image/${ext.slice(1)}`;
  return { ext, mime, bytes, sha1: await sha1Hex(bytes) };
}

export function findDuplicateRom(games: ConsoleGame[], romSha1: string, exceptId?: string): ConsoleGame | undefined {
  return games.find((g) => g.id !== exceptId && g.romSha1 === romSha1);
}

export function newGameId(romSha1: string, games: ConsoleGame[]): string {
  let id = `g-${romSha1.slice(0, 10)}`;
  let n = 2;
  while (games.some((g) => g.id === id)) id = `g-${romSha1.slice(0, 10)}-${n++}`;
  return id;
}

export interface CommitInput {
  base: ConsoleGame;
  name: string;
  rom?: InspectedRom;
  /** `null` removes an existing patch; `undefined` keeps it. */
  patch?: InspectedPatch | null;
  translatedPtBr?: boolean;
  /** `null` removes the cover; `undefined` keeps it. */
  cover?: InspectedCover | null;
  keys?: Record<number, number>;
}

/** Copies files into the private app folder and returns the updated game record. */
export async function commitGame(input: CommitInput): Promise<ConsoleGame> {
  const game: ConsoleGame = {
    ...input.base,
    name: input.name.trim() || input.base.name,
    prefs: input.base.prefs || DEFAULT_PREFS,
    createdAt: input.base.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  if (input.rom) {
    await service.storeFile(input.rom.bytes, input.rom.sha1, input.rom.ext);
    game.romSha1 = input.rom.sha1;
    game.romExt = input.rom.ext;
    game.romFileName = input.rom.fileName;
    game.romSize = input.rom.bytes.length;
    if (input.patch === undefined && input.base.romSha1 !== input.rom.sha1) {
      // A patch made for the previous file may not fit the new one.
      input.patch = null;
    }
  }

  if (input.patch === null) {
    delete game.patchSha1;
    delete game.patchFormat;
    delete game.patchFileName;
    delete game.patchedSha1;
    // The file itself may already be a translated dump.
    game.translatedPtBr = input.translatedPtBr ?? false;
  } else if (input.patch) {
    await service.storeFile(input.patch.bytes, input.patch.sha1, input.patch.ext);
    await service.storeFile(input.patch.result.output, input.patch.patchedSha1, game.romExt || ".sfc");
    game.patchSha1 = input.patch.sha1;
    game.patchFormat = input.patch.result.format;
    game.patchFileName = input.patch.fileName;
    game.patchedSha1 = input.patch.patchedSha1;
    game.translatedPtBr = input.translatedPtBr ?? true;
  } else if (input.translatedPtBr !== undefined) {
    game.translatedPtBr = input.translatedPtBr;
  }

  if (input.cover === null) {
    delete game.coverSha1;
    delete game.coverMime;
  } else if (input.cover) {
    await service.storeFile(input.cover.bytes, input.cover.sha1, input.cover.ext);
    game.coverSha1 = input.cover.sha1;
    game.coverMime = input.cover.mime;
  }

  if (input.keys) game.keys = input.keys;
  return game;
}
