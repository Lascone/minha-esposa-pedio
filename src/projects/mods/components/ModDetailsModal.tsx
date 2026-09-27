import React, { useState, useEffect } from "react";
import { useModsStore } from "../store/modsStore";
import { windhawkService } from "../services/windhawkService";
import {
  X,
  Star,
  Users,
  Code2,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Heart,
  Github,
  Play,
  Save,
  Edit3,
  Eye,
  FileCode,
  Cpu,
} from "lucide-react";
import { Button } from "@/core/components/Button";
import { useToast } from "@/core/components/Toast";

export const ModDetailsModal: React.FC = () => {
  const {
    selectedModForModal,
    setSelectedModForModal,
    enabledModIds,
    favoriteModIds,
    toggleMod,
    toggleFavorite,
    restartExplorer,
    compileMod,
    saveModSource,
  } = useModsStore();

  const { addToast } = useToast();
  // Default directly to code so user always has the source code immediately visible
  const [activeTab, setActiveTab] = useState<"code" | "overview">("code");
  const [sourceCode, setSourceCode] = useState<string>("");
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(false);
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const mod = selectedModForModal;

  // Fetch source code immediately on modal open
  useEffect(() => {
    if (mod) {
      setIsLoadingCode(true);
      windhawkService
        .fetchModSource(mod.id)
        .then((code) => {
          setSourceCode(code);
          setIsLoadingCode(false);
        })
        .catch(() => {
          setIsLoadingCode(false);
        });
    }
  }, [mod?.id]);

  // Reset when mod changes
  useEffect(() => {
    setIsEditingCode(false);
  }, [mod?.id]);

  if (!mod) return null;

  const isEnabled = enabledModIds.includes(mod.id);
  const isFavorite = favoriteModIds.includes(mod.id);
  const lineCount = sourceCode ? sourceCode.split("\n").length : 0;

  const handleCopyCode = () => {
    if (sourceCode) {
      navigator.clipboard.writeText(sourceCode);
      setCopied(true);
      addToast("Código C++ copiado para a área de transferência! 📋", "info");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveCode = async () => {
    if (!sourceCode) return;
    const ok = await saveModSource(mod.id, sourceCode);
    if (ok) {
      addToast(`Código-fonte de '${mod.name}' salvo na pasta de mods! 💾`, "sparkle");
      setIsEditingCode(false);
    } else {
      addToast("Falha ao salvar código.", "warning");
    }
  };

  const handleCompileAndApply = async () => {
    if (!sourceCode) return;
    setIsCompiling(true);
    addToast("Compilando e registrando mod no motor nativo...", "info");
    try {
      const msg = await compileMod(mod.id, sourceCode);
      addToast(`${msg} ✨`, "sparkle");
      setIsEditingCode(false);
    } catch (e: any) {
      addToast(`Erro de compilação: ${e.message || e}`, "warning");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleRestartExplorer = async () => {
    addToast("Reiniciando o Windows Explorer...", "info");
    const ok = await restartExplorer();
    if (ok) {
      addToast("Windows Explorer reiniciado com sucesso! ✨", "sparkle");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-theme-border/60 bg-theme-surface-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-theme-border/40 bg-gradient-to-b from-theme-surface to-theme-surface-card">
          <div className="flex flex-col gap-1.5 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
                {mod.category}
              </span>
              <span className="text-xs text-theme-text-muted">v{mod.version}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                ⚡ C++ Nativo
              </span>
              {mod.targetProcesses.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono text-theme-text-muted bg-theme-border/40"
                >
                  {p}
                </span>
              ))}
            </div>

            <h3 className="text-xl font-bold text-theme-text mt-1">{mod.name}</h3>

            <div className="flex items-center gap-4 text-xs text-theme-text-muted">
              <span>
                Desenvolvido por <strong className="text-theme-text font-semibold">{mod.author}</strong>
              </span>
              {mod.rating > 0 && (
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star size={13} className="fill-amber-500" />
                  <span>
                    {mod.rating.toFixed(1)} ({mod.ratingUsers} avaliações)
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(mod.id)}
              className={`p-2 rounded-2xl transition-all ${
                isFavorite
                  ? "text-pink-500 bg-pink-500/10 scale-110"
                  : "text-theme-text-muted hover:text-pink-500 hover:bg-pink-500/10"
              }`}
              title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
            >
              <Heart size={18} className={isFavorite ? "fill-pink-500" : ""} />
            </button>

            <button
              onClick={() => setSelectedModForModal(null)}
              className="p-2 rounded-2xl text-theme-text-muted hover:text-theme-text hover:bg-theme-border/40 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-theme-border/40 bg-theme-surface-card">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("code")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                activeTab === "code"
                  ? "text-theme-primary border-b-2 border-theme-primary"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <FileCode size={14} />
              <span>Código C++ (.wh.cpp) & Compilador</span>
              {lineCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-theme-primary/10 text-theme-primary">
                  {lineCount} linhas
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                activeTab === "overview"
                  ? "text-theme-primary border-b-2 border-theme-primary"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Visão Geral & Parâmetros
            </button>
          </div>

          <div className="pb-2.5">
            <Button
              variant={isEnabled ? "outline" : "primary"}
              size="sm"
              onClick={() => toggleMod(mod.id)}
            >
              {isEnabled ? "Desativar Mod" : "Ativar Mod no Sistema ✨"}
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 scrollbar-thin">
          {activeTab === "code" ? (
            <div className="flex flex-col gap-3">
              {/* Code Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-theme-text bg-theme-surface px-2.5 py-1 rounded-xl border border-theme-border/60">
                    📄 {mod.id}.wh.cpp
                  </span>
                  <span className="text-[11px] text-theme-text-muted">
                    {lineCount} linhas • UTF-8 C++
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setIsEditingCode(!isEditingCode)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-colors ${
                      isEditingCode
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                        : "bg-theme-surface border-theme-border/60 hover:bg-theme-border/40 text-theme-text"
                    }`}
                  >
                    {isEditingCode ? <Eye size={12} /> : <Edit3 size={12} />}
                    <span>{isEditingCode ? "Visualizar" : "Editar Código"}</span>
                  </button>

                  {isEditingCode && (
                    <button
                      onClick={handleSaveCode}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-theme-primary text-white text-[11px] font-bold shadow-sm"
                    >
                      <Save size={12} />
                      <span>Salvar C++</span>
                    </button>
                  )}

                  <button
                    onClick={handleCompileAndApply}
                    disabled={isCompiling}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-bold shadow-sm disabled:opacity-50"
                  >
                    <Play size={12} />
                    <span>{isCompiling ? "Compilando..." : "Compilar & Aplicar"}</span>
                  </button>

                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-theme-surface border border-theme-border/60 hover:bg-theme-border/40 text-theme-text font-semibold text-[11px] transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copied ? "Copiado!" : "Copiar"}</span>
                  </button>

                  <a
                    href={`https://github.com/ramensoftware/windhawk-mods/blob/main/mods/${mod.id}.wh.cpp`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-theme-surface border border-theme-border/60 hover:bg-theme-border/40 text-theme-text font-semibold text-[11px] transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span>GitHub</span>
                  </a>
                </div>
              </div>

              {/* Code Editor or Viewer */}
              <div className="relative rounded-2xl border border-theme-border/60 bg-[#181825] p-3 text-xs font-mono text-[#cdd6f4] overflow-hidden">
                {isLoadingCode ? (
                  <div className="flex flex-col items-center justify-center p-16 text-theme-text-muted gap-2">
                    <span className="animate-spin text-xl">⏳</span>
                    <span>Carregando código fonte C++ do mod...</span>
                  </div>
                ) : isEditingCode ? (
                  <textarea
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    rows={20}
                    spellCheck={false}
                    className="w-full h-[400px] bg-transparent text-[#cdd6f4] font-mono text-xs outline-none resize-y leading-relaxed"
                  />
                ) : (
                  <div className="flex max-h-[420px] overflow-auto scrollbar-thin">
                    {/* Line numbers */}
                    <div className="select-none pr-3 mr-3 border-r border-white/10 text-white/25 text-right font-mono text-[11px] leading-relaxed">
                      {sourceCode.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    {/* Code text */}
                    <pre className="flex-1 whitespace-pre leading-relaxed overflow-x-auto text-[11px]">
                      {sourceCode}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-theme-surface border border-theme-border/40 flex items-center justify-between text-xs text-theme-text-muted">
                <span>
                  💡 Você pode alterar os ganchos (<code>Wh_ModInit</code>, etc.), salvar e clicar em{" "}
                  <strong>Compilar & Aplicar</strong> para rodar no nosso motor nativo!
                </span>
                {isEnabled && (
                  <button
                    onClick={handleRestartExplorer}
                    className="text-theme-primary font-bold hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    <RotateCcw size={12} /> Reiniciar Explorer
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 text-sm text-theme-text-muted">
              {/* Description box */}
              <div className="p-4 rounded-2xl bg-theme-surface border border-theme-border/50 text-theme-text text-sm leading-relaxed">
                {mod.description}
              </div>

              {/* Status and Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-theme-border/60 bg-theme-surface-card/60">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-theme-text">Estado no Nosso Motor</span>
                  <span className="text-xs text-theme-text-muted">
                    {isEnabled
                      ? "Mod ativo e gerenciado pelo nosso motor nativo integrado."
                      : "Mod inativo no momento."}
                  </span>
                </div>

                <Button
                  variant={isEnabled ? "outline" : "primary"}
                  size="sm"
                  onClick={() => toggleMod(mod.id)}
                >
                  {isEnabled ? "Desativar Mod" : "Ativar Mod Agora ✨"}
                </Button>
              </div>

              {/* Technical Specifications */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">
                  Detalhes Técnicos & Injeção
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-theme-surface border border-theme-border/40 flex flex-col gap-1">
                    <span className="text-theme-text-muted">Identificador</span>
                    <span className="font-mono text-theme-text font-semibold">{mod.id}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-theme-surface border border-theme-border/40 flex flex-col gap-1">
                    <span className="text-theme-text-muted">Processos Alvo</span>
                    <span className="font-mono text-theme-text font-semibold">
                      {mod.targetProcesses.join(", ") || "Global (*)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explorer prompt reminder */}
              {isEnabled && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-xs">
                  <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-medium">
                    <Sparkles size={16} />
                    <span>Alterou configurações da barra de tarefas ou do Explorer?</span>
                  </div>
                  <button
                    onClick={handleRestartExplorer}
                    className="flex items-center gap-1 font-bold text-pink-600 hover:underline"
                  >
                    <RotateCcw size={12} />
                    <span>Reiniciar Explorer</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-theme-border/40 bg-theme-surface">
          <a
            href={mod.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-theme-primary transition-colors font-medium"
          >
            <Github size={14} />
            <span>Perfil do Autor ({mod.author})</span>
          </a>

          <Button variant="ghost" size="sm" onClick={() => setSelectedModForModal(null)}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
