import { beforeEach, describe, expect, it } from "vitest";
import {
  buildSlots,
  computeDockLayout,
  contentLength,
  groupEntries,
  isPinnedSlot,
  trayWindowRect,
  appLetter,
  searchByName,
  startMenuRect,
  itemExe,
  magnifyScale,
  matchWindows,
  moveEntry,
  nextWindow,
  pickMonitor,
  removeEntry,
  revealStrip,
  shouldHide,
  takeOutOfGroup,
  ungroup,
  updateItem,
} from "../src/projects/dock/logic";
import {
  BUILTIN_THEMES,
  contrastText,
  DEFAULT_APPEARANCE,
  hexToRgba,
  MACOS_LAYOUT,
  MACOS_THEME_ID,
  pickThemeFields,
  THEME_FIELDS,
  WIN11_LAYOUT,
  WIN11_THEME_ID,
} from "../src/projects/dock/themes";
import { DEFAULT_BEHAVIOR, useDockStore } from "../src/projects/dock/store/dockStore";
import { DockEntry, DockLaunchItem, DockMonitor, DockWindowInfo } from "../src/projects/dock/types";

const item = (id: string, path: string, extra: Partial<DockLaunchItem> = {}): DockLaunchItem => ({
  id,
  type: "item",
  path,
  name: id,
  kind: "app",
  ...extra,
});

const win = (hwnd: number, exe: string, extra: Partial<DockWindowInfo> = {}): DockWindowInfo => ({
  hwnd,
  title: `w${hwnd}`,
  exe,
  pid: hwnd,
  minimized: false,
  focused: false,
  ...extra,
});

const monitor = (extra: Partial<DockMonitor> = {}): DockMonitor => ({
  index: 0,
  name: "\\\\.\\DISPLAY1",
  primary: true,
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  workX: 0,
  workY: 0,
  workWidth: 1920,
  workHeight: 1040,
  scale: 1,
  ...extra,
});

describe("dock entries", () => {
  const base: DockEntry[] = [item("a", "C:\\A.exe"), { id: "s", type: "separator" }, item("b", "C:\\B.lnk", { target: "C:\\B\\b.exe" }), item("c", "C:\\C.exe")];

  it("moves entries", () => {
    expect(moveEntry(base, "c", 0).map((e) => e.id)).toEqual(["c", "a", "s", "b"]);
    expect(moveEntry(base, "a", 99).map((e) => e.id)).toEqual(["s", "b", "c", "a"]);
    expect(moveEntry(base, "missing", 0)).toBe(base);
  });

  it("groups two items at the target position and adds to existing groups", () => {
    const grouped = groupEntries(base, "c", "a", "Jogos");
    expect(grouped.map((e) => e.type)).toEqual(["group", "separator", "item"]);
    const g = grouped[0];
    expect(g.type === "group" && g.items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(g.type === "group" && g.name).toBe("Jogos");

    const more = groupEntries(grouped, "b", g.id);
    const g2 = more[0];
    expect(g2.type === "group" && g2.items.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(more).toHaveLength(2);
  });

  it("never groups onto separators or itself", () => {
    expect(groupEntries(base, "a", "s")).toBe(base);
    expect(groupEntries(base, "a", "a")).toBe(base);
  });

  it("ungroups in place and removes empty groups", () => {
    const grouped = groupEntries(base, "c", "a");
    const gid = grouped[0].id;
    expect(ungroup(grouped, gid).map((e) => e.id)).toEqual(["a", "c", "s", "b"]);
    const emptied = removeEntry(removeEntry(grouped, "a"), "c");
    expect(emptied.some((e) => e.type === "group")).toBe(false);
  });

  it("takes an item out of a group", () => {
    const grouped = groupEntries(base, "c", "a");
    const out = takeOutOfGroup(grouped, "c", 1);
    expect(out.map((e) => e.id)).toEqual([grouped[0].id, "c", "s", "b"]);
    const g = out[0];
    expect(g.type === "group" && g.items.map((i) => i.id)).toEqual(["a"]);
  });

  it("updates items inside groups without changing their identity", () => {
    const grouped = groupEntries(base, "c", "a");
    const next = updateItem(grouped, "c", { name: "Novo", id: "hack" } as any);
    const g = next[0];
    expect(g.type === "group" && g.items[1]).toMatchObject({ id: "c", name: "Novo", type: "item" });
  });
});

describe("window matching", () => {
  const entries: DockEntry[] = [item("a", "C:\\Apps\\A.exe"), item("b", "C:\\Links\\B.lnk", { target: "c:/apps/b/B.EXE" }), item("f", "C:\\Docs", { kind: "folder" })];

  it("uses the shortcut target and ignores case and slashes", () => {
    expect(itemExe(entries[1] as DockLaunchItem)).toBe("c:\\apps\\b\\b.exe");
    expect(itemExe(entries[2] as DockLaunchItem)).toBeNull();
  });

  it("assigns windows to pinned items and groups the rest per app", () => {
    const m = matchWindows(entries, [win(1, "C:\\Apps\\A.exe"), win(2, "C:\\apps\\b\\b.exe"), win(3, "C:\\X\\x.exe"), win(4, "C:\\X\\x.exe"), win(5, "")]);
    expect(m.byItem.a.map((w) => w.hwnd)).toEqual([1]);
    expect(m.byItem.b.map((w) => w.hwnd)).toEqual([2]);
    expect(m.unpinned.map((u) => [u.exe, u.windows.length])).toEqual([
      ["c:\\x\\x.exe", 2],
      ["pid:5", 1],
    ]);
  });

  it("builds slots with an automatic separator before running apps", () => {
    const m = matchWindows(entries, [win(3, "C:\\X\\x.exe")]);
    expect(buildSlots(entries, m, true).map((s) => s.kind)).toEqual(["item", "item", "item", "separator", "running"]);
    expect(buildSlots(entries, m, false).map((s) => s.kind)).toEqual(["item", "item", "item"]);
    expect(buildSlots([], m, true).map((s) => s.kind)).toEqual(["running"]);
  });

  it("puts the Start button first and never makes it draggable", () => {
    const m = matchWindows(entries, [win(3, "C:\\X\\x.exe")]);
    const slots = buildSlots(entries, m, true, true);
    expect(slots.map((s) => s.kind)).toEqual(["start", "separator", "item", "item", "item", "separator", "running"]);
    expect(slots.filter(isPinnedSlot).map((s) => s.key)).toEqual(["a", "b", "f"]);
    expect(buildSlots([], null, true, true).map((s) => s.kind)).toEqual(["start"]);
    expect(buildSlots([], m, true, true).map((s) => s.kind)).toEqual(["start", "separator", "running"]);
  });

  it("puts the tray/clock button last, after a separator", () => {
    const slots = buildSlots(entries, null, true, true, true);
    expect(slots.map((s) => s.kind)).toEqual(["start", "separator", "item", "item", "item", "separator", "tray"]);
    expect(slots.filter(isPinnedSlot).map((s) => s.key)).toEqual(["a", "b", "f"]);
    expect(buildSlots([], null, false, false, true).map((s) => s.kind)).toEqual(["tray"]);
  });

  it("puts the Windows buttons right after Start, in order and without duplicates", () => {
    const slots = buildSlots(entries, null, true, true, false, ["search", "taskview", "search"]);
    expect(slots.map((s) => s.key)).toEqual(["start", "shell-search", "shell-taskview", "sep-start", "a", "b", "f"]);
    expect(slots.filter(isPinnedSlot).map((s) => s.key)).toEqual(["a", "b", "f"]);
    expect(buildSlots([], null, true, false, false, ["explorer"]).map((s) => s.kind)).toEqual(["shell"]);
  });

  it("finds Start menu apps ignoring accents, starts-with first", () => {
    const apps = [{ name: "Bloco de Notas" }, { name: "Paint" }, { name: "Notepad++" }, { name: "Configurações" }, { name: "Visual Studio Code" }];
    expect(searchByName(apps, "not").map((a) => a.name)).toEqual(["Notepad++", "Bloco de Notas"]);
    expect(searchByName(apps, "configuracoes").map((a) => a.name)).toEqual(["Configurações"]);
    expect(searchByName(apps, "  ")).toHaveLength(5);
    expect(searchByName(apps, "ode").map((a) => a.name)).toEqual(["Visual Studio Code"]);
    expect(appLetter("Ágata")).toBe("A");
    expect(appLetter("7-Zip")).toBe("#");
  });

  it("opens the dock's Start menu next to the bar and keeps it on screen", () => {
    const m = monitor();
    const a = { ...DEFAULT_APPEARANCE, edge: "bottom" as const, align: "start" as const };
    const bar = { x: 10, y: 1030, width: 400, height: 44 };
    expect(startMenuRect({ ...a, align: "center" }, m, bar, { x: 16, y: 1034 }, { w: 580, h: 640 }).x).toBe((1920 - 580) / 2);
    const r = startMenuRect(a, m, bar, { x: 16, y: 1034 }, { w: 580, h: 640 });
    expect(r).toEqual({ x: 8, y: 1030 - 640 - 8, width: 580, height: 640 });
    const right = startMenuRect(a, m, bar, { x: 1900, y: 1034 }, { w: 580, h: 640 });
    expect(right.x + right.width).toBeLessThanOrEqual(1920 - 8);
    const top = startMenuRect({ ...a, edge: "top" }, m, { x: 10, y: 0, width: 400, height: 44 }, { x: 16, y: 4 }, { w: 580, h: 640 });
    expect(top.y).toBe(52);
  });

  it("places the tray pill at the free end of the dock's edge", () => {
    const m = monitor({ scale: 1.5 });
    const size = { w: 200, h: 40 };
    const a = { ...DEFAULT_APPEARANCE, edge: "bottom" as const, align: "start" as const, offset: 6 };
    expect(trayWindowRect(a, m, size)).toEqual({ x: 1920 - 300 - 9, y: 1080 - 60 - 9, width: 300, height: 60 });
    expect(trayWindowRect({ ...a, align: "end" }, m, size).x).toBe(9);
    expect(trayWindowRect({ ...a, edge: "left" }, m, size)).toMatchObject({ x: 9, y: 1080 - 60 - 9 });
  });

  it("focuses, cycles and minimizes like a taskbar", () => {
    expect(nextWindow([])).toBeNull();
    expect(nextWindow([win(1, "a")])).toMatchObject({ action: "focus", window: { hwnd: 1 } });
    expect(nextWindow([win(1, "a", { focused: true })])).toMatchObject({ action: "minimize" });
    expect(nextWindow([win(1, "a", { focused: true }), win(2, "a")])).toMatchObject({ action: "focus", window: { hwnd: 2 } });
    expect(nextWindow([win(1, "a", { focused: true, minimized: true })])).toMatchObject({ action: "focus" });
  });
});

describe("layout", () => {
  it("falls back to the primary monitor when the chosen one is gone", () => {
    const list = [monitor(), monitor({ index: 1, primary: false, x: 1920 })];
    expect(pickMonitor(list, 1)?.index).toBe(1);
    expect(pickMonitor(list, 5)?.index).toBe(0);
    expect(pickMonitor([], 0)).toBeUndefined();
  });

  it("centers a bottom dock on the work area with headroom for magnification", () => {
    const a = { ...DEFAULT_APPEARANCE, edge: "bottom" as const, align: "center" as const, iconSize: 48, spacing: 8, padding: 10, offset: 10, magnify: 1.5 };
    const l = computeDockLayout({ appearance: a, monitor: monitor(), slots: 4, separators: 0 });
    const len = contentLength(a, 4, 0) + 20;
    expect(l.barLength).toBe(len);
    expect(l.window.y + l.window.height).toBe(1040);
    expect(l.bar.y + l.bar.height).toBeCloseTo(l.window.height - 10);
    expect(l.window.height).toBeGreaterThan(l.barThickness + 10 + 24);
    expect(l.window.x + l.bar.x + l.barLength / 2).toBeCloseTo(960, 0);
    expect(l.vertical).toBe(false);
  });

  it("uses physical pixels on scaled monitors and secondary screens", () => {
    const a = { ...DEFAULT_APPEARANCE, edge: "left" as const, magnify: 1, showLabels: false };
    const l = computeDockLayout({ appearance: a, monitor: monitor({ index: 1, x: 1920, workX: 1920, scale: 1.5 }), slots: 3, separators: 1 });
    expect(l.vertical).toBe(true);
    expect(l.window.x).toBe(1920);
    expect(l.window.width).toBe(Math.round((a.offset + l.barThickness + 10) * 1.5));
    const labeled = computeDockLayout({ appearance: { ...a, showLabels: true }, monitor: monitor(), slots: 3, separators: 0 });
    expect(labeled.window.width).toBeGreaterThan(l.window.width / 1.5 + 150);
    expect(l.reserve).toBe(Math.round((a.offset + l.barThickness) * 1.5));
  });

  it("matches the window to the bar for the real Windows backdrop", () => {
    const a = { ...DEFAULT_APPEARANCE, background: "acrylic" as const, edge: "top" as const };
    const l = computeDockLayout({ appearance: a, monitor: monitor(), slots: 5, separators: 0, nativeGlass: true });
    expect(l.window.height).toBe(l.barThickness);
    expect(l.window.width).toBe(Math.round(l.barLength));
    expect(l.window.y).toBe(a.offset);
    expect(l.bar).toMatchObject({ x: 0, y: 0 });
  });

  it("never exceeds the screen and supports full length", () => {
    const a = { ...DEFAULT_APPEARANCE, length: "full" as const, magnify: 1 };
    const l = computeDockLayout({ appearance: a, monitor: monitor(), slots: 2, separators: 0 });
    expect(l.barLength).toBe(1920 - a.offset * 2);
    expect(l.window.x).toBeGreaterThanOrEqual(0);
    expect(l.window.x + l.window.width).toBeLessThanOrEqual(1920);
    const many = computeDockLayout({ appearance: { ...DEFAULT_APPEARANCE, magnify: 1 }, monitor: monitor(), slots: 200, separators: 0 });
    expect(many.window.width).toBeLessThanOrEqual(1920);
  });

  it("anchors to the reserved AppBar strip", () => {
    const l = computeDockLayout({
      appearance: { ...DEFAULT_APPEARANCE, magnify: 1 },
      monitor: monitor(),
      slots: 3,
      separators: 0,
      anchor: { x: 0, y: 960, width: 1920, height: 80 },
    });
    expect(l.window.y + l.window.height).toBe(1040);
  });

  it("puts the reveal strip on the screen edge", () => {
    const a = { ...DEFAULT_APPEARANCE, edge: "right" as const };
    const l = computeDockLayout({ appearance: a, monitor: monitor(), slots: 3, separators: 0 });
    const s = revealStrip(l, "right");
    expect(s.x + s.width).toBeCloseTo(l.window.width / l.scale);
  });

  it("magnifies smoothly and only near the pointer", () => {
    expect(magnifyScale(0, 56, 1.5)).toBeCloseTo(1.5);
    expect(magnifyScale(56, 56, 1.5)).toBeGreaterThan(1);
    expect(magnifyScale(56, 56, 1.5)).toBeLessThan(1.5);
    expect(magnifyScale(500, 56, 1.5)).toBe(1);
    expect(magnifyScale(0, 56, 1)).toBe(1);
  });
});

describe("auto-hide", () => {
  const base = { autoHide: "never" as const, hovered: false, fullscreen: false, hideOnFullscreen: true, overlap: false, busy: false };
  it("follows the chosen mode", () => {
    expect(shouldHide(base)).toBe(false);
    expect(shouldHide({ ...base, autoHide: "auto" })).toBe(true);
    expect(shouldHide({ ...base, autoHide: "auto", hovered: true })).toBe(false);
    expect(shouldHide({ ...base, autoHide: "smart" })).toBe(false);
    expect(shouldHide({ ...base, autoHide: "smart", overlap: true })).toBe(true);
  });
  it("hides for fullscreen apps unless disabled, and never while busy", () => {
    expect(shouldHide({ ...base, fullscreen: true })).toBe(true);
    expect(shouldHide({ ...base, fullscreen: true, hovered: true })).toBe(true);
    expect(shouldHide({ ...base, fullscreen: true, hideOnFullscreen: false })).toBe(false);
    expect(shouldHide({ ...base, autoHide: "auto", busy: true })).toBe(false);
  });
});

describe("themes", () => {
  it("only carry visual fields", () => {
    for (const t of BUILTIN_THEMES) {
      for (const key of Object.keys(t.appearance)) expect(THEME_FIELDS).toContain(key);
    }
    expect(BUILTIN_THEMES.map((t) => t.name)).toEqual(expect.arrayContaining(["Aero Glass", "Cute Pastel", "Dark Modern", "Cyber Neon"]));
    expect(Object.keys(pickThemeFields(DEFAULT_APPEARANCE)).sort()).toEqual([...THEME_FIELDS].sort());
  });
  it("converts colors", () => {
    expect(hexToRgba("#ff0080", 0.5)).toBe("rgba(255, 0, 128, 0.5)");
    expect(hexToRgba("#fff", 2)).toBe("rgba(255, 255, 255, 1)");
  });
  it("macOS preset swaps the Windows start icon for Launchpad and other themes restore it", () => {
    const mac = BUILTIN_THEMES.find((t) => t.id === MACOS_THEME_ID)!;
    expect(mac.appearance.startIcon).toBe("launchpad");
    for (const t of BUILTIN_THEMES.filter((t) => t.id !== MACOS_THEME_ID)) expect(["windows", "win11"]).toContain(t.appearance.startIcon);
    expect(MACOS_LAYOUT).toMatchObject({ edge: "bottom", align: "center" });
    for (const key of Object.keys(MACOS_LAYOUT)) expect(THEME_FIELDS).not.toContain(key);
  });
  it("Windows 11 floating preset keeps the dock on the left without magnification", () => {
    expect(BUILTIN_THEMES.find((t) => t.id === WIN11_THEME_ID)!.appearance.startIcon).toBe("win11");
    expect(WIN11_LAYOUT).toMatchObject({ edge: "bottom", align: "center", magnify: 1 });
    for (const key of Object.keys(WIN11_LAYOUT)) expect(THEME_FIELDS).not.toContain(key);
  });
  it("picks readable text for light and dark bars", () => {
    expect(contrastText("#e4e4e9", 0.72)).toBe("#1f2328");
    expect(contrastText("#1c1a2b", 0.55)).toBe("#ffffff");
    expect(contrastText("#ffffff", 0.1)).toBe("#ffffff");
  });
});

describe("dock store", () => {
  beforeEach(() => {
    useDockStore.setState({
      enabled: false,
      entries: [],
      appearance: DEFAULT_APPEARANCE,
      behavior: DEFAULT_BEHAVIOR,
      customThemes: [],
      activeThemeId: null,
      taskbarMode: { enabled: false, autohide: false },
    });
  });

  it("is off by default, including the taskbar mode", () => {
    const s = useDockStore.getState();
    expect(s.enabled).toBe(false);
    expect(s.taskbarMode.enabled).toBe(false);
  });

  it("adds resolved items once, at the requested position", () => {
    const s = useDockStore.getState();
    expect(s.addItems([{ kind: "app", path: "C:\\A.exe", name: "A", target: "C:\\A.exe" }])).toBe(1);
    expect(s.addItems([{ kind: "app", path: "c:\\a.exe", name: "A" }])).toBe(0);
    expect(s.addItems([{ kind: "folder", path: "C:\\Docs", name: "Docs" }, { kind: "folder", path: "C:\\Docs", name: "Docs" }], 0)).toBe(1);
    const names = useDockStore.getState().entries.map((e) => (e.type === "item" ? e.name : e.type));
    expect(names).toEqual(["Docs", "A"]);
  });

  it("applies and saves themes without moving the dock", () => {
    const s = useDockStore.getState();
    s.setAppearance({ edge: "left", iconSize: 64 });
    s.applyTheme("cyber-neon");
    let st = useDockStore.getState();
    expect(st.appearance.edge).toBe("left");
    expect(st.appearance.iconSize).toBe(64);
    expect(st.appearance.indicator).toBe("glow");
    expect(st.activeThemeId).toBe("cyber-neon");

    st.setAppearance({ bgColor: "#123456" });
    expect(useDockStore.getState().activeThemeId).toBeNull();
    const saved = useDockStore.getState().saveCurrentTheme("Meu");
    st = useDockStore.getState();
    expect(st.customThemes).toHaveLength(1);
    expect(saved.appearance.bgColor).toBe("#123456");
    expect("edge" in saved.appearance).toBe(false);
    st.deleteTheme(saved.id);
    expect(useDockStore.getState().customThemes).toHaveLength(0);
  });

  it("keeps the theme selection when only layout changes", () => {
    const s = useDockStore.getState();
    s.applyTheme("aero-glass");
    s.setAppearance({ iconSize: 40 });
    expect(useDockStore.getState().activeThemeId).toBe("aero-glass");
  });
});
