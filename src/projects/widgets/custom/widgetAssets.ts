import { invoke } from "@tauri-apps/api/core";

/** Images saved inside a gadget are referenced in its code as pmm-asset://name. */
export const ASSET_SCHEME = "pmm-asset://";
const ASSET_REF = /pmm-asset:\/\/([a-z0-9-]+)/gi;
const LINK = /https?:\/\/[^\s"'<>()]+/gi;
const MAX_LINKS = 3;
const MAX_SIDE = 960;
const KEEP_GIF_BELOW = 2_000_000;

export function findLinks(text: string): string[] {
  const found = (text.match(LINK) || []).map((u) => u.replace(/[.,;!?]+$/, ""));
  return Array.from(new Set(found)).slice(0, MAX_LINKS);
}

export function resolveAssetRefs(code: string, assets?: Record<string, string>): string {
  if (!code || !assets) return code;
  return code.replace(ASSET_REF, (ref, name: string) => assets[name.toLowerCase()] ?? ref);
}

export function nextAssetName(existing: Record<string, string> | undefined, taken: string[] = []): string {
  const used = new Set([...Object.keys(existing || {}), ...taken]);
  let n = 1;
  while (used.has(`imagem-${n}`)) n++;
  return `imagem-${n}`;
}

/** Large wallpapers would fill the saved-data quota: keep at most ~960px, as WebP (keeps transparency). */
export function shrinkImage(dataUrl: string): Promise<string> {
  if (dataUrl.startsWith("data:image/gif") && dataUrl.length < KEEP_GIF_BELOW) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL("image/webp", 0.86);
      resolve(out.startsWith("data:image/webp") && out.length < dataUrl.length ? out : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export interface ImportedImages {
  /** The message with each downloaded link swapped for its pmm-asset:// address. */
  text: string;
  assets: Record<string, string>;
  /** First downloaded image, to show the AI what it looks like. */
  preview?: string;
}

/** Downloads image links found in a chat message. Links that aren't images are left as they are. */
export async function importImageLinks(text: string, existing?: Record<string, string>): Promise<ImportedImages> {
  const assets: Record<string, string> = {};
  let out = text;
  let preview: string | undefined;
  for (const url of findLinks(text)) {
    try {
      const raw = await invoke<string>("widget_fetch_image", { url });
      const data = await shrinkImage(raw);
      const name = nextAssetName(existing, Object.keys(assets));
      assets[name] = data;
      preview ??= data;
      out = out.split(url).join(`${ASSET_SCHEME}${name}`);
    } catch {
      // Not an image (or offline): the AI still gets the link as text.
    }
  }
  return { text: out, assets, preview };
}
