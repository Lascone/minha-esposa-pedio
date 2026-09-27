import React, { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AlertTriangle, CheckCircle2, Eye, FileText, Info, RotateCcw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/core/components/Button";
import { Toggle } from "@/core/components/Toggle";
import { useToast } from "@/core/components/Toast";
import { dockService, isTauriRuntime, TaskbarStatus } from "../dockService";
import { useDockStore } from "../store/dockStore";
import { startCentered } from "../dockLifecycle";
import { TaskbarMock } from "./DockPreview";

interface TaskbarModePanelProps {
  /** Changes whenever another screen asks to preview "compact + auto-hide" (macOS style). */
  suggestAutohide?: number;
}

export const TaskbarModePanel: React.FC<TaskbarModePanelProps> = ({ suggestAutohide }) => {
  const taskbarMode = useDockStore((s) => s.taskbarMode);
  const setTaskbarMode = useDockStore((s) => s.setTaskbarMode);
  const { addToast } = useToast();
  const [status, setStatus] = useState<TaskbarStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autohide, setAutohide] = useState(taskbarMode.autohide);
  const [hide, setHide] = useState(taskbarMode.hide);
  const dockEnabled = useDockStore((s) => s.enabled);
  const [previewing, setPreviewing] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(() => {
    if (!isTauriRuntime()) {
      setLoadError("Disponível apenas no aplicativo instalado.");
      return;
    }
    dockService
      .taskbarStatus()
      .then((s) => {
        setStatus(s);
        setLoadError(null);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  useEffect(() => {
    refresh();
    const off = listen("taskbar-mode-restored", () => {
      setTaskbarMode({ enabled: false });
      refresh();
    });
    return () => {
      off.then((f) => f()).catch(() => {});
    };
  }, [refresh, setTaskbarMode]);

  useEffect(() => {
    setHide(taskbarMode.hide);
  }, [taskbarMode.hide]);

  useEffect(() => {
    if (!suggestAutohide) return;
    setAutohide(true);
    setHide(true);
    setPreviewing(true);
  }, [suggestAutohide]);

  const apply = async () => {
    setWorking(true);
    try {
      const s = await dockService.taskbarApply(autohide || hide, hide, startCentered());
      setStatus(s);
      setTaskbarMode({ enabled: true, autohide: autohide || hide, hide });
      setPreviewing(false);
      const failed = s.changes.filter((c) => c.error);
      if (failed.length) addToast(`Modo dock ligado, mas ${failed.length} ajuste(s) foram bloqueados pelo Windows.`, "warning");
      else if (hide) addToast("Pronto! O dock virou sua barra. Bandeja e relógio ficam no último ícone do dock.", "success");
      else addToast("Modo dock ligado! A barra do Windows ficou compacta.", "success");
    } catch (e) {
      addToast(String(e), "warning");
    } finally {
      setWorking(false);
    }
  };

  const restore = async () => {
    setWorking(true);
    try {
      const s = await dockService.taskbarRestore();
      setStatus(s);
      setTaskbarMode({ enabled: false });
      setPreviewing(false);
      addToast("Barra do Windows restaurada como era antes.", "success");
    } catch (e) {
      addToast(String(e), "warning");
    } finally {
      setWorking(false);
    }
  };

  const active = !!status?.active;
  const pending = status?.changes.filter((c) => !c.applied) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-cute border border-amber-400/40 bg-amber-400/10 p-3.5 text-xs leading-relaxed text-theme-text">
        <Info size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <div className="flex flex-col gap-1.5">
          <span className="font-bold">O que o Windows permite</span>
          <span>
            O Windows 10/11 não oferece um jeito seguro de esconder <b>só</b> a parte dos apps abertos e deixar o Iniciar e a bandeja. Programas que fazem
            isso modificam o Explorer e costumam quebrar a cada atualização, então este modo não faz isso.
          </span>
          <span>
            A alternativa estável: deixar a barra compacta usando configurações oficiais do Windows (sem pesquisa, Visão de tarefas, Widgets, Chat e Copilot
            {status?.isWindows11 ? ", ícones à esquerda" : ""}) e, se você quiser, <b>ocultar a barra automaticamente</b>. O Iniciar, a bandeja, os ícones
            e os menus dos apps continuam funcionando normalmente. A barra aparece quando o mouse encosta na borda.
          </span>
          <span>
            Para o dock <b>virar</b> a barra (estilo macOS), ligue <b>Substituir a barra do Windows pelo dock</b>: a barra original fica escondida enquanto
            o dock estiver aberto e não sobe mais por cima dele. A bandeja, o relógio e as notificações verdadeiras aparecem ao clicar no relógio do dock.
          </span>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-cute border border-theme-border/60 bg-theme-surface-card p-3 text-xs text-theme-text-muted">
          <AlertTriangle size={16} className="text-amber-500" />
          {loadError}
        </div>
      )}

      {status && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-cute border border-theme-border/60 bg-theme-surface-card p-3.5">
            <div className="flex items-center gap-2.5">
              {active ? <CheckCircle2 size={20} className="text-emerald-500" /> : <ShieldCheck size={20} className="text-theme-text-muted" />}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-theme-text">{active ? "Modo dock ligado" : "Barra do Windows original"}</span>
                <span className="text-[11px] text-theme-text-muted">
                  {status.isWindows11 ? "Windows 11" : "Windows 10"} · build {status.windowsBuild}
                  {status.hidden ? " · substituída pelo dock" : status.autohide ? " · barra ocultando automaticamente" : ""}
                </span>
              </div>
            </div>
            <Button variant={active ? "danger" : "secondary"} size="sm" icon={<RotateCcw size={14} />} onClick={restore} disabled={working || !active}>
              Restaurar barra do Windows
            </Button>
          </div>

          <Toggle
            label="Ocultar a barra do Windows automaticamente"
            description="Ela some e reaparece quando o mouse encosta na borda da tela. O Iniciar e a bandeja continuam a um movimento de distância."
            checked={autohide || hide}
            onChange={setAutohide}
            disabled={working || hide}
          />

          <Toggle
            label="Substituir a barra do Windows pelo dock"
            description={
              dockEnabled
                ? "A barra original some enquanto o dock estiver aberto e não passa mais por cima dele. Clique no relógio do dock para usar a bandeja de verdade; ela volta sozinha se o dock fechar."
                : "Ligue o dock primeiro: sem ele aberto a barra do Windows continua aparecendo normalmente."
            }
            checked={hide}
            onChange={setHide}
            disabled={working}
          />

          {!previewing ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<Eye size={14} />} onClick={() => setPreviewing(true)} disabled={working}>
                {active ? "Ver prévia e reaplicar" : "Ver prévia antes de ligar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<FileText size={14} />}
                onClick={() => dockService.openLogs().catch((e) => addToast(String(e), "warning"))}
                title="Registro do que o dock fez com a barra do Windows (útil para achar problemas)"
              >
                Abrir logs
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-cute border border-theme-primary/40 bg-theme-primary/5 p-3.5">
              <span className="text-xs font-bold text-theme-text">Prévia da mudança</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MockFrame title="Agora">
                  <TaskbarMock compact={false} autohide={status.autohide} />
                </MockFrame>
                <MockFrame title="Com o modo dock">
                  <TaskbarMock compact autohide={autohide || hide} />
                </MockFrame>
              </div>
              <ul className="flex flex-col gap-1 text-xs text-theme-text">
                {status.changes.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    {c.error ? (
                      <AlertTriangle size={13} className="text-amber-500" />
                    ) : c.applied ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-theme-primary" />
                    )}
                    <span>{c.label}</span>
                    <span className="text-theme-text-muted">{c.error ? `— ${c.error}` : c.applied ? "— já está assim" : ""}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-theme-primary" />
                  <span>
                    {hide
                      ? "Esconder a barra do Windows enquanto o dock estiver aberto (bandeja e relógio no botão de relógio do dock)"
                      : autohide
                      ? "Ocultar a barra automaticamente"
                      : "Manter a barra sempre visível"}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-theme-text-muted">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  Iniciar, bandeja, relógio e ícones de notificação não são alterados.
                </li>
              </ul>
              <p className="text-[11px] leading-relaxed text-theme-text-muted">
                Os valores atuais são salvos antes de qualquer mudança. A barra volta ao normal quando você desliga o modo, fecha o dock ou o aplicativo, se
                o aplicativo travar ou for encerrado à força, e ao desinstalar. Também dá para restaurar pelo ícone na bandeja → <b>Restaurar barra do Windows</b>.
                {pending.length === 0 && !autohide ? " Nada muda na barra além do que já está configurado." : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={apply} disabled={working}>
                  {working ? "Aplicando…" : "Aplicar"}
                </Button>
                <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setPreviewing(false)} disabled={working}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-theme-text-muted">
            Limitações: alguns ajustes (como Widgets em versões recentes do Windows 11) podem ser bloqueados pelo próprio Windows. Nesse caso eles aparecem com
            um aviso e o resto continua funcionando. Com a substituição ligada, a tecla Windows continua abrindo o Iniciar e Win + B mostra a bandeja.
          </p>
        </>
      )}
    </div>
  );
};

const MockFrame: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold text-theme-text-muted">{title}</span>
    <div className="relative h-16 overflow-hidden rounded-lg border border-theme-border/60 bg-gradient-to-br from-indigo-400/50 to-pink-400/50">{children}</div>
  </div>
);
