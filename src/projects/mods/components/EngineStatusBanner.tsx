import React, { useState } from "react";
import { useModsStore } from "../store/modsStore";
import {
  CheckCircle2,
  FolderOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/core/components/Button";
import { useToast } from "@/core/components/Toast";
import { CreateCustomModModal } from "./CreateCustomModModal";
import { windhawkService } from "../services/windhawkService";

export const EngineStatusBanner: React.FC = () => {
  const {
    status,
    isRefreshing,
    isRestartingExplorer,
    explorerRestartPending,
    refreshStatus,
    restartExplorer,
    openFolder,
  } = useModsStore();

  const { addToast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleRestartExplorer = async () => {
    addToast("Reiniciando o Windows Explorer para aplicar as modificações...", "info");
    const ok = await restartExplorer();
    if (ok) {
      addToast("Windows Explorer reiniciado com sucesso! ✨", "sparkle");
    } else {
      addToast("Falha ao reiniciar o Explorer.", "warning");
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleApplyAll = async () => {
    setIsSyncing(true);
    addToast("Aplicando modificações ativas no Windows...", "info");
    const res = await windhawkService.setupOrStartEngine();
    setIsSyncing(false);
    if (res.success) {
      addToast(res.message, "sparkle");
      refreshStatus();
    } else {
      addToast(res.message, "warning");
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border p-5 shadow-soft transition-all border-theme-primary/30 bg-gradient-to-r from-theme-surface-card via-theme-surface-card/95 to-theme-surface">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Status indicator and info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm transition-transform hover:scale-105 border bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
              <Sparkles className="animate-pulse text-emerald-400" size={24} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-theme-text flex items-center gap-1.5">
                  Motor Nativo PMM Mods
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Motor Embutido & Independente
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-theme-text-muted bg-theme-border/40 border border-theme-border/40">
                  {status?.version ? `v${status.version}` : "—"}
                </span>
              </div>

              <p className="text-xs text-theme-text-muted max-w-2xl leading-relaxed">
                As modificações ativadas são aplicadas diretamente no Windows Explorer, área de trabalho e barra de tarefas pelo motor nativo próprio do aplicativo.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2 self-stretch md:self-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className={isSyncing ? "animate-spin" : ""} />}
              onClick={handleApplyAll}
              disabled={isSyncing}
              title="Reaplicar todas as modificações ativas no Windows"
            >
              {isSyncing ? "Aplicando..." : "Reaplicar Mods"}
            </Button>

            {/* Create new custom mod button */}
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setCreateModalOpen(true)}
              title="Criar um novo mod com código C++ personalizado"
            >
              Criar Mod C++
            </Button>

            {/* Restart Explorer button */}
            <Button
              variant="ghost"
              size="sm"
              icon={
                <RotateCcw
                  size={14}
                  className={isRestartingExplorer ? "animate-spin" : ""}
                />
              }
              onClick={handleRestartExplorer}
              disabled={isRestartingExplorer}
              title="Reiniciar explorer.exe para recarregar a barra de tarefas e área de trabalho"
            >
              {isRestartingExplorer ? "Reiniciando..." : "Reiniciar Explorer"}
            </Button>

            {/* Open mods folder */}
            <Button
              variant="outline"
              size="sm"
              icon={<FolderOpen size={14} />}
              onClick={() => openFolder("mods")}
              title="Abrir pasta local de códigos-fonte dos mods no Explorer"
            >
              Pasta de Mods
            </Button>

            {/* Refresh status */}
            <button
              onClick={() => refreshStatus()}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-theme-text-muted hover:text-theme-text hover:bg-theme-border/30 transition-colors disabled:opacity-50"
              title="Atualizar status do sistema"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {explorerRestartPending && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
            <p className="text-xs text-theme-text leading-relaxed">
              <strong>Falta só um passo:</strong> esse mod mexe na barra/Explorer e aparece depois de reiniciar o Explorer.
              A barra e as janelas do Explorer somem por 1–2 segundinhos e voltam sozinhas.
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => useModsStore.setState({ explorerRestartPending: false })}>
                Depois
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<RotateCcw size={14} className={isRestartingExplorer ? "animate-spin" : ""} />}
                onClick={handleRestartExplorer}
                disabled={isRestartingExplorer}
              >
                Reiniciar agora
              </Button>
            </div>
          </div>
        )}
      </div>

      {createModalOpen && (
        <CreateCustomModModal onClose={() => setCreateModalOpen(false)} />
      )}
    </>
  );
};
