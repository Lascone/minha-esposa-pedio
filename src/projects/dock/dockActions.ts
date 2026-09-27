import { dockService } from "./dockService";
import { useDockStore } from "./store/dockStore";

/** Resolves dropped/picked paths (shortcuts, apps, files, folders) and pins them. */
export async function addPathsToDock(paths: string[], index?: number): Promise<number> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return 0;
  const resolved = await Promise.all(unique.map((p) => dockService.resolveItem(p).catch(() => null)));
  return useDockStore.getState().addItems(resolved.filter((r): r is NonNullable<typeof r> => !!r && r.kind !== "missing"), index);
}

export async function pickAndAddToDock(kind: "files" | "folder"): Promise<number> {
  const paths = await dockService.pickItems(kind);
  return addPathsToDock(paths);
}

function downscale(dataUrl: string, max = 128): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, max / Math.max(img.width || max, img.height || max));
      const w = Math.max(1, Math.round((img.width || max) * ratio));
      const h = Math.max(1, Math.round((img.height || max) * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Lets the user choose an image, .ico or .exe as an icon; returns a small PNG data URL. */
export async function pickCustomIcon(): Promise<string | null> {
  const [path] = await dockService.pickItems("icon");
  if (!path) return null;
  const lower = path.toLowerCase();
  const raw = /\.(ico|exe|dll)$/.test(lower) ? await dockService.getIcon(path) : await dockService.readImage(path);
  return downscale(raw);
}
