import React, { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Brush, Layers, LayoutPanelTop, MonitorSmartphone, Palette, PanelBottom, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/core/components/Button";
import { Card } from "@/core/components/Card";
import { Toggle } from "@/core/components/Toggle";
import { useToast } from "@/core/components/Toast";
import { useDockStore } from "../store/dockStore";
import { dockService, isTauriRuntime } from "../dockService";
import { addPathsToDock } from "../dockActions";
import { setDockEnabled } from "../dockLifecycle";
import { DEFAULT_APPEARANCE, MACOS_LAYOUT, MACOS_THEME_ID, WIN11_LAYOUT, WIN11_THEME_ID } from "../themes";

type StylePreset = "macos" | "win11";

const STYLE_PRESETS: { id: StylePreset; emoji: string; name: string; description: string }[] = [
  {
    id: "macos",
    emoji: "🍎",
    name: "Estilo macOS",
    description: "Dock centralizado com ampliação, Iniciar em forma de Launchpad e um relógio no fim do dock que abre a bandeja.",
  },
  {
    id: "win11",
    emoji: "🪟",
    name: "Windows 11 flutuante",
    description: "Barra flutuante à esquerda com Iniciar e apps, e uma pílula separada à direita com relógio, idioma, rede e bandeja.",
  },
];
import { DockPreview } from "../components/DockPreview";
import { BehaviorSection, ItemsSection, PositionSection, SizeSection, ThemesSection, VisualSection } from "../components/DockSettingsSections";
import { TaskbarModePanel } from "../components/TaskbarModePanel";

type Tab = "items" | "position" | "size" | "visual" | "themes" | "behavior" | "taskbar";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "items", label: "Itens", icon: <Layers size={14} /> },
  { id: "position", label: "Posição", icon: <MonitorSmartphone size={14} /> },
  { id: "size", label: "Tamanho e animação", icon: <Sparkles size={14} /> },
  { id: "visual", label: "Visual", icon: <Brush size={14} /> },
  { id: "themes", label: "Temas", icon: <Palette size={14} /> },
  { id: "behavior", label: "Comportamento", icon: <Settings2 size={14} /> },
  { id: "taskbar", label: "Barra do Windows", icon: <LayoutPanelTop size={14} /> },
];

export const DockView: React.FC = () => {
  const enabled = useDockStore((s) => s.enabled);
  const entries = useDockStore((s) => s.entries);
  const appearance = useDockStore((s) => s.appearance);
  const showRunning = useDockStore((s) => s.behavior.showRunning);
  const taskbarMode = useDockStore((s) => s.taskbarMode);
  const moveEntry = useDockStore((s) => s.moveEntry);
  const groupItems = useDockStore((s) => s.groupItems);
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("items");
  const [selected, setSelected] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [suggestAutohide, setSuggestAutohide] = useState(0);
  const startButton = useDockStore((s) => s.behavior.startButton);
  const trayStyle = useDockStore((s) => s.behavior.trayStyle);
  const behavior = useDockStore((s) => s.behavior);
  const activeThemeId = useDockStore((s) => s.activeThemeId);
  const activePreset: StylePreset | null = !startButton ? null : activeThemeId === MACOS_THEME_ID ? "macos" : activeThemeId === WIN11_THEME_ID ? "win11" : null;

  const applyStyle = async (preset: StylePreset) => {
    const s = useDockStore.getState();
    // Reserving the strip keeps maximized windows above the dock, like the real taskbar did.
    s.setBehavior({
      startButton: true,
      autoHide: "never",
      showRunning: true,
      startWithApp: true,
      reserveSpace: true,
      trayStyle: preset === "win11" ? "pill" : "inDock",
      startMenu: "dock",
      shellButtons: preset === "win11" ? ["search", "taskview"] : [],
    });
    s.setAppearance(preset === "win11" ? WIN11_LAYOUT : MACOS_LAYOUT);
    s.applyTheme(preset === "win11" ? WIN11_THEME_ID : MACOS_THEME_ID);
    if (!s.enabled && isTauriRuntime()) await toggleDock(true);
    // The Windows taskbar only changes after the user reviews the preview and clicks "Aplicar".
    setTab("taskbar");
    setSuggestAutohide(Date.now());
  };

  const undoStyle = async () => {
    const s = useDockStore.getState();
    s.setBehavior({ startButton: false, reserveSpace: false, trayStyle: "inDock", startMenu: "windows", shellButtons: [] });
    s.applyTheme("aero-glass");
    const d = DEFAULT_APPEARANCE;
    s.setAppearance({ align: d.align, iconSize: d.iconSize, spacing: d.spacing, padding: d.padding, offset: d.offset, magnify: d.magnify });
    if (s.taskbarMode.enabled && s.taskbarMode.hide) {
      await dockService
        .taskbarApply(s.taskbarMode.autohide, false)
        .then(() => s.setTaskbarMode({ hide: false }))
        .catch((e) => addToast(String(e), "warning"));
    }
    setTab("taskbar");
  };

  // Drop shortcuts/apps/folders from Explorer onto this page.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        const p = event.payload;
        if (p.type === "enter" || p.type === "over") setDropping(true);
        else if (p.type === "leave") setDropping(false);
        else if (p.type === "drop") {
          setDropping(false);
          const n = await addPathsToDock(p.paths);
          if (n) addToast(n === 1 ? "Adicionado ao dock!" : `${n} itens adicionados ao dock!`, "sparkle");
          else if (p.paths.length) addToast("Esses itens já estão no dock.", "info");
        }
      })
      .then((fn) => (unlisten = fn))
      .catch(() => {});
    return () => unlisten?.();
  }, [addToast]);

  const toggleDock = async (on: boolean) => {
    setSwitching(true);
    try {
      await setDockEnabled(on);
      addToast(on ? "Dock ligado! ✨" : "Dock desligado.", on ? "sparkle" : "info");
    } catch (e) {
      useDockStore.getState().setEnabled(false);
      addToast(String(e), "warning");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative mx-auto flex max-w-5xl flex-col gap-5 py-2">
      {dropping && (
        <div className="pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-3xl border-4 border-dashed border-theme-primary bg-theme-primary/10 text-lg font-bold text-theme-primary backdrop-blur-sm">
          Solte para adicionar ao dock 💕
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-theme-text">
            <PanelBottom className="text-theme-primary" /> Dock
          </h2>
          <p className="mt-1 text-xs text-theme-text-muted">Uma barra de apps bonitinha na borda da tela, com seus atalhos, pastas e sites favoritos.</p>
        </div>
        <Card className="!p-3">
          <div className="min-w-[260px]">
            <Toggle
              label={enabled ? "Dock ligado" : "Dock desligado"}
              description={isTauriRuntime() ? "Aparece na área de trabalho, por cima das janelas." : "Disponível no aplicativo instalado."}
              checked={enabled}
              onChange={toggleDock}
              disabled={switching || !isTauriRuntime()}
            />
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 !p-4">
        <span className="text-xs text-theme-text-muted">
          <b className="text-theme-text">Estilos prontos:</b> o dock vira sua barra principal, com o Iniciar dentro dele junto com os apps abertos, e a barra
          do Windows sai de cena de verdade (depois da prévia e do botão Aplicar).
        </span>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {STYLE_PRESETS.map((p) => {
            const active = activePreset === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-cute border p-3 transition ${
                  active ? "border-emerald-500/60 bg-emerald-500/5" : "border-theme-border/60 bg-theme-surface-card"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-xl shadow-inner">
                  {p.emoji}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-bold text-theme-text">
                    {p.name} {active && <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">ativo</span>}
                  </span>
                  <span className="text-[11px] leading-snug text-theme-text-muted">{p.description}</span>
                </div>
                {active ? (
                  <Button size="sm" variant="secondary" onClick={undoStyle}>
                    Desfazer
                  </Button>
                ) : (
                  <Button size="sm" icon={<Sparkles size={14} />} onClick={() => applyStyle(p.id)} disabled={switching}>
                    Ativar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="sticky top-0 z-10 -mx-1 rounded-3xl bg-theme-bg/80 px-1 pb-1 pt-1 backdrop-blur-md">
        <DockPreview
          entries={entries}
          appearance={appearance}
          showRunning={showRunning}
          startButton={startButton}
          compactTaskbar={taskbarMode.enabled}
          taskbarAutohide={taskbarMode.enabled && taskbarMode.autohide}
          taskbarHidden={!!activePreset || (enabled && taskbarMode.enabled && taskbarMode.hide)}
          trayStyle={trayStyle}
          shellButtons={behavior.shellButtons}
          trayItems={behavior.trayItems}
          startMenuSections={behavior.startMenu === "dock" ? behavior.startMenuSections : undefined}
          onMove={moveEntry}
          onGroup={groupItems}
          onSelect={(id) => {
            setSelected(id);
            setTab("items");
          }}
        />
        <p className="mt-1.5 text-center text-[11px] text-theme-text-muted">
          Prévia ao vivo: passe o mouse para ver a ampliação, arraste para reordenar e solte um ícone sobre outro para agrupar.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? "border-theme-primary bg-theme-primary text-white shadow-soft"
                : "border-theme-border/60 bg-theme-surface text-theme-text-muted hover:border-theme-primary/50 hover:text-theme-text"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {tab === "items" && <ItemsSection selectedId={selected} onSelect={setSelected} />}
        {tab === "position" && <PositionSection />}
        {tab === "size" && <SizeSection />}
        {tab === "visual" && <VisualSection />}
        {tab === "themes" && <ThemesSection />}
        {tab === "behavior" && <BehaviorSection />}
        {tab === "taskbar" && <TaskbarModePanel suggestAutohide={suggestAutohide} />}
      </Card>

      <p className="text-center text-[11px] text-theme-text-muted">
        Inspirado no Seelen UI e no Cairo Desktop. Tudo é salvo automaticamente. Detalhes e licenças em Sobre.
      </p>
    </div>
  );
};

export default DockView;
