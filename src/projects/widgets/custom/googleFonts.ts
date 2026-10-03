/**
 * Google Fonts (CSS API v2: https://fonts.googleapis.com/css2). Gadgets list fonts in the manifest
 * ("Nunito:wght@500;800") and the sandbox loads them with <link>, which also works when the gadget
 * CSS is placed after other rules (where an @import would be silently ignored).
 */
export const GOOGLE_FONTS_CSS2 = "https://fonts.googleapis.com/css2";

const IMPORT_RULE = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1\s*\)?[^;]*;/gi;

/** Puts one family spec in the form css2 accepts: axes in alphabetical order, tuples sorted, no overlaps. */
export function normalizeFontSpec(raw: string): string | null {
  const spec = raw.trim().replace(/\+/g, " ");
  const [namePart, axesPart] = spec.split(":", 2);
  const name = namePart.trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z0-9 ]{2,60}$/.test(name)) return null;
  const family = name.replace(/ /g, "+");
  if (!axesPart) return family;

  const [tagList, tupleList] = axesPart.split("@", 2);
  const tags = tagList.split(",").map((t) => t.trim()).filter(Boolean);
  if (!tupleList || tags.length === 0 || !tags.every((t) => /^[a-zA-Z]{4}$/.test(t))) return family;

  const order = tags.map((t, i) => ({ t, i })).sort((a, b) => a.t.localeCompare(b.t, "en-US"));
  const tuples = tupleList
    .split(";")
    .map((tuple) => tuple.split(",").map((v) => v.trim()))
    .filter((vals) => vals.length === tags.length && vals.every((v) => /^\d+(\.\d+)?(\.\.\d+(\.\d+)?)?$/.test(v)))
    .map((vals) => order.map(({ i }) => vals[i]));
  if (tuples.length === 0) return family;

  const start = (v: string) => parseFloat(v.split("..")[0]);
  tuples.sort((a, b) => {
    for (let k = 0; k < a.length; k++) {
      const d = start(a[k]) - start(b[k]);
      if (d !== 0) return d;
    }
    return 0;
  });
  const unique = Array.from(new Set(tuples.map((vals) => vals.join(","))));
  return `${family}:${order.map(({ t }) => t).join(",")}@${unique.join(";")}`;
}

export function buildGoogleFontsUrl(specs: string[]): string | null {
  const families = Array.from(
    new Set(specs.map(normalizeFontSpec).filter((s): s is string => !!s))
  ).slice(0, 6);
  if (families.length === 0) return null;
  return `${GOOGLE_FONTS_CSS2}?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}

/** Splits @import rules out of a stylesheet so they can be loaded as <link> tags. */
export function extractCssImports(css: string): { imports: string[]; css: string } {
  const imports: string[] = [];
  const rest = (css || "").replace(IMPORT_RULE, (_rule, _q, url: string) => {
    if (/^https:\/\//i.test(url)) imports.push(url);
    return "";
  });
  return { imports, css: rest };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** <link> tags for the gadget's fonts and any stylesheet it tried to @import. */
export function fontLinkTags(fonts: string[] | undefined, imports: string[]): string {
  const urls = [buildGoogleFontsUrl(fonts || []), ...imports].filter((u): u is string => !!u);
  const unique = Array.from(new Set(urls));
  if (unique.length === 0) return "";
  const usesGoogle = unique.some((u) => u.startsWith("https://fonts.googleapis.com/"));
  return [
    usesGoogle ? '<link rel="preconnect" href="https://fonts.googleapis.com" />' : "",
    usesGoogle ? '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' : "",
    ...unique.map((u) => `<link rel="stylesheet" href="${escapeAttr(u)}" />`),
  ]
    .filter(Boolean)
    .join("\n  ");
}
