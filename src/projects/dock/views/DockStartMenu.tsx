import React, { useEffect, useMemo, useRef, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ArrowLeft, Calculator, ChevronRight, LayoutGrid as Windows, Lock, LogOut, Pin, Power, RotateCw, Search, Settings, ShoppingBag, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useDockStore } from "../store/dockStore";
import { dockService, DockShellAction, isTauriRuntime, PowerAction, StartApp } from "../dockService";
import { addPathsToDock } from "../dockActions";
import { appLetter, flattenItems, searchByName } from "../logic";
import { DockAppearance, DockLaunchItem, DockStartMenuSections } from "../types";
import { dockBarBackground } from "../components/DockBar";
import { DockIcon } from "../components/DockIcon";
import { contrastText, hexToRgba } from "../themes";

interface SystemShortcut {
  name: string;
  path: string;
  icon: LucideIcon;
  color: string;
}

const SYSTEM_SHORTCUTS: SystemShortcut[] = [
  { name: "Configurações", path: "ms-settings:", icon: Settings, color: "#6b7280" },
  { name: "Painel de controle", path: "control.exe", icon: SlidersHorizontal, color: "#2563eb" },
  { name: "Calculadora", path: "calculator:", icon: Calculator, color: "#0f766e" },
  { name: "Microsoft Store", path: "ms-windows-store:", icon: ShoppingBag, color: "#7c3aed" },
];

const POWER_LABELS: Record<PowerAction, string> = {
  lock: "Bloquear",
  signout: "Sair da conta",
  restart: "Reiniciar",
  shutdown: "Desligar",
};

export interface StartMenuPanelProps {
  appearance: DockAppearance;
  sections: DockStartMenuSections;
  pinned: DockLaunchItem[];
  apps: StartApp[];
  userName: string | null;
  onLaunch: (path: string, args?: string | null) => void;
  onShell: (action: DockShellAction) => void;
  onPower: (action: PowerAction) => void;
  onPin?: (path: string) => void;
  onClose?: () => void;
  /** Focus the search box (bumped every time the menu opens). */
  focusKey?: number;
}

type Result = { key: string; name: string; path: string; args?: string | null; custom?: string; kind?: DockLaunchItem["kind"] };

/** Themed Start menu (search, pinned apps, all apps, power), used by the menu window and the preview. */
export const StartMenuPanel: React.FC<StartMenuPanelProps> = ({ appearance: a, sections, pinned, apps, userName, onLaunch, onShell, onPower, onPin, onClose, focusKey }) => {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"home" | "all">("home");
  const [confirm, setConfirm] = useState<PowerAction | null>(null);
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuery("");
    setView("home");
    setConfirm(null);
    window.setTimeout(() => input.current?.focus(), 30);
  }, [focusKey]);

  const opacity = Math.max(a.bgOpacity, 0.86);
  const look: DockAppearance = { ...a, background: a.background === "acrylic" ? "glass" : a.background, bgOpacity: opacity };
  const text = contrastText(a.bgColor, opacity);
  const soft = hexToRgba(text, 0.07);
  const hover = hexToRgba(text, 0.12);
  const muted = hexToRgba(text, 0.62);
  const accent = a.indicatorColor;
  const radius = Math.max(8, Math.min(20, a.radius + 2));

  const everything: Result[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Result[] = [];
    const push = (r: Result) => {
      const k = r.name.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(r);
    };
    pinned.forEach((p) => push({ key: p.id, name: p.name, path: p.path, args: p.args, custom: p.customIcon, kind: p.kind }));
    SYSTEM_SHORTCUTS.forEach((s) => push({ key: s.path, name: s.name, path: s.path }));
    apps.forEach((ap) => push({ key: ap.path, name: ap.name, path: ap.path }));
    return out;
  }, [pinned, apps]);

  const results = useMemo(() => (query.trim() ? searchByName(everything, query, 24) : []), [everything, query]);
  useEffect(() => setSelected(0), [query]);

  const launch = (r: { path: string; args?: string | null }) => {
    onLaunch(r.path, /\.lnk$/i.test(r.path) ? null : r.args || null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (query) setQuery("");
      else if (view === "all") setView("home");
      else onClose?.();
      return;
    }
    if (!query.trim()) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      const r = results[selected];
      if (r) launch(r);
      else onShell("search");
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, StartApp[]>();
    for (const ap of apps) {
      const l = appLetter(ap.name);
      map.set(l, [...(map.get(l) || []), ap]);
    }
    return [...map.entries()].sort(([x], [y]) => (x === "#" ? -1 : y === "#" ? 1 : x.localeCompare(y)));
  }, [apps]);

  const rowStyle: React.CSSProperties = { ["--sm-hover" as any]: hover };
  const row = "flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:[background:var(--sm-hover)]";
  const sectionTitle = (label: string, action?: React.ReactNode) => (
    <div className="mb-2 mt-1 flex items-center justify-between px-1">
      <span className="text-[13px] font-semibold">{label}</span>
      {action}
    </div>
  );
  const pillButton = (label: React.ReactNode, onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors hover:[background:var(--sm-hover)]" style={{ background: soft, ...rowStyle }}>
      {label}
    </button>
  );

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ ...dockBarBackground(look), borderRadius: radius, color: text, boxSizing: "border-box", fontSize: 13 }}
      onKeyDown={onKeyDown}
    >
      <div className="px-5 pb-2 pt-5">
        <div className="flex items-center gap-2 rounded-full px-3.5 py-2" style={{ background: soft, border: `1px solid ${hexToRgba(text, 0.1)}` }}>
          <Search size={16} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar apps, configurações…"
            className="w-full bg-transparent text-[13px] outline-none"
            style={{ color: text, ["--tw-placeholder" as any]: muted }}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3" style={{ scrollbarWidth: "thin" }}>
        {query.trim() ? (
          <div className="pt-1">
            {sectionTitle(results.length ? "Melhores resultados" : "Nenhum app encontrado")}
            {results.map((r, i) => (
              <button
                key={r.key}
                type="button"
                className={row}
                style={{ ...rowStyle, background: i === selected ? hover : undefined }}
                onMouseEnter={() => setSelected(i)}
                onClick={() => launch(r)}
              >
                <ResultIcon r={r} size={28} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                {i === selected && <span style={{ color: muted, fontSize: 11 }}>Enter</span>}
              </button>
            ))}
            <button type="button" className={`${row} mt-2`} style={rowStyle} onClick={() => onShell("search")}>
              <span className="flex items-center justify-center rounded-md" style={{ width: 28, height: 28, background: soft }}>
                <Search size={15} />
              </span>
              <span className="flex-1">Pesquisar “{query.trim()}” no Windows</span>
            </button>
          </div>
        ) : view === "all" ? (
          <div className="pt-1">
            {sectionTitle(
              "Todos os aplicativos",
              pillButton(
                <>
                  <ArrowLeft size={13} /> Voltar
                </>,
                () => setView("home")
              )
            )}
            {!apps.length && <p className="px-1 py-4 text-[12px]" style={{ color: muted }}>Carregando os atalhos do menu Iniciar…</p>}
            {grouped.map(([letter, list]) => (
              <div key={letter} className="mb-1">
                <div className="px-2.5 py-1 text-[12px] font-bold" style={{ color: accent }}>
                  {letter}
                </div>
                {list.map((ap) => (
                  <div key={ap.path} className="group relative">
                    <button type="button" className={row} style={rowStyle} onClick={() => launch(ap)} title={ap.folder ? `${ap.folder} › ${ap.name}` : ap.name}>
                      <DockIcon path={ap.path} size={24} />
                      <span className="min-w-0 flex-1 truncate">{ap.name}</span>
                    </button>
                    {onPin && (
                      <button
                        type="button"
                        title="Fixar no dock"
                        onClick={() => onPin(ap.path)}
                        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md p-1 group-hover:block hover:[background:var(--sm-hover)]"
                        style={rowStyle}
                      >
                        <Pin size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            {sections.pinned && (
              <>
                {sectionTitle(
                  "Fixados",
                  sections.allApps
                    ? pillButton(
                        <>
                          Todos os apps <ChevronRight size={13} />
                        </>,
                        () => setView("all")
                      )
                    : null
                )}
                {pinned.length ? (
                  <div className="grid grid-cols-6 gap-1">
                    {pinned.slice(0, 18).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => launch(p)}
                        className="flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 transition-colors hover:[background:var(--sm-hover)]"
                        style={rowStyle}
                        title={p.name}
                      >
                        <DockIcon path={p.path} customIcon={p.customIcon} kind={p.kind} size={32} />
                        <span className="w-full truncate text-center text-[11.5px]">{p.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg px-3 py-3 text-[12px]" style={{ background: soft, color: muted }}>
                    Os apps fixados no dock aparecem aqui. Abra “Todos os apps” e use o alfinete para fixar.
                  </p>
                )}
              </>
            )}

            {sectionTitle(sections.pinned ? "Do sistema" : "Atalhos", !sections.pinned && sections.allApps ? pillButton(<>Todos os apps <ChevronRight size={13} /></>, () => setView("all")) : null)}
            <div className="grid grid-cols-2 gap-1">
              {SYSTEM_SHORTCUTS.map((s) => (
                <button key={s.path} type="button" className={row} style={rowStyle} onClick={() => launch(s)}>
                  <span className="flex items-center justify-center rounded-md text-white" style={{ width: 28, height: 28, background: s.color }}>
                    <s.icon size={15} />
                  </span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
              <button type="button" className={row} style={rowStyle} onClick={() => onShell("explorer")}>
                <DockIcon path="C:\Windows\explorer.exe" kind="folder" size={28} />
                <span className="truncate">Explorador de Arquivos</span>
              </button>
              <button type="button" className={row} style={rowStyle} onClick={() => onShell("start")}>
                <span className="flex items-center justify-center rounded-md" style={{ width: 28, height: 28, background: soft }}>
                  <Windows size={15} />
                </span>
                <span className="truncate">Iniciar do Windows</span>
              </button>
            </div>

            {!sections.pinned && sections.allApps && apps.length > 0 && (
              <>
                {sectionTitle("Aplicativos")}
                {apps.slice(0, 12).map((ap) => (
                  <button key={ap.path} type="button" className={row} style={rowStyle} onClick={() => launch(ap)}>
                    <DockIcon path={ap.path} size={24} />
                    <span className="min-w-0 flex-1 truncate">{ap.name}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {(sections.user || sections.power) && (
        <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ background: hexToRgba(text, 0.05), borderTop: `1px solid ${hexToRgba(text, 0.08)}` }}>
          {sections.user ? (
            <button type="button" className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:[background:var(--sm-hover)]" style={rowStyle} onClick={() => onLaunch("ms-settings:accounts")} title="Contas">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.6)})` }}>
                {(userName || "?").charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-[12.5px] font-medium">{userName || "Usuário"}</span>
            </button>
          ) : (
            <span />
          )}
          {sections.power &&
            (confirm ? (
              <div className="flex items-center gap-1.5 text-[12px]">
                <span style={{ color: muted }}>{POWER_LABELS[confirm]} agora?</span>
                <button type="button" className="rounded-md px-2.5 py-1 font-semibold text-white" style={{ background: confirm === "signout" ? accent : "#dc2626" }} onClick={() => onPower(confirm)}>
                  Sim
                </button>
                {pillButton("Cancelar", () => setConfirm(null))}
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <PowerButton title="Bloquear" onClick={() => onPower("lock")} style={rowStyle}>
                  <Lock size={16} />
                </PowerButton>
                <PowerButton title="Sair da conta" onClick={() => setConfirm("signout")} style={rowStyle}>
                  <LogOut size={16} />
                </PowerButton>
                <PowerButton title="Reiniciar" onClick={() => setConfirm("restart")} style={rowStyle}>
                  <RotateCw size={16} />
                </PowerButton>
                <PowerButton title="Desligar" onClick={() => setConfirm("shutdown")} style={rowStyle}>
                  <Power size={16} />
                </PowerButton>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const PowerButton: React.FC<{ title: string; onClick: () => void; style: React.CSSProperties; children: React.ReactNode }> = ({ title, onClick, style, children }) => (
  <button type="button" title={title} onClick={onClick} className="rounded-lg p-2 transition-colors hover:[background:var(--sm-hover)]" style={style}>
    {children}
  </button>
);

const ResultIcon: React.FC<{ r: Result; size: number }> = ({ r, size }) => {
  const sys = SYSTEM_SHORTCUTS.find((s) => s.path === r.path);
  if (sys) {
    return (
      <span className="flex items-center justify-center rounded-md text-white" style={{ width: size, height: size, background: sys.color }}>
        <sys.icon size={Math.round(size * 0.55)} />
      </span>
    );
  }
  return <DockIcon path={r.path} customIcon={r.custom} kind={r.kind} size={size} />;
};

/** The "dockmenu" window: hides itself when it loses focus, like the real Start menu. */
export const DockStartMenuWindow: React.FC = () => {
  const appearance = useDockStore((s) => s.appearance);
  const sections = useDockStore((s) => s.behavior.startMenuSections);
  const entries = useDockStore((s) => s.entries);
  const pinned = useMemo(() => flattenItems(entries).filter((i) => i.kind !== "missing"), [entries]);
  const [apps, setApps] = useState<StartApp[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    for (const el of [document.documentElement, document.body, document.getElementById("root")]) {
      if (!el) continue;
      el.classList.add("is-transparent-window");
      el.style.background = "transparent";
      el.style.overflow = "hidden";
    }
    const load = () => dockService.listStartApps().then(setApps).catch(() => {});
    load();
    dockService.userName().then(setUserName).catch(() => {});
    const offs: Array<Promise<() => void>> = [
      listen("dockmenu://opened", () => {
        setFocusKey((k) => k + 1);
        load();
      }),
    ];
    if (isTauriRuntime()) {
      offs.push(
        getCurrentWebviewWindow().onFocusChanged(({ payload: focused }) => {
          if (focused) return;
          emit("dockmenu://hidden").catch(() => {});
          dockService.menuHide().catch(() => {});
        })
      );
    }
    return () => offs.forEach((p) => p.then((f) => f()).catch(() => {}));
  }, []);

  const close = () => {
    emit("dockmenu://hidden").catch(() => {});
    dockService.menuHide().catch(() => {});
  };
  const run = (p: Promise<unknown>) => {
    setError(null);
    p.then(close).catch((e) => setError(String(e)));
  };

  return (
    <div className="fixed inset-0 select-none p-px">
      <StartMenuPanel
        appearance={appearance}
        sections={sections}
        pinned={pinned}
        apps={apps}
        userName={userName}
        focusKey={focusKey}
        onLaunch={(path, args) => run(dockService.launch(path, args))}
        onShell={(action) => run(dockService.shellAction(action))}
        onPower={(action) => run(dockService.powerAction(action))}
        onPin={(path) => void addPathsToDock([path]).catch((e) => setError(String(e)))}
        onClose={close}
      />
      {error && (
        <div className="absolute bottom-16 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-lg" style={{ background: "rgba(190, 24, 93, 0.92)" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default DockStartMenuWindow;
