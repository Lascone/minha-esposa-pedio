import { useEffect, useState } from "react";
import { isTauriRuntime, listSaves, readFile, readSave } from "./consoleService";

const cache = new Map<string, Promise<string>>();

/** Object URL for a stored cover image (cached per window). */
export function useCoverUrl(sha1: string | undefined, mime: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sha1) {
      setUrl(null);
      return;
    }
    let alive = true;
    let pending = cache.get(sha1);
    if (!pending) {
      pending = readFile(sha1).then((bytes) =>
        URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: mime || "image/png" }))
      );
      pending.catch(() => cache.delete(sha1));
      cache.set(sha1, pending);
    }
    pending.then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [sha1, mime]);

  return url;
}

/** Object URL for the thumbnail of the most recent save state, or null if the game has none. */
export function useLastStateShot(gameId: string, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isTauriRuntime()) {
      setUrl(null);
      return;
    }
    let alive = true;
    let created: string | null = null;
    (async () => {
      const saves = await listSaves(gameId);
      const latest = saves
        .filter((s) => /^state-\d+\.png$/.test(s.name))
        .sort((a, b) => b.modified_ms - a.modified_ms)[0];
      if (!latest) return;
      const bytes = await readSave(gameId, latest.name);
      if (!bytes || !alive) return;
      created = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "image/png" }));
      setUrl(created);
    })().catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [gameId, enabled]);

  return url;
}
