import React, { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Brush, CheckCircle2, Layers, LayoutPanelTop, MonitorSmartphone, Palette, PanelBottom, RotateCcw, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/core/components/Button";
import { Card } from "@/core/components/Card";
import { Modal } from "@/core/components/Modal";
import { DockAppearance, DockBehavior } from "../types";
import { Toggle } from "@/core/components/Toggle";
import { useToast } from "@/core/components/Toast";
import { useDockStore } from "../store/dockStore";
import { dockService, isTauriRuntime } from "../dockService";
import { addPathsToDock } from "../dockActions";
import { setDockEnabled, startCentered } from "../dockLifecycle";
import { BUILTIN_THEMES, DEFAULT_APPEARANCE, MACOS_LAYOUT, MACOS_THEME_ID, WIN11_LAYOUT, WIN11_THEME_ID } from "../themes";

type StylePreset = "macos" | "win11";

const STYLE_PRESETS: { id: StylePreset; emoji: string; name: string; description: string }[] = [
  {
    id: "macos",
    emoji: "🍎",
    name: "Estilo macOS",
    description: "Dock centralizado com ampliação, Iniciar em forma de Launchpad e o relógio com a bandeja à direita.",
  },
  {
    id: "win11",
    emoji: "🪟",
    name: "Windows 11 flutuante",
    description: "Barra flutuante centralizada com Iniciar, Pesquisar e apps, e uma pílula à direita com relógio, idioma, rede e bandeja.",
  },
];
import { DockPreview, TaskbarMock } from "../components/DockPreview";
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
  const startButton = useDockStore((s) => s.behavior.startButton);
  const trayStyle = useDockStore((s) => s.behavior.trayStyle);
  const behavior = useDockStore((s) => s.behavior);
  const activeThemeId = useDockStore((s) => s.activeThemeId);
  const activePreset: StylePreset | null = !startButton ? null : activeThemeId === MACOS_THEME_ID ? "macos" : activeThemeId === WIN11_THEME_ID ? "win11" : null;

  const [confirmPreset, setConfirmPreset] = useState<StylePreset | null>(null);
  const replaced = taskbarMode.enabled && taskbarMode.hide;

  const presetBehavior = (preset: StylePreset): Partial<DockBehavior> => ({
    startButton: true,
    autoHide: "never",
    showRunning: true,
    startWithApp: true,
    // Reserving the strip keeps maximized windows above the dock, like the real taskbar did.
    reserveSpace: true,
    trayStyle: "pill",
    startMenu: "dock",
    shellButtons: preset === "win11" ? ["search", "taskview"] : [],
  });
  const presetAppearance = (preset: StylePreset): DockAppearance => {
    const theme = BUILTIN_THEMES.find((t) => t.id === (preset === "win11" ? WIN11_THEME_ID : MACOS_THEME_ID));
    return { ...appearance, ...(theme?.appearance || {}), ...(preset === "win11" ? WIN11_LAYOUT : MACOS_LAYOUT) };
  };

  /** Applies the look; with `replace`, also hides the Windows taskbar (the user just saw the preview and confirmed). */
  const applyStyle = async (preset: StylePreset, replace: boolean) => {
    setConfirmPreset(null);
    const s = useDockStore.getState();
    s.setBehavior(presetBehavior(preset));
    s.setAppearance(preset === "win11" ? WIN11_LAYOUT : MACOS_LAYOUT);
    s.applyTheme(preset === "win11" ? WIN11_THEME_ID : MACOS_THEME_ID);
    if (!isTauriRuntime()) return;
    if (!s.enabled) await toggleDock(true);
    if (!useDockStore.getState().enabled) return;
    if (!replace) {
      addToast("Visual aplicado. A barra do Windows continua como estava.", "success");
      return;
    }
    setSwitching(true);
    try {
      const status = await dockService.taskbarApply(true, true, startCentered());
      s.setTaskbarMode({ enabled: true, autohide: true, hide: true });
      addToast(
        status.hidden
          ? "Pronto! O dock substituiu a barra do Windows. Para voltar, use “Restaurar barra do Windows”."
          : "O dock está ligado, mas o Windows não deixou esconder a barra agora. Tente de novo em “Barra do Windows”.",
        status.hidden ? "success" : "warning"
      );
    } catch (e) {
      addToast(String(e), "warning");
    } finally {
      setSwitching(false);
    }
  };

  const restoreTaskbar = async () => {
    setSwitching(true);
    try {
      await dockService.taskbarRestore();
      useDockStore.getState().setTaskbarMode({ enabled: false, hide: false });
      addToast("Barra do Windows restaurada como era antes.", "success");
    } catch (e) {
      addToast(String(e), "warning");
    } finally {
      setSwitching(false);
    }
  };

  const undoStyle = async () => {
    const s = useDockStore.getState();
    s.setBehavior({ startButton: false, reserveSpace: false, startMenu: "windows", shellButtons: [] });
    s.applyTheme("aero-glass");
    const d = DEFAULT_APPEARANCE;
    s.setAppearance({ align: d.align, iconSize: d.iconSize, spacing: d.spacing, padding: d.padding, offset: d.offset, magnify: d.magnify });
    if (s.taskbarMode.enabled) await restoreTaskbar();
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

      {replaced && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-cute border border-emerald-500/40 bg-emerald-500/10 p-3.5">
          <div className="flex items-center gap-2.5 text-xs text-theme-text">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
            <span>
              <b>O dock está substituindo a barra do Windows.</b> A barra original volta sozinha se o dock ou o aplicativo fechar.
            </span>
          </div>
          <Button size="sm" variant="danger" icon={<RotateCcw size={14} />} onClick={restoreTaskbar} disabled={switching}>
            Restaurar barra do Windows
          </Button>
        </div>
      )}

      <Card className="flex flex-col gap-3 !p-4">
        <span className="text-xs text-theme-text-muted">
          <b className="text-theme-text">Estilos prontos:</b> o dock vira sua barra principal, com o Iniciar, os apps abertos e o relógio à direita, e a
          barra do Windows sai de cena de verdade. Antes de mudar qualquer coisa você vê a prévia e confirma.
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
                  <div className="flex flex-col gap-1.5">
                    {!replaced && (
                      <Button size="sm" icon={<Sparkles size={14} />} onClick={() => setConfirmPreset(p.id)} disabled={switching}>
                        Substituir a barra
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={undoStyle} disabled={switching}>
                      Desfazer
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" icon={<Sparkles size={14} />} onClick={() => setConfirmPreset(p.id)} disabled={switching}>
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
        {tab === "taskbar" && <TaskbarModePanel />}
      </Card>

      <Modal
        isOpen={!!confirmPreset}
        onClose={() => setConfirmPreset(null)}
        title={confirmPreset ? `Ativar ${STYLE_PRESETS.find((p) => p.id === confirmPreset)!.name}` : ""}
        maxWidth="2xl"
      >
        {confirmPreset && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-theme-text-muted">Agora</span>
                <div className="relative h-14 overflow-hidden rounded-lg border border-theme-border/60 bg-gradient-to-br from-indigo-400/50 to-pink-400/50">
                  <TaskbarMock compact={false} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-theme-text-muted">Como vai ficar</span>
                <DockPreview
                  entries={entries}
                  appearance={presetAppearance(confirmPreset)}
                  showRunning
                  startButton
                  taskbarHidden
                  trayStyle="pill"
                  shellButtons={presetBehavior(confirmPreset).shellButtons}
                  trayItems={behavior.trayItems}
                  height={170}
                />
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-theme-text">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-theme-primary" />A barra do Windows fica escondida enquanto o dock estiver aberto, e o
                dock ocupa o lugar dela.
              </li>
              <li className="flex gap-2">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                O Iniciar, a bandeja, o relógio e as notificações continuam sendo os verdadeiros do Windows (tecla Windows e Win + B também funcionam).
              </li>
              <li className="flex gap-2">
                <RotateCcw size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>
                  A barra volta sozinha se você fechar o dock ou o aplicativo, se ele travar e ao desinstalar. E o botão <b>Restaurar barra do Windows</b> fica
                  no topo desta página e no clique direito do Iniciar do dock.
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmPreset(null)}>
                Cancelar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyStyle(confirmPreset, false)} disabled={switching}>
                Só o visual (manter a barra)
              </Button>
              <Button size="sm" icon={<Sparkles size={14} />} onClick={() => applyStyle(confirmPreset, true)} disabled={switching || !isTauriRuntime()}>
                Substituir a barra do Windows
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <p className="text-center text-[11px] text-theme-text-muted">
        Inspirado no Seelen UI e no Cairo Desktop. Tudo é salvo automaticamente. Detalhes e licenças em Sobre.
      </p>
    </div>
  );
};

export default DockView;
