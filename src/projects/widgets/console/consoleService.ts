import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ConsoleGame, ConsoleLibraryFile } from "./types";

export const LIBRARY_EVENT = "console-library-changed";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface StoredFile {
  sha1: string;
  size: number;
  already_existed: boolean;
}

export interface SaveEntry {
  name: string;
  size: number;
  modified_ms: number;
}

export function storeFile(bytes: Uint8Array, sha1: string, ext: string): Promise<StoredFile> {
  return invoke<StoredFile>("console_store_file", bytes, {
    headers: { "x-sha1": sha1, "x-ext": ext.replace(/^\./, "").toLowerCase() },
  });
}

export async function readFile(sha1: string): Promise<Uint8Array> {
  const buf = await invoke<ArrayBuffer>("console_read_file", { sha1 });
  return new Uint8Array(buf);
}

export function fileExists(sha1: string): Promise<boolean> {
  return invoke<boolean>("console_file_exists", { sha1 });
}

export function getLibrary(): Promise<unknown> {
  return invoke("console_library_get");
}

export function saveLibrary(games: ConsoleGame[]): Promise<void> {
  const library: ConsoleLibraryFile = { version: 1, games };
  return invoke("console_library_save", { library });
}

export function removeGameData(gameId: string, orphanFiles: string[]): Promise<void> {
  return invoke("console_remove_game", { gameId, orphanFiles });
}

export function writeSave(gameId: string, name: string, bytes: Uint8Array): Promise<void> {
  return invoke("console_write_save", bytes, { headers: { "x-game-id": gameId, "x-name": name } });
}

export async function readSave(gameId: string, name: string): Promise<Uint8Array | null> {
  try {
    const buf = await invoke<ArrayBuffer>("console_read_save", { gameId, name });
    return new Uint8Array(buf);
  } catch (e) {
    if (String(e).includes("NOT_FOUND")) return null;
    throw e;
  }
}

export function listSaves(gameId: string): Promise<SaveEntry[]> {
  return invoke<SaveEntry[]>("console_list_saves", { gameId });
}

export function deleteSave(gameId: string, name: string): Promise<void> {
  return invoke("console_delete_save", { gameId, name });
}

export function getDataDir(): Promise<string> {
  return invoke<string>("console_get_data_dir");
}

export function onLibraryChanged(cb: () => void): Promise<UnlistenFn> {
  return listen(LIBRARY_EVENT, cb);
}
