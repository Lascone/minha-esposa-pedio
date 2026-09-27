import React, { useEffect, useMemo, useState } from "react";
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignStartHorizontal,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  FolderPlus,
  Globe,
  ImagePlus,
  Minus,
  Pin,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Ungroup,
} from "lucide-react";
import { Button } from "@/core/components/Button";
import { Slider } from "@/core/components/Slider";
import { Toggle } from "@/core/components/Toggle";
import { useToast } from "@/core/components/Toast";
import { useDockStore } from "../store/dockStore";
import { BUILTIN_THEMES } from "../themes";
import { DockAppearance, DockEntry, DockLaunchItem, DockMonitor, DockShellButton, DockTheme, DockWindowInfo } from "../types";
import { dockService } from "../dockService";
import { addPathsToDock, pickAndAddToDock, pickCustomIcon } from "../dockActions";
import { buildSlots, matchWindows } from "../logic";
import { DockIcon } from "./DockIcon";
import { DockBar, SHELL_BUTTON_LABELS, ShellButtonIcon } from "./DockBar";

// ---------------------------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------------------------

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-cute border border-theme-border/60 bg-theme-surface-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 ${
            value === o.value ? "bg-theme-primary text-white shadow-soft" : "text-theme-text-muted hover:bg-theme-primary-light hover:text-theme-text"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold text-theme-text">{label}</span>
    {children}
    {hint && <span className="text-[11px] text-theme-text-muted">{hint}</span>}
  </div>
);

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border border-theme-border/60 bg-transparent p-0.5"
        />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          className="h-8 w-24 rounded-md border border-theme-border/60 bg-theme-surface-card px-2 font-mono text-xs text-theme-text outline-none focus:border-theme-primary"
        />
      </div>
    </Field>
  );
};

const pct = (v: number) => Math.round(v * 100);

// ---------------------------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------------------------

export const ItemsSection: React.FC<{ selectedId: string | null; onSelect: (id: string | null) => void }> = ({ selectedId, onSelect }) => {
  const entries = useDockStore((s) => s.entries);
  const store = useDockStore();
  const { addToast } = useToast();
  const [url, setUrl] = useState("");
  const [windows, setWindows] = useState<DockWindowInfo[]>([]);

  useEffect(() => {
    dockService.listWindows().then(setWindows).catch(() => {});
  }, [entries.length]);

  const unpinned = useMemo(() => matchWindows(entries, windows).unpinned.filter((u) => !u.exe.startsWith("pid:")), [entries, windows]);

  const run = async (p: Promise<number>) => {
    try {
      const n = await p;
      if (n > 0) addToast(n === 1 ? "Adicionado ao dock!" : `${n} itens adicionados ao dock!`, "sparkle");
    } catch (e) {
      addToast(String(e), "warning");
    }
  };

  const addUrl = async () => {
    const value = url.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(value)) {
      addToast("Digite um endereço começando com http:// ou https://", "warning");
      return;
    }
    await run(addPathsToDock([value]));
    setUrl("");
  };

  const changeIcon = async (id: string) => {
    try {
      const icon = await pickCustomIcon();
      if (icon) store.updateItem(id, { customIcon: icon });
    } catch (e) {
      addToast(String(e), "warning");
    }
  };

  const itemRow = (item: DockLaunchItem, index: number, groupId?: string) => (
    <div
      key={item.id}
      onClick={() => onSelect(item.id)}
      className={`flex items-center gap-2.5 rounded-cute border p-2 transition-all ${
        selectedId === item.id ? "border-theme-primary bg-theme-primary/5" : "border-theme-border/50 bg-theme-surface-card hover:border-theme-primary/40"
      } ${groupId ? "ml-8" : ""}`}
    >
      <DockIcon path={item.path} customIcon={item.customIcon} kind={item.kind} size={32} />
      <div className="flex min-w-0 flex-1 flex-col">
        <input
          value={item.name}
          onChange={(e) => store.updateItem(item.id, { name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded bg-transparent px-1 text-sm font-semibold text-theme-text outline-none focus:bg-theme-surface"
        />
        <span className="truncate px-1 text-[10px] text-theme-text-muted" title={item.path}>
          {item.kind === "missing" ? "⚠ Não encontrado · " : ""}
          {item.path}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {!groupId && (
          <>
            <IconBtn title="Mover para cima" onClick={() => store.moveEntry(item.id, index - 1)} disabled={index === 0}>
              <ChevronUp size={14} />
            </IconBtn>
            <IconBtn title="Mover para baixo" onClick={() => store.moveEntry(item.id, index + 1)} disabled={index === entries.length - 1}>
              <ChevronDown size={14} />
            </IconBtn>
          </>
        )}
        <IconBtn title="Mudar ícone" onClick={() => changeIcon(item.id)}>
          <ImagePlus size={14} />
        </IconBtn>
        {item.customIcon && (
          <IconBtn title="Usar ícone original" onClick={() => store.updateItem(item.id, { customIcon: undefined })}>
            <RotateCcw size={14} />
          </IconBtn>
        )}
        {item.kind !== "url" && (
          <IconBtn title="Abrir local do arquivo" onClick={() => dockService.reveal(item.path).catch((e) => addToast(String(e), "warning"))}>
            <FolderOpen size={14} />
          </IconBtn>
        )}
        {groupId && (
          <IconBtn title="Tirar do grupo" onClick={() => store.takeOutOfGroup(item.id, entries.findIndex((e) => e.id === groupId) + 1)}>
            <Ungroup size={14} />
          </IconBtn>
        )}
        <IconBtn title="Desafixar" danger onClick={() => store.removeEntry(item.id)}>
          <Trash2 size={14} />
        </IconBtn>
      </div>
    </div>
  );

  const entryRow = (e: DockEntry, index: number) => {
    if (e.type === "item") return itemRow(e, index);
    if (e.type === "separator") {
      return (
        <div key={e.id} className="flex items-center gap-2 px-2 py-1">
          <div className="h-px flex-1 bg-theme-border" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">Separador</span>
          <div className="h-px flex-1 bg-theme-border" />
          <IconBtn title="Mover para cima" onClick={() => store.moveEntry(e.id, index - 1)} disabled={index === 0}>
            <ChevronUp size={14} />
          </IconBtn>
          <IconBtn title="Mover para baixo" onClick={() => store.moveEntry(e.id, index + 1)} disabled={index === entries.length - 1}>
            <ChevronDown size={14} />
          </IconBtn>
          <IconBtn title="Remover" danger onClick={() => store.removeEntry(e.id)}>
            <Trash2 size={14} />
          </IconBtn>
        </div>
      );
    }
    return (
      <div key={e.id} className="flex flex-col gap-1.5">
        <div
          onClick={() => onSelect(e.id)}
          className={`flex items-center gap-2.5 rounded-cute border p-2 ${selectedId === e.id ? "border-theme-primary bg-theme-primary/5" : "border-theme-border/50 bg-theme-surface-card"}`}
        >
          <div className="grid h-8 w-8 grid-cols-2 place-items-center gap-0.5 rounded-lg bg-theme-primary/10 p-0.5">
            {e.items.slice(0, 4).map((it) => (
              <DockIcon key={it.id} path={it.path} customIcon={it.customIcon} kind={it.kind} size={13} />
            ))}
          </div>
          <input
            value={e.name}
            onChange={(ev) => store.renameGroup(e.id, ev.target.value)}
            onClick={(ev) => ev.stopPropagation()}
            className="min-w-0 flex-1 rounded bg-transparent px-1 text-sm font-bold text-theme-text outline-none focus:bg-theme-surface"
          />
          <span className="text-[10px] text-theme-text-muted">{e.items.length} itens</span>
          <div className="flex items-center gap-0.5" onClick={(ev) => ev.stopPropagation()}>
            <IconBtn title="Mover para cima" onClick={() => store.moveEntry(e.id, index - 1)} disabled={index === 0}>
              <ChevronUp size={14} />
            </IconBtn>
            <IconBtn title="Mover para baixo" onClick={() => store.moveEntry(e.id, index + 1)} disabled={index === entries.length - 1}>
              <ChevronDown size={14} />
            </IconBtn>
            <IconBtn title="Desagrupar" onClick={() => store.ungroup(e.id)}>
              <Ungroup size={14} />
            </IconBtn>
            <IconBtn title="Remover grupo" danger onClick={() => store.removeEntry(e.id)}>
              <Trash2 size={14} />
            </IconBtn>
          </div>
        </div>
        {e.items.map((it) => itemRow(it, index, e.id))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Plus size={14} />} onClick={() => run(pickAndAddToDock("files"))}>
          App ou atalho…
        </Button>
        <Button size="sm" variant="secondary" icon={<FolderPlus size={14} />} onClick={() => run(pickAndAddToDock("folder"))}>
          Pasta…
        </Button>
        <Button size="sm" variant="secondary" icon={<Minus size={14} />} onClick={() => store.addSeparator()}>
          Separador
        </Button>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-cute border border-theme-border/60 bg-theme-surface-card px-2.5">
          <Globe size={14} className="text-theme-text-muted" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
            placeholder="https://site-favorito.com"
            className="h-9 flex-1 bg-transparent text-xs text-theme-text outline-none"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={addUrl}>
          Adicionar site
        </Button>
      </div>
      <p className="text-[11px] text-theme-text-muted">
        Dica: arraste atalhos, programas ou pastas do Explorer ou da área de trabalho para esta página ou direto para o dock. Na prévia, arraste para
        reordenar e solte um ícone em cima de outro para criar um grupo.
      </p>

      {unpinned.length > 0 && (
        <Field label="Apps abertos agora">
          <div className="flex flex-wrap gap-1.5">
            {unpinned.slice(0, 12).map((u) => (
              <button
                key={u.exe}
                type="button"
                onClick={() => run(addPathsToDock([u.exe]))}
                title={u.windows[0]?.title}
                className="flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface-card py-1 pl-1 pr-2.5 text-[11px] font-semibold text-theme-text transition hover:border-theme-primary"
              >
                <DockIcon path={u.exe} size={18} />
                {(u.exe.split("\\").pop() || u.exe).replace(/\.exe$/i, "")}
                <Pin size={11} className="text-theme-primary" />
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="flex flex-col gap-1.5">
        {entries.length === 0 ? (
          <div className="rounded-cute border border-dashed border-theme-border p-6 text-center text-xs text-theme-text-muted">
            Seu dock ainda está vazio. Adicione seus apps favoritos! 💕
          </div>
        ) : (
          entries.map((e, i) => entryRow(e, i))
        )}
      </div>
    </div>
  );
};

const IconBtn: React.FC<{ title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }> = ({
  title,
  onClick,
  disabled,
  danger,
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    className={`rounded-md p-1.5 transition disabled:opacity-30 ${danger ? "text-theme-text-muted hover:bg-red-500/10 hover:text-red-500" : "text-theme-text-muted hover:bg-theme-primary-light hover:text-theme-primary"}`}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------------------------

export const PositionSection: React.FC = () => {
  const a = useDockStore((s) => s.appearance);
  const set = useDockStore((s) => s.setAppearance);
  const [monitors, setMonitors] = useState<DockMonitor[]>([]);
  useEffect(() => {
    dockService.listMonitors().then(setMonitors).catch(() => {});
  }, []);
  const vertical = a.edge === "left" || a.edge === "right";

  return (
    <div className="flex flex-col gap-4">
      <Field label="Posição na tela">
        <Segmented
          value={a.edge}
          onChange={(edge) => set({ edge })}
          options={[
            { value: "bottom", label: "Embaixo", icon: <ArrowDown size={13} /> },
            { value: "top", label: "Em cima", icon: <ArrowUp size={13} /> },
            { value: "left", label: "Esquerda", icon: <ArrowLeft size={13} /> },
            { value: "right", label: "Direita", icon: <ArrowRight size={13} /> },
          ]}
        />
      </Field>
      <Field label="Monitor" hint={monitors.length <= 1 ? "Só um monitor detectado. Se você conectar outro, ele aparece aqui." : "Se o monitor escolhido for desconectado, o dock vai para o principal."}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(monitors.length ? monitors : [{ index: 0, name: "Monitor principal", primary: true, width: 0, height: 0, scale: 1 } as DockMonitor]).map((m) => (
            <button
              key={m.index}
              type="button"
              onClick={() => set({ monitor: m.index })}
              className={`flex flex-col rounded-cute border p-2.5 text-left transition ${
                a.monitor === m.index ? "border-theme-primary bg-theme-primary/5" : "border-theme-border/60 bg-theme-surface-card hover:border-theme-primary/40"
              }`}
            >
              <span className="text-xs font-bold text-theme-text">
                Monitor {m.index + 1} {m.primary ? "· principal" : ""}
              </span>
              {m.width > 0 && (
                <span className="text-[11px] text-theme-text-muted">
                  {m.width}×{m.height} · escala {Math.round(m.scale * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Alinhamento">
        <Segmented
          value={a.align}
          onChange={(align) => set({ align })}
          options={[
            { value: "start", label: vertical ? "Topo" : "Início", icon: <AlignStartHorizontal size={13} /> },
            { value: "center", label: "Centro", icon: <AlignCenter size={13} /> },
            { value: "end", label: vertical ? "Base" : "Fim", icon: <AlignEndHorizontal size={13} /> },
          ]}
        />
      </Field>
      <Field label="Comprimento">
        <Segmented
          value={a.length}
          onChange={(length) => set({ length })}
          options={[
            { value: "auto", label: "Do tamanho dos ícones" },
            { value: "full", label: "Borda inteira" },
          ]}
        />
      </Field>
      <Slider label="Distância da borda" value={a.offset} min={0} max={48} unit="px" onChange={(offset) => set({ offset })} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Size & animation
// ---------------------------------------------------------------------------------------------

export const SizeSection: React.FC = () => {
  const a = useDockStore((s) => s.appearance);
  const set = useDockStore((s) => s.setAppearance);
  const acrylic = a.background === "acrylic";
  return (
    <div className="flex flex-col gap-4">
      <Slider label="Tamanho dos ícones" value={a.iconSize} min={24} max={96} unit="px" onChange={(iconSize) => set({ iconSize })} />
      <Slider label="Espaço entre ícones" value={a.spacing} min={0} max={24} unit="px" onChange={(spacing) => set({ spacing })} />
      <Slider label="Margem interna" value={a.padding} min={2} max={24} unit="px" onChange={(padding) => set({ padding })} />
      <div className="h-px bg-theme-border/60" />
      <Toggle label="Animações" description="Ampliação, saltinho ao abrir, deslizar ao ocultar." checked={a.animations} onChange={(animations) => set({ animations })} />
      <Slider
        label={acrylic ? "Ampliação ao passar o mouse (indisponível com vidro do Windows)" : "Ampliação ao passar o mouse"}
        value={Math.round(a.magnify * 100)}
        min={100}
        max={250}
        step={5}
        unit="%"
        disabled={!a.animations || acrylic}
        onChange={(v) => set({ magnify: v / 100 })}
      />
      <Slider label="Velocidade das animações" value={Math.round(a.animSpeed * 100)} min={40} max={250} step={10} unit="%" disabled={!a.animations} onChange={(v) => set({ animSpeed: v / 100 })} />
      <Toggle label="Mostrar nome ao passar o mouse" checked={a.showLabels} onChange={(showLabels) => set({ showLabels })} disabled={acrylic} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------------------------

export const VisualSection: React.FC = () => {
  const a = useDockStore((s) => s.appearance);
  const set = useDockStore((s) => s.setAppearance);
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Fundo"
        hint={
          a.background === "acrylic"
            ? "Usa o desfoque real do Windows (Acrylic). Nesse modo a ampliação e os nomes flutuantes ficam desligados, porque a janela precisa ter o tamanho exato da barra."
            : a.background === "glass"
            ? "Vidro desenhado pelo app: translúcido com brilho. Para o desfoque real do que está atrás, escolha “Vidro do Windows”."
            : undefined
        }
      >
        <Segmented
          value={a.background}
          onChange={(background) => set({ background })}
          options={[
            { value: "solid", label: "Sólido" },
            { value: "translucent", label: "Translúcido" },
            { value: "glass", label: "Vidro" },
            { value: "acrylic", label: "Vidro do Windows" },
          ]}
        />
      </Field>
      {a.background !== "acrylic" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorField label="Cor do fundo" value={a.bgColor} onChange={(bgColor) => set({ bgColor })} />
          <Slider label="Opacidade do fundo" value={pct(a.bgOpacity)} min={0} max={100} unit="%" onChange={(v) => set({ bgOpacity: v / 100 })} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField label="Cor da borda" value={a.borderColor} onChange={(borderColor) => set({ borderColor })} />
        <Slider label="Opacidade da borda" value={pct(a.borderOpacity)} min={0} max={100} unit="%" onChange={(v) => set({ borderOpacity: v / 100 })} />
        <Slider label="Espessura da borda" value={a.borderWidth} min={0} max={4} unit="px" onChange={(borderWidth) => set({ borderWidth })} />
        <Slider label="Cantos arredondados" value={a.radius} min={0} max={40} unit="px" onChange={(radius) => set({ radius })} />
        <Slider label="Sombra" value={pct(a.shadow)} min={0} max={100} unit="%" onChange={(v) => set({ shadow: v / 100 })} disabled={a.background === "acrylic"} />
      </div>
      <Field label="Indicador de janela aberta">
        <Segmented
          value={a.indicator}
          onChange={(indicator) => set({ indicator })}
          options={[
            { value: "dot", label: "Pontinho" },
            { value: "bar", label: "Barrinha" },
            { value: "glow", label: "Brilho" },
            { value: "none", label: "Nenhum" },
          ]}
        />
      </Field>
      {a.indicator !== "none" && <ColorField label="Cor do indicador" value={a.indicatorColor} onChange={(indicatorColor) => set({ indicatorColor })} />}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------------------------

const ThemeCard: React.FC<{ theme: DockTheme; active: boolean; onApply: () => void; onDelete?: () => void; base: DockAppearance }> = ({
  theme,
  active,
  onApply,
  onDelete,
  base,
}) => {
  const appearance = { ...base, ...theme.appearance, iconSize: 22, padding: 5, spacing: 4, magnify: 1, showLabels: false, offset: 0, length: "auto" as const, edge: "bottom" as const };
  if (appearance.background === "acrylic") appearance.background = "glass";
  const demo = useMemo(
    () =>
      buildSlots(
        [
          { id: "a", type: "item", path: "", name: "", kind: "app" },
          { id: "b", type: "item", path: "", name: "", kind: "folder" },
          { id: "c", type: "item", path: "", name: "", kind: "url" },
        ],
        { byItem: { a: [{ hwnd: 0, title: "", exe: "", pid: 0, minimized: false, focused: true }] }, unpinned: [] },
        false
      ),
    []
  );
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onApply}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-cute border p-2.5 text-left transition ${
        active ? "border-theme-primary ring-2 ring-theme-primary/30" : "border-theme-border/60 hover:border-theme-primary/50"
      }`}
    >
      <div className="pointer-events-none flex h-16 items-end justify-center rounded-lg bg-gradient-to-br from-fuchsia-400/60 via-indigo-500/50 to-teal-400/50 pb-2">
        <DockBar slots={demo} appearance={appearance} />
      </div>
      <span className="text-xs font-bold text-theme-text">{theme.name}</span>
      {onDelete && (
        <button
          type="button"
          title="Excluir tema"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1.5 top-1.5 rounded-md bg-black/40 p-1 text-white opacity-0 transition group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

export const ThemesSection: React.FC = () => {
  const a = useDockStore((s) => s.appearance);
  const custom = useDockStore((s) => s.customThemes);
  const activeId = useDockStore((s) => s.activeThemeId);
  const { applyTheme, saveCurrentTheme, deleteTheme, resetAppearance } = useDockStore();
  const { addToast } = useToast();
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <Field label="Temas prontos" hint="Temas mudam só o visual: posição e tamanho continuam como estão.">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {BUILTIN_THEMES.map((t) => (
            <ThemeCard key={t.id} theme={t} base={a} active={activeId === t.id} onApply={() => applyTheme(t.id)} />
          ))}
        </div>
      </Field>
      <Field label="Meus temas">
        {custom.length === 0 ? (
          <span className="text-[11px] text-theme-text-muted">Ajuste o visual do seu jeito e salve aqui para usar depois.</span>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {custom.map((t) => (
              <ThemeCard key={t.id} theme={t} base={a} active={activeId === t.id} onApply={() => applyTheme(t.id)} onDelete={() => deleteTheme(t.id)} />
            ))}
          </div>
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do tema"
          maxLength={32}
          className="h-8 min-w-[160px] flex-1 rounded-cute border border-theme-border/60 bg-theme-surface-card px-2.5 text-xs text-theme-text outline-none focus:border-theme-primary"
        />
        <Button
          size="sm"
          icon={<Save size={14} />}
          onClick={() => {
            const t = saveCurrentTheme(name);
            setName("");
            addToast(`Tema “${t.name}” salvo!`, "sparkle");
          }}
        >
          Salvar visual atual
        </Button>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={resetAppearance}>
          Voltar ao padrão
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Behavior
// ---------------------------------------------------------------------------------------------

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
      active ? "border-theme-primary bg-theme-primary text-white shadow-soft" : "border-theme-border/60 bg-theme-surface-card text-theme-text-muted hover:text-theme-text"
    }`}
  >
    {children}
  </button>
);

const ALL_SHELL_BUTTONS: DockShellButton[] = ["search", "taskview", "widgets", "explorer", "desktop", "settings"];

/** Pick which Windows buttons sit next to Start, and their order. */
const ShellButtonsEditor: React.FC<{ value: DockShellButton[]; onChange: (v: DockShellButton[]) => void }> = ({ value, onChange }) => {
  const move = (id: DockShellButton, dir: -1 | 1) => {
    const i = value.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const off = ALL_SHELL_BUTTONS.filter((id) => !value.includes(id));
  return (
    <Field label="Botões do Windows no dock" hint="Ficam logo depois do Iniciar, como na barra do Windows 11. Cada um usa o atalho oficial do Windows (Pesquisar = Win + S, Visão de tarefas = Win + Tab…).">
      <div className="flex flex-col gap-1">
        {value.map((id, i) => (
          <div key={id} className="flex items-center gap-2 rounded-cute border border-theme-border/60 bg-theme-surface-card px-2 py-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-700">
              <ShellButtonIcon action={id} size={24} color="#ffffff" />
            </span>
            <span className="flex-1 text-xs font-semibold text-theme-text">{SHELL_BUTTON_LABELS[id]}</span>
            <IconBtn title="Mover para a esquerda" onClick={() => move(id, -1)} disabled={i === 0}>
              <ChevronUp size={14} />
            </IconBtn>
            <IconBtn title="Mover para a direita" onClick={() => move(id, 1)} disabled={i === value.length - 1}>
              <ChevronDown size={14} />
            </IconBtn>
            <IconBtn title="Tirar do dock" danger onClick={() => onChange(value.filter((v) => v !== id))}>
              <Trash2 size={14} />
            </IconBtn>
          </div>
        ))}
        {off.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {off.map((id) => (
              <Chip key={id} active={false} onClick={() => onChange([...value, id])}>
                + {SHELL_BUTTON_LABELS[id]}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
};

export const BehaviorSection: React.FC = () => {
  const b = useDockStore((s) => s.behavior);
  const set = useDockStore((s) => s.setBehavior);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Visibilidade">
        <Segmented
          value={b.autoHide}
          onChange={(autoHide) => set({ autoHide })}
          options={[
            { value: "never", label: "Sempre visível" },
            { value: "smart", label: "Ocultar se uma janela encostar" },
            { value: "auto", label: "Ocultar sempre" },
          ]}
        />
      </Field>
      <span className="-mt-2 text-[11px] text-theme-text-muted">
        {b.autoHide === "never"
          ? "O dock fica sempre à vista."
          : b.autoHide === "smart"
          ? "O dock sai do caminho quando a janela ativa encosta nele e volta quando você encosta o mouse na borda."
          : "O dock só aparece quando você encosta o mouse na borda da tela."}
      </span>
      <div className="flex flex-col divide-y divide-theme-border/40">
        <div className="pb-2">
          <Toggle
            label="Botão Iniciar no dock"
            description="O primeiro ícone do dock vira o botão Iniciar. Clique direito: Win + X, pesquisar, mostrar área de trabalho e restaurar a barra."
            checked={b.startButton}
            onChange={(startButton) => set({ startButton })}
          />
        </div>
        {b.startButton && (
          <div className="flex flex-col gap-3 py-2">
            <Field
              label="O que o botão Iniciar abre"
              hint={
                b.startMenu === "dock"
                  ? "Um menu próprio com o mesmo tema do dock: pesquisa, fixados, todos os apps e desligar. O Iniciar do Windows continua a um clique (e na tecla Windows)."
                  : "O menu Iniciar original do Windows."
              }
            >
              <Segmented
                value={b.startMenu}
                onChange={(startMenu) => set({ startMenu })}
                options={[
                  { value: "windows", label: "Iniciar do Windows" },
                  { value: "dock", label: "Menu do dock (personalizável)" },
                ]}
              />
            </Field>
            {b.startMenu === "dock" && (
              <Field label="Partes do menu">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["pinned", "Fixados"],
                      ["allApps", "Todos os apps"],
                      ["user", "Nome do usuário"],
                      ["power", "Bloquear e desligar"],
                    ] as const
                  ).map(([key, label]) => (
                    <Chip key={key} active={b.startMenuSections[key]} onClick={() => set({ startMenuSections: { ...b.startMenuSections, [key]: !b.startMenuSections[key] } })}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}
          </div>
        )}
        <div className="py-2">
          <ShellButtonsEditor value={b.shellButtons} onChange={(shellButtons) => set({ shellButtons })} />
        </div>
        <div className="flex flex-col gap-3 py-2">
          <Field label="Bandeja e relógio (quando o dock substitui a barra do Windows)">
            <Segmented
              value={b.trayStyle}
              onChange={(trayStyle) => set({ trayStyle })}
              options={[
                { value: "inDock", label: "Relógio no fim do dock" },
                { value: "pill", label: "Pílula separada" },
              ]}
            />
          </Field>
          {b.trayStyle === "pill" && (
            <Field label="O que aparece na pílula" hint="Cada botão abre o painel verdadeiro do Windows. A pílula usa as mesmas cores e cantos do tema do dock.">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["chevron", "^ Ícones da bandeja"],
                    ["language", "Idioma do teclado"],
                    ["quick", "Rede, som e bateria"],
                    ["seconds", "Segundos no relógio"],
                    ["date", "Data embaixo da hora"],
                  ] as const
                ).map(([key, label]) => (
                  <Chip key={key} active={b.trayItems[key]} onClick={() => set({ trayItems: { ...b.trayItems, [key]: !b.trayItems[key] } })}>
                    {label}
                  </Chip>
                ))}
              </div>
            </Field>
          )}
        </div>
        <Toggle
          label="Reservar espaço na tela"
          description="Janelas maximizadas param antes do dock, como acontece com a barra do Windows. Só funciona com “Sempre visível”."
          checked={b.reserveSpace}
          onChange={(reserveSpace) => set({ reserveSpace })}
          disabled={b.autoHide !== "never"}
        />
        <div className="pt-2">
          <Toggle
            label="Esconder em tela cheia"
            description="Some quando um jogo ou vídeo ocupa a tela inteira no mesmo monitor."
            checked={b.hideOnFullscreen}
            onChange={(hideOnFullscreen) => set({ hideOnFullscreen })}
          />
        </div>
        <div className="pt-2">
          <Toggle label="Mostrar apps abertos que não estão fixados" checked={b.showRunning} onChange={(showRunning) => set({ showRunning })} />
        </div>
        <div className="pt-2">
          <Toggle
            label="Ligar o dock quando o aplicativo abrir"
            description="Com o aplicativo iniciando junto com o Windows (em Configurações), o dock já aparece ao ligar o PC."
            checked={b.startWithApp}
            onChange={(startWithApp) => set({ startWithApp })}
          />
        </div>
      </div>
    </div>
  );
};
