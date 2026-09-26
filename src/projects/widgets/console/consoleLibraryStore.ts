import { create } from "zustand";
import * as service from "./consoleService";
import { ConsoleGame, ConsoleGamePrefs, sanitizeLibrary } from "./types";

interface ConsoleLibraryState {
  games: ConsoleGame[];
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  upsertGame: (game: ConsoleGame) => Promise<void>;
  updateGame: (id: string, patch: Partial<ConsoleGame>) => Promise<void>;
  updatePrefs: (id: string, prefs: Partial<ConsoleGamePrefs>) => Promise<void>;
  removeGame: (id: string) => Promise<void>;
}

async function readDiskGames(): Promise<ConsoleGame[]> {
  return sanitizeLibrary(await service.getLibrary());
}

function referencedFiles(game: ConsoleGame): string[] {
  return [game.romSha1, game.patchSha1, game.patchedSha1, game.coverSha1].filter(Boolean) as string[];
}

export const useConsoleLibraryStore = create<ConsoleLibraryState>()((set, get) => ({
  games: [],
  loaded: false,
  error: null,

  load: async () => {
    if (!service.isTauriRuntime()) {
      set({ games: [], loaded: true, error: "O mini console só funciona no aplicativo instalado." });
      return;
    }
    try {
      const games = await readDiskGames();
      set({ games: games, loaded: true, error: null });
    } catch (e) {
      set({ loaded: true, error: `Não foi possível ler a biblioteca de jogos: ${String(e)}` });
    }
  },

  // Always re-read from disk before writing: other windows may have changed the library.
  upsertGame: async (game) => {
    const games = await readDiskGames();
    const next = games.some((g) => g.id === game.id)
      ? games.map((g) => (g.id === game.id ? { ...game, updatedAt: Date.now() } : g))
      : [...games, { ...game, updatedAt: Date.now() }];
    await service.saveLibrary(next);
    set({ games: next });
  },

  updateGame: async (id, patch) => {
    const games = await readDiskGames();
    const current = games.find((g) => g.id === id);
    if (!current) return;
    await get().upsertGame({ ...current, ...patch });
  },

  updatePrefs: async (id, prefs) => {
    const games = await readDiskGames();
    const current = games.find((g) => g.id === id);
    if (!current) return;
    await get().upsertGame({ ...current, prefs: { ...current.prefs, ...prefs } });
  },

  removeGame: async (id) => {
    const games = await readDiskGames();
    const target = games.find((g) => g.id === id);
    const rest = games.filter((g) => g.id !== id);
    const stillUsed = new Set(rest.flatMap(referencedFiles));
    const orphans = target ? referencedFiles(target).filter((sha) => !stillUsed.has(sha)) : [];
    await service.saveLibrary(rest);
    await service.removeGameData(id, orphans);
    set({ games: rest });
  },
}));

let syncStarted = false;

/** Loads the library once and keeps it in sync with changes made by other windows. */
export function initConsoleLibrarySync(): void {
  if (syncStarted) return;
  syncStarted = true;
  const { load } = useConsoleLibraryStore.getState();
  load();
  if (service.isTauriRuntime()) {
    service.onLibraryChanged(() => useConsoleLibraryStore.getState().load()).catch(() => {});
  }
}
