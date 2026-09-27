import React, { useState, useEffect } from "react";
import { useModsStore } from "../store/modsStore";
import { windhawkService } from "../services/windhawkService";
import { getModThemes, ModThemeOption } from "../services/modThemesData";
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
  Palette,
} from "lucide-react";
import { Button } from "@/core/components/Button";
import { useToast } from "@/core/components/Toast";
import { ModImageSlider } from "./ModImageSlider";

export const ModDetailsModal: React.FC = () => {
  const {
    selectedModForModal,
    setSelectedModForModal,
    enabledModIds,
    favoriteModIds,
    selectedThemes,
    setSelectedTheme,
    toggleMod,
    toggleFavorite,
    restartExplorer,
    compileMod,
    saveModSource,
  } = useModsStore();

  const { addToast } = useToast();
  const mod = selectedModForModal;
  const themeDef = mod ? getModThemes(mod.id) : undefined;
  const selectedThemeId = mod ? (selectedThemes[mod.id] || themeDef?.defaultThemeId) : undefined;

  // Default to themes if available, otherwise code view
  const [activeTab, setActiveTab] = useState<"themes" | "code" | "overview">("themes");
  const [sourceCode, setSourceCode] = useState<string>("");
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(false);
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Set default tab based on whether mod has custom themes
  useEffect(() => {
    if (mod) {
      if (getModThemes(mod.id)) {
        setActiveTab("themes");
      } else {
        setActiveTab("code");
      }
    }
  }, [mod?.id]);

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

  const handleApplyTheme = async (theme: ModThemeOption) => {
    setSelectedTheme(mod.id, theme.id);
    addToast(`Tema "${theme.name}" selecionado! ✨`, "sparkle");
    try {
      await windhawkService.applyModTheme(mod.id, theme.id);
      if (isEnabled) {
        addToast(`Estilos de "${theme.name}" aplicados com sucesso!`, "sparkle");
      }
    } catch (e: any) {
      console.warn("Could not apply mod theme:", e);
    }
  };

  const handleOpenInWindhawk = async () => {
    addToast(`Abrindo ${mod.name} no aplicativo Windhawk... 🚀`, "info");
    await windhawkService.openInWindhawkApp(mod.id);
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
              {themeDef && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                  <Palette size={11} /> {themeDef.themes.length} Temas Visuais
                </span>
              )}
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
        <div className="flex items-center justify-between px-6 pt-3 border-b border-theme-border/40 bg-theme-surface-card flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {themeDef && (
              <button
                type="button"
                onClick={() => setActiveTab("themes")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                  activeTab === "themes"
                    ? "text-theme-primary border-b-2 border-theme-primary"
                    : "text-theme-text-muted hover:text-theme-text"
                }`}
              >
                <Palette size={14} />
                <span>Temas & Estilos Visuais</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold">
                  {themeDef.themes.length}
                </span>
              </button>
            )}

            <button
              type="button"
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
              type="button"
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
          {activeTab === "themes" && themeDef ? (
            <div className="flex flex-col gap-5">
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-theme-text flex items-center gap-1.5">
                      <Sparkles size={16} className="text-purple-500" />
                      Galeria de Estilos & Temas
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                      Pronto para Ativar
                    </span>
                  </div>
                  <p className="text-xs text-theme-text-muted leading-relaxed">
                    Mods de interface como <strong>{mod.name}</strong> funcionam através de regras de estilo e temas no Windows 11. Escolha abaixo a aparência que mais combina com seu desktop antes ou depois de ativar o mod.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenInWindhawk}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-border/40 text-theme-text border border-theme-border/60 text-xs font-semibold transition-all shadow-2xs"
                    title="Abrir no aplicativo Windhawk instalado"
                  >
                    <ExternalLink size={13} />
                    <span>Abrir no Windhawk</span>
                  </button>
                </div>
              </div>

              {/* Theme Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themeDef.themes.map((theme) => {
                  const isSelected = (selectedThemeId || themeDef.defaultThemeId) === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleApplyTheme(theme)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "bg-theme-primary/10 border-theme-primary ring-2 ring-theme-primary/30 shadow-md"
                          : "bg-theme-surface-card hover:bg-theme-surface border-theme-border/60 hover:border-theme-primary/40"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        {/* Theme Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {theme.badge && (
                              <span className="text-base select-none">{theme.badge}</span>
                            )}
                            <h4 className="text-sm font-bold text-theme-text">
                              {theme.name}
                            </h4>
                          </div>

                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-primary text-white flex items-center gap-1 shadow-2xs">
                              <Check size={11} /> Selecionado
                            </span>
                          )}
                        </div>

                        {/* Theme Description */}
                        <p className="text-xs text-theme-text-muted leading-relaxed">
                          {theme.description}
                        </p>
                      </div>

                      {/* Theme Action Button */}
                      <div className="pt-2 border-t border-theme-border/40 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-theme-text-muted">
                          ID: {theme.id}
                        </span>

                        <Button
                          type="button"
                          variant={isSelected ? "primary" : "secondary"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTheme(theme);
                          }}
                        >
                          {isSelected ? "Tema Ativo ✨" : "Aplicar Este Tema"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Restart Explorer Hint */}
              <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-theme-text-muted">
                  <RotateCcw size={14} className="text-theme-primary shrink-0" />
                  <span>
                    Após selecionar o tema e ativar o mod, reinicie o Windows Explorer para carregar os novos elementos na tela.
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestartExplorer}
                  className="shrink-0"
                >
                  Reiniciar Explorer
                </Button>
              </div>
            </div>
          ) : activeTab === "code" ? (
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
              {/* Screenshots Slideshow Carousel */}
              <div>
                <ModImageSlider mod={mod} aspectRatio="modal" />
              </div>

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
