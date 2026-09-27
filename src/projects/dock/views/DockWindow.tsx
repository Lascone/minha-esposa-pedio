import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Menu } from "@tauri-apps/api/menu";
import { useDockStore } from "../store/dockStore";
import { dockService } from "../dockService";
import { startCentered } from "../dockLifecycle";
import { addPathsToDock, pickAndAddToDock, pickCustomIcon } from "../dockActions";
import {
  DockSlot,
  buildSlots,
  computeDockLayout,
  countSlots,
  matchWindows,
  nextWindow,
  pickMonitor,
  revealStrip,
  shouldHide,
  START_MENU_SIZE,
  startMenuRect,
} from "../logic";
import { DockGroup, DockLaunchItem, DockMonitor, DockWindowInfo, Rect } from "../types";
import { ActivateInfo, DockBar, DockContextTarget, SHELL_BUTTON_LABELS, dockBarBackground } from "../components/DockBar";
import { DockIcon } from "../components/DockIcon";

type MenuEntry = { text: string; action?: () => void; enabled?: boolean } | "separator" | { text: string; items: MenuEntry[] };

function toMenuItems(entries: MenuEntry[]): any[] {
  return entries.map((e) => {
    if (e === "separator") return { item: "Separator" };
    if ("items" in e) return { text: e.text, items: toMenuItems(e.items) };
    return { text: e.text, enabled: e.enabled ?? true, action: e.action };
  });
}

function launchArgs(item: DockLaunchItem): string | null {
  return /\.lnk$/i.test(item.path) ? null : item.args || null;
}

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

const roundRect = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) });

export const DockWindow: React.FC = () => {
  const entries = useDockStore((s) => s.entries);
  const appearance = useDockStore((s) => s.appearance);
  const behavior = useDockStore((s) => s.behavior);
  const taskbarReplaced = useDockStore((s) => s.taskbarMode.enabled && s.taskbarMode.hide);
  const trayButton = taskbarReplaced && behavior.trayStyle !== "pill";
  const trayPill = taskbarReplaced && behavior.trayStyle === "pill";

  useEffect(() => {
    if (trayPill) dockService.trayOpen().catch(() => {});
    else dockService.trayClose().catch(() => {});
  }, [trayPill]);

  // The Windows Start menu follows the taskbar alignment: keep it centered while the dock is centered.
  const taskbarModeOn = useDockStore((s) => s.taskbarMode.enabled);
  const centered = startCentered();
  const lastCentered = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = lastCentered.current;
    lastCentered.current = centered;
    if (prev === null || prev === centered || !taskbarModeOn) return;
    const t = useDockStore.getState().taskbarMode;
    dockService.taskbarApply(t.autohide, t.hide, centered).catch(() => {});
  }, [centered, taskbarModeOn]);

  const [monitors, setMonitors] = useState<DockMonitor[]>([]);
  const [windows, setWindows] = useState<DockWindowInfo[]>([]);
  const [hovered, setHovered] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [overlap, setOverlap] = useState(false);
  const [shellOpen, setShellOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [openGroup, setOpenGroup] = useState<{ id: string; center: number } | null>(null);
  const [bouncing, setBouncing] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const barRef = useRef<HTMLDivElement | null>(null);
  const lastBounds = useRef<Rect | null>(null);
  const lastHit = useRef<string>("");

  useEffect(() => {
    for (const el of [document.documentElement, document.body, document.getElementById("root")]) {
      if (!el) continue;
      el.classList.add("is-transparent-window");
      el.style.background = "transparent";
      el.style.overflow = "hidden";
    }
  }, []);

  // --- native state -------------------------------------------------------------------------
  useEffect(() => {
    const offs: Array<Promise<() => void>> = [];
    dockService.listMonitors().then(setMonitors);
    dockService.listWindows().then(setWindows);
    dockService.envState().then((s) => {
      setFullscreen(s.fullscreen);
      setOverlap(s.overlap);
    });
    offs.push(listen<DockWindowInfo[]>("dock://windows", (e) => setWindows(e.payload)));
    offs.push(listen<DockMonitor[]>("dock://displays-changed", (e) => setMonitors(e.payload)));
    offs.push(listen<boolean>("dock://pointer", (e) => setHovered(e.payload)));
    offs.push(listen<boolean>("dock://fullscreen", (e) => setFullscreen(e.payload)));
    offs.push(listen<boolean>("dock://overlap", (e) => setOverlap(e.payload)));
    offs.push(listen<boolean>("dock://shell-open", (e) => setShellOpen(e.payload)));
    return () => offs.forEach((p) => p.then((f) => f()).catch(() => {}));
  }, []);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((n) => (n === text ? null : n)), 3200);
  }, []);

  // --- layout -------------------------------------------------------------------------------
  const nativeGlass = appearance.background === "acrylic";
  const running = useMemo(() => matchWindows(entries, windows), [entries, windows]);
  const slots = useMemo(
    () => buildSlots(entries, running, behavior.showRunning, behavior.startButton, trayButton, behavior.shellButtons),
    [entries, running, behavior.showRunning, behavior.startButton, trayButton, behavior.shellButtons]
  );

  // The menu hides itself when it loses focus, which happens right before a click on the Start
  // button would toggle it; ignore that click so it closes instead of reopening.
  const menuHiddenAt = useRef(0);
  useEffect(() => {
    const off = listen("dockmenu://hidden", () => (menuHiddenAt.current = Date.now()));
    return () => void off.then((f) => f()).catch(() => {});
  }, []);
  useEffect(() => {
    if (behavior.startMenu !== "dock" || !behavior.startButton) dockService.menuHide().catch(() => {});
  }, [behavior.startMenu, behavior.startButton]);
  const counts = countSlots(slots);
  const monitor = pickMonitor(monitors, appearance.monitor);
  const group = openGroup ? (entries.find((e) => e.id === openGroup.id && e.type === "group") as DockGroup | undefined) : undefined;

  const vertical = appearance.edge === "left" || appearance.edge === "right";
  const cell = appearance.iconSize + 36;
  const groupCols = group ? Math.min(4, Math.max(1, group.items.length)) : 0;
  const groupRows = group ? Math.ceil(group.items.length / groupCols) : 0;
  const popW = groupCols * cell + 28;
  const popH = groupRows * (appearance.iconSize + 34) + 50;

  const layout = useMemo(() => {
    if (!monitor) return null;
    return computeDockLayout({
      appearance,
      monitor,
      slots: counts.icons,
      separators: counts.separators,
      anchor: anchor || undefined,
      nativeGlass,
      expanded: group ? (vertical ? popW : popH) + 12 : 0,
      minLength: group ? (vertical ? popH : popW) + 24 : 0,
    });
  }, [appearance, monitor, counts.icons, counts.separators, anchor, nativeGlass, group, vertical, popW, popH]);

  useEffect(() => {
    if (!layout || sameRect(lastBounds.current, layout.window)) return;
    lastBounds.current = layout.window;
    dockService.setBounds(layout.window).catch(() => {});
  }, [layout]);

  // Reserve screen space like the taskbar (only when the dock is always visible).
  const reserve = behavior.reserveSpace && behavior.autoHide === "never";
  const reserveThickness = layout?.reserve ?? 0;
  useEffect(() => {
    if (!monitor) return;
    if (!reserve) {
      dockService.setAppBar(false, appearance.edge, 0, monitor.index).catch(() => {});
      setAnchor(null);
      return;
    }
    dockService
      .setAppBar(true, appearance.edge, reserveThickness, monitor.index)
      .then((r) => setAnchor((prev) => (r && !sameRect(prev, r) ? r : prev)))
      .catch(() => setAnchor(null));
  }, [reserve, appearance.edge, reserveThickness, monitor?.index]);

  useEffect(() => {
    dockService.setEffect(nativeGlass ? "acrylic" : "none", appearance.radius).catch(() => {});
  }, [nativeGlass, appearance.radius]);

  // --- auto-hide ----------------------------------------------------------------------------
  // Start/Search open (Windows key) reveals the dock, as it does with the taskbar.
  const busy = dragging || menuOpen || dropHover || !!group || shellOpen;
  const wantHidden = shouldHide({
    autoHide: behavior.autoHide,
    hovered,
    fullscreen,
    hideOnFullscreen: behavior.hideOnFullscreen,
    overlap,
    busy,
  });
  const fullscreenHidden = fullscreen && behavior.hideOnFullscreen;
  useEffect(() => {
    if (!wantHidden) {
      setHidden(false);
      return;
    }
    const t = window.setTimeout(() => setHidden(true), fullscreenHidden ? 0 : 650);
    return () => window.clearTimeout(t);
  }, [wantHidden, fullscreenHidden]);

  // Close the group popover shortly after the pointer leaves the dock.
  useEffect(() => {
    if (!group || hovered || menuOpen) return;
    const t = window.setTimeout(() => setOpenGroup(null), 700);
    return () => window.clearTimeout(t);
  }, [group, hovered, menuOpen]);

  // --- hit testing (everything outside is click-through) ------------------------------------
  const pushHitRect = useCallback(() => {
    if (!layout) return;
    const winW = layout.window.width / layout.scale;
    const winH = layout.window.height / layout.scale;
    let hit: Rect | null = null;
    if (fullscreenHidden) hit = null;
    else if (hidden) hit = revealStrip(layout, appearance.edge);
    else if (dragging || dropHover || group) hit = { x: 0, y: 0, width: winW, height: winH };
    else if (barRef.current) {
      const r = barRef.current.getBoundingClientRect();
      const grow = hovered && !nativeGlass ? appearance.iconSize * (appearance.magnify - 1) + 6 : 0;
      hit = { x: r.left, y: r.top, width: r.width, height: r.height };
      if (grow) {
        if (vertical) {
          hit.y -= grow;
          hit.height += grow * 2;
          if (appearance.edge === "left") hit.width += grow;
          else {
            hit.x -= grow;
            hit.width += grow;
          }
        } else {
          hit.x -= grow;
          hit.width += grow * 2;
          if (appearance.edge === "top") hit.height += grow;
          else {
            hit.y -= grow;
            hit.height += grow;
          }
        }
      }
    }
    const clamped = hit
      ? roundRect({
          x: Math.max(0, hit.x),
          y: Math.max(0, hit.y),
          width: Math.min(winW, hit.x + hit.width) - Math.max(0, hit.x),
          height: Math.min(winH, hit.y + hit.height) - Math.max(0, hit.y),
        })
      : null;
    const bar = roundRect(layout.bar);
    const key = JSON.stringify([clamped, bar]);
    if (key === lastHit.current) return;
    lastHit.current = key;
    dockService.setHitRect(clamped, bar).catch(() => {});
  }, [layout, fullscreenHidden, hidden, dragging, dropHover, group, hovered, nativeGlass, appearance, vertical]);

  useLayoutEffect(() => {
    pushHitRect();
  });

  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => pushHitRect());
    ro.observe(el);
    return () => ro.disconnect();
  }, [pushHitRect, layout]);

  useEffect(() => () => void dockService.setHitRect(null, null).catch(() => {}), []);

  // --- actions ------------------------------------------------------------------------------
  const bounce = (id: string) => {
    if (!appearance.animations) return;
    setBouncing((s) => new Set(s).add(id));
    window.setTimeout(
      () =>
        setBouncing((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
      Math.round(950 / Math.max(0.25, appearance.animSpeed))
    );
  };

  const launchItem = async (item: DockLaunchItem) => {
    try {
      await dockService.launch(item.path, launchArgs(item));
      bounce(item.id);
    } catch (e) {
      showNotice(String(e));
    }
  };

  const actOnWindows = async (list: DockWindowInfo[]) => {
    const next = nextWindow(list);
    if (!next) return false;
    try {
      await dockService.windowAction(next.window.hwnd, next.action);
    } catch (e) {
      showNotice(String(e));
    }
    return true;
  };

  const onActivate = async (slot: DockSlot, info: ActivateInfo) => {
    const newInstance = info.middle || info.shift;
    if (slot.kind === "start") {
      setOpenGroup(null);
      if (behavior.startMenu === "dock") void toggleStartMenu(info.element);
      else dockService.shellAction("start").catch((e) => showNotice(String(e)));
      return;
    }
    if (slot.kind === "shell") {
      setOpenGroup(null);
      dockService.shellAction(slot.action).catch((e) => showNotice(String(e)));
      return;
    }
    if (slot.kind === "tray") {
      setOpenGroup(null);
      dockService.taskbarPeek().catch((e) => showNotice(String(e)));
      return;
    }
    if (slot.kind === "item") {
      setOpenGroup(null);
      if (!newInstance && (await actOnWindows(slot.windows))) return;
      await launchItem(slot.item);
    } else if (slot.kind === "running") {
      if (newInstance && !slot.exe.startsWith("pid:")) {
        dockService.launch(slot.exe).catch((e) => showNotice(String(e)));
        return;
      }
      await actOnWindows(slot.windows);
    } else if (slot.kind === "group") {
      if (nativeGlass) {
        openGroupMenu(slot.group);
        return;
      }
      const r = info.element.getBoundingClientRect();
      const center = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
      setOpenGroup((g) => (g?.id === slot.group.id ? null : { id: slot.group.id, center }));
    }
  };

  const toggleStartMenu = async (element: HTMLElement) => {
    if (!layout || !monitor || Date.now() - menuHiddenAt.current < 350) return;
    try {
      const opened = await dockService.menuToggle();
      if (!opened) return;
      const s = layout.scale;
      const r = element.getBoundingClientRect();
      const bar = barRef.current?.getBoundingClientRect() || { left: layout.bar.x, top: layout.bar.y, width: layout.bar.width, height: layout.bar.height };
      const physBar = { x: layout.window.x + bar.left * s, y: layout.window.y + bar.top * s, width: bar.width * s, height: bar.height * s };
      const anchorPt = { x: layout.window.x + r.left * s, y: layout.window.y + r.top * s };
      await dockService.menuSetBounds(startMenuRect(appearance, monitor, physBar, anchorPt, START_MENU_SIZE), true);
    } catch (e) {
      showNotice(String(e));
    }
  };

  const popupMenu = async (entries: MenuEntry[]) => {
    setMenuOpen(true);
    try {
      const menu = await Menu.new({ items: toMenuItems(entries) });
      await menu.popup();
    } catch {
      // Menus are unavailable outside the desktop app.
    } finally {
      window.setTimeout(() => setMenuOpen(false), 150);
    }
  };

  const openSettings = () => {
    invoke("show_main_window").catch(() => {});
    emit("dock-open-settings").catch(() => {});
  };

  const windowEntries = (list: DockWindowInfo[]): MenuEntry[] =>
    list.length
      ? [
          ...list.map((w) => ({ text: (w.minimized ? "▫ " : "▪ ") + (w.title.length > 48 ? w.title.slice(0, 47) + "…" : w.title), action: () => void dockService.windowAction(w.hwnd, "focus") })),
          "separator" as const,
        ]
      : [];

  const closeEntries = (list: DockWindowInfo[]): MenuEntry[] =>
    list.length
      ? [
          { text: "Minimizar tudo", action: () => list.forEach((w) => void dockService.windowAction(w.hwnd, "minimize")) },
          { text: list.length > 1 ? `Fechar ${list.length} janelas` : "Fechar janela", action: () => list.forEach((w) => void dockService.windowAction(w.hwnd, "close")) },
        ]
      : [];

  const changeIcon = async (id: string) => {
    try {
      const icon = await pickCustomIcon();
      if (icon) useDockStore.getState().updateItem(id, { customIcon: icon });
    } catch (e) {
      showNotice(String(e));
    }
  };

  const itemMenu = (item: DockLaunchItem, list: DockWindowInfo[], groupId?: string): MenuEntry[] => {
    const store = useDockStore.getState();
    const index = entries.findIndex((e) => e.id === item.id);
    return [
      ...windowEntries(list),
      { text: list.length ? "Abrir outra janela" : "Abrir", action: () => void launchItem(item) },
      ...(item.kind !== "url" ? [{ text: "Abrir local do arquivo", action: () => dockService.reveal(item.path).catch((e) => showNotice(String(e))) }] : []),
      "separator",
      { text: "Mudar ícone…", action: () => void changeIcon(item.id) },
      ...(item.customIcon ? [{ text: "Usar ícone original", action: () => store.updateItem(item.id, { customIcon: undefined }) }] : []),
      ...(groupId ? [{ text: "Tirar do grupo", action: () => store.takeOutOfGroup(item.id, entries.findIndex((e) => e.id === groupId) + 1) }] : []),
      ...(index >= 0 ? [{ text: "Adicionar separador depois", action: () => store.addSeparator(index + 1) }] : []),
      { text: "Desafixar do dock", action: () => store.removeEntry(item.id) },
      ...(list.length ? ["separator" as const, ...closeEntries(list)] : []),
      "separator",
      { text: "Configurar dock…", action: openSettings },
    ];
  };

  const barMenu = (): MenuEntry[] => [
    { text: "Adicionar aplicativo ou atalho…", action: () => void pickAndAddToDock("files").catch((e) => showNotice(String(e))) },
    { text: "Adicionar pasta…", action: () => void pickAndAddToDock("folder").catch((e) => showNotice(String(e))) },
    { text: "Adicionar separador", action: () => useDockStore.getState().addSeparator() },
    "separator",
    { text: "Configurar dock…", action: openSettings },
    {
      text: "Fechar o dock",
      action: () => {
        useDockStore.getState().setEnabled(false);
        dockService.closeWindow();
      },
    },
  ];

  function openGroupMenu(g: DockGroup) {
    popupMenu([
      ...g.items.map((it) => ({
        text: it.name,
        action: () => {
          const list = running.byItem[it.id] || [];
          if (list.length) void actOnWindows(list);
          else void launchItem(it);
        },
      })),
      "separator",
      { text: "Desagrupar", action: () => useDockStore.getState().ungroup(g.id) },
    ]);
  }

  const onContext = (target: DockContextTarget) => {
    const store = useDockStore.getState();
    if (target.kind === "item") return void popupMenu(itemMenu(target.item, target.windows, target.groupId));
    if (target.kind === "group") {
      return void popupMenu([
        ...windowEntries(target.windows),
        { text: "Desagrupar", action: () => store.ungroup(target.group.id) },
        { text: "Remover grupo do dock", action: () => store.removeEntry(target.group.id) },
        "separator",
        { text: "Renomear no painel…", action: openSettings },
      ]);
    }
    if (target.kind === "shell") {
      return void popupMenu([
        { text: SHELL_BUTTON_LABELS[target.action], action: () => void dockService.shellAction(target.action).catch((e) => showNotice(String(e))) },
        "separator",
        { text: "Tirar este botão do dock", action: () => store.setBehavior({ shellButtons: behavior.shellButtons.filter((b) => b !== target.action) }) },
        { text: "Configurar dock…", action: openSettings },
      ]);
    }
    if (target.kind === "start" || target.kind === "tray") {
      const shell = (action: "start" | "quicklinks" | "desktop" | "search") => () => void dockService.shellAction(action).catch((e) => showNotice(String(e)));
      const restoreTaskbar = {
        text: "Restaurar barra do Windows",
        action: () =>
          void dockService
            .taskbarRestore()
            .then(() => {
              store.setTaskbarMode({ enabled: false });
              emit("taskbar-mode-restored").catch(() => {});
            })
            .catch((e) => showNotice(String(e))),
      };
      if (target.kind === "tray") {
        return void popupMenu([
          { text: "Mostrar bandeja e relógio", action: () => void dockService.taskbarPeek().catch((e) => showNotice(String(e))) },
          { text: "Mostrar a área de trabalho", action: shell("desktop") },
          "separator",
          restoreTaskbar,
          { text: "Configurar dock…", action: openSettings },
        ]);
      }
      return void popupMenu([
        { text: "Abrir o Iniciar do Windows", action: shell("start") },
        {
          text: behavior.startMenu === "dock" ? "Usar o Iniciar do Windows no botão" : "Usar o menu do dock no botão",
          action: () => store.setBehavior({ startMenu: behavior.startMenu === "dock" ? "windows" : "dock" }),
        },
        { text: "Pesquisar", action: shell("search") },
        { text: "Menu de links rápidos (Win + X)", action: shell("quicklinks") },
        { text: "Mostrar a área de trabalho", action: shell("desktop") },
        "separator",
        restoreTaskbar,
        { text: "Tirar o Iniciar do dock", action: () => store.setBehavior({ startButton: false }) },
        { text: "Configurar dock…", action: openSettings },
      ]);
    }
    if (target.kind === "separator") return void popupMenu([{ text: "Remover separador", action: () => store.removeEntry(target.id) }]);
    if (target.kind === "running") {
      const exe = target.exe.startsWith("pid:") ? null : target.exe;
      return void popupMenu([
        ...windowEntries(target.windows),
        ...(exe
          ? [
              { text: "Abrir outra janela", action: () => dockService.launch(exe).catch((e) => showNotice(String(e))) },
              { text: "Fixar no dock", action: () => void addPathsToDock([exe]) },
              { text: "Abrir local do arquivo", action: () => dockService.reveal(exe).catch((e) => showNotice(String(e))) },
              "separator" as const,
            ]
          : []),
        ...closeEntries(target.windows),
      ]);
    }
    return void popupMenu(barMenu());
  };

  // --- drag & drop from Explorer / desktop --------------------------------------------------
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        const p = event.payload;
        if (p.type === "enter" || p.type === "over") setDropHover(true);
        else if (p.type === "leave") setDropHover(false);
        else if (p.type === "drop") {
          setDropHover(false);
          const ratio = window.devicePixelRatio || 1;
          const pos = vertical ? p.position.y / ratio : p.position.x / ratio;
          const nodes = Array.from(barRef.current?.querySelectorAll<HTMLElement>("[data-pinned-index]") || []);
          const index = nodes.filter((n) => {
            const r = n.getBoundingClientRect();
            return (vertical ? r.top + r.height / 2 : r.left + r.width / 2) < pos;
          }).length;
          const added = await addPathsToDock(p.paths, index);
          if (!added && p.paths.length) showNotice("Esses itens já estão no dock.");
        }
      })
      .then((fn) => (unlisten = fn))
      .catch(() => {});
    return () => unlisten?.();
  }, [vertical, showNotice]);

  if (!layout) return null;

  const store = useDockStore.getState();
  const { bar } = layout;
  const winW = layout.window.width / layout.scale;
  const winH = layout.window.height / layout.scale;

  const barAnchor: React.CSSProperties =
    appearance.length === "full"
      ? { position: "absolute", inset: 0, display: "flex" }
      : vertical
      ? {
          position: "absolute",
          left: 0,
          right: 0,
          height: "max-content",
          ...(appearance.align === "start" ? { top: 0 } : appearance.align === "end" ? { bottom: 0 } : { top: "50%", transform: "translateY(-50%)" }),
        }
      : {
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "max-content",
          ...(appearance.align === "start" ? { left: 0 } : appearance.align === "end" ? { right: 0 } : { left: "50%", transform: "translateX(-50%)" }),
        };

  const popStyle: React.CSSProperties | null = group
    ? (() => {
        const along = Math.max(8, Math.min((vertical ? winH : winW) - (vertical ? popH : popW) - 8, openGroup!.center - (vertical ? popH : popW) / 2));
        const gap = 12;
        switch (appearance.edge) {
          case "top":
            return { left: along, top: bar.y + bar.height + gap };
          case "left":
            return { top: along, left: bar.x + bar.width + gap };
          case "right":
            return { top: along, left: bar.x - popW - gap };
          default:
            return { left: along, top: bar.y - popH - gap };
        }
      })()
    : null;

  return (
    <div className="fixed inset-0 select-none overflow-hidden" style={{ fontFamily: "inherit", opacity: fullscreenHidden && hidden ? 0 : 1 }}>
      <div style={{ position: "absolute", left: bar.x, top: bar.y, width: bar.width, height: bar.height }}>
        <div style={barAnchor}>
          <div style={{ outline: dropHover ? `2px dashed ${appearance.indicatorColor}` : undefined, outlineOffset: 3, borderRadius: appearance.radius, width: appearance.length === "full" ? "100%" : undefined, height: appearance.length === "full" ? "100%" : undefined }}>
            <DockBar
              barRef={barRef}
              slots={slots}
              appearance={appearance}
              nativeGlass={nativeGlass}
              hidden={hidden}
              bouncing={bouncing}
              activeGroupId={group?.id ?? null}
              onActivate={onActivate}
              onContext={(t) => onContext(t)}
              onMove={store.moveEntry}
              onGroup={store.groupItems}
              onBusyChange={setDragging}
            />
          </div>
        </div>
      </div>

      {slots.length === 0 && !hidden && (
        <div
          className="pointer-events-none absolute whitespace-nowrap text-[12px] font-semibold text-white/90"
          style={{ left: bar.x + bar.width / 2, top: bar.y + bar.height / 2, transform: "translate(-50%, -50%)" }}
        >
          Arraste apps aqui ✨
        </div>
      )}

      {group && popStyle && (
        <div
          className="absolute rounded-2xl p-3.5 text-white shadow-2xl"
          style={{ ...popStyle, width: popW, height: popH, ...dockBarBackground({ ...appearance, background: appearance.background === "acrylic" ? "solid" : appearance.background, bgOpacity: Math.max(0.75, appearance.bgOpacity) }), borderRadius: Math.min(22, appearance.radius + 4), boxSizing: "border-box" }}
        >
          <div className="mb-2 truncate px-1 text-[12px] font-bold tracking-wide opacity-90">{group.name}</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${groupCols}, ${cell}px)` }}>
            {group.items.map((it) => {
              const list = running.byItem[it.id] || [];
              return (
                <button
                  key={it.id}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-xl p-1.5 transition hover:bg-white/15"
                  onClick={async () => {
                    setOpenGroup(null);
                    if (!(await actOnWindows(list))) await launchItem(it);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    popupMenu(itemMenu(it, list, group.id));
                  }}
                >
                  <div className="relative">
                    <DockIcon path={it.path} customIcon={it.customIcon} kind={it.kind} size={appearance.iconSize} />
                    {list.length > 0 && <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: appearance.indicatorColor }} />}
                  </div>
                  <span className="w-full truncate text-center text-[11px] font-medium opacity-90">{it.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {notice && (
        <div
          className="pointer-events-none absolute max-w-[90%] truncate rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-lg"
          style={{
            background: "rgba(190, 24, 93, 0.92)",
            ...(appearance.edge === "top"
              ? { top: bar.y + bar.height + 8, left: "50%", transform: "translateX(-50%)" }
              : appearance.edge === "bottom"
              ? { top: Math.max(0, bar.y - 30), left: "50%", transform: "translateX(-50%)" }
              : { top: bar.y + 4, left: appearance.edge === "left" ? bar.x + bar.width + 8 : undefined, right: appearance.edge === "right" ? winW - bar.x + 8 : undefined }),
          }}
        >
          {notice}
        </div>
      )}
    </div>
  );
};

export default DockWindow;
