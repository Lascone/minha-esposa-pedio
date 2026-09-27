import React, { useState } from "react";
import { WindhawkMod } from "../types";
import { useModsStore } from "../store/modsStore";
import { ModImageSlider } from "./ModImageSlider";
import { getModThemes } from "../services/modThemesData";
import {
  Heart,
  Star,
  Users,
  Code2,
  Palette,
} from "lucide-react";

interface ModCardProps {
  mod: WindhawkMod;
}

const ModVisualMockup: React.FC<{ mod: WindhawkMod }> = ({ mod }) => {
  const cat = mod.category;

  if (cat === "taskbar") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 flex flex-col justify-end p-2 select-none relative overflow-hidden">
        {/* Subtle desktop wallpaper glow */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-12 bg-sky-500/20 blur-xl rounded-full" />
        {/* Frosted glass taskbar */}
        <div className="w-full h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between px-2 shadow-sm">
          <div className="flex items-center gap-1.5 mx-auto">
            {/* Start Icon */}
            <div className="w-4 h-4 rounded-sm bg-sky-400/80 flex items-center justify-center text-[9px] shadow-xs">🪟</div>
            {/* Centered App icons */}
            <div className="w-3.5 h-3.5 rounded-sm bg-amber-400/80 shadow-xs" />
            <div className="w-3.5 h-3.5 rounded-sm bg-blue-500/80 shadow-xs" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-400/80 shadow-xs ring-1 ring-white/40 relative">
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 rounded-full bg-theme-primary" />
            </div>
            <div className="w-3.5 h-3.5 rounded-sm bg-purple-400/80 shadow-xs" />
          </div>
          <span className="text-[9px] font-mono text-white/80 font-bold tracking-tighter">12:00:30</span>
        </div>
      </div>
    );
  }

  if (cat === "explorer") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-amber-950/40 via-slate-900 to-stone-900 p-2 select-none flex flex-col justify-center">
        <div className="w-full h-24 rounded-lg bg-black/40 border border-amber-500/20 flex flex-col overflow-hidden shadow-sm">
          {/* Explorer Tab Bar */}
          <div className="h-5 bg-white/5 border-b border-white/10 flex items-center px-2 gap-1.5">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400/70" />
              <div className="w-2 h-2 rounded-full bg-amber-400/70" />
              <div className="w-2 h-2 rounded-full bg-emerald-400/70" />
            </div>
            <div className="ml-2 px-2 py-0.5 rounded bg-white/10 text-[8px] font-medium text-amber-200/90 flex items-center gap-1">
              📁 Explorador
            </div>
          </div>
          {/* Explorer Body: sidebar + grid */}
          <div className="flex-1 flex p-1.5 gap-2">
            <div className="w-1/3 border-r border-white/5 pr-1 flex flex-col gap-1 text-[7px] text-white/40">
              <span className="truncate">📂 Documentos</span>
              <span className="truncate">📂 Imagens</span>
              <span className="truncate">📂 Projetos</span>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-1 content-start">
              <div className="p-1 rounded bg-white/5 flex items-center gap-1 text-[8px] text-amber-100/80">
                <span>📄</span> <span className="truncate">{mod.name.slice(0, 10)}</span>
              </div>
              <div className="p-1 rounded bg-white/5 flex items-center gap-1 text-[8px] text-white/70">
                <span>📁</span> <span className="truncate">Pasta</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cat === "startmenu") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-950/50 via-slate-900 to-indigo-950 p-2 select-none flex items-center justify-center relative overflow-hidden">
        <div className="w-40 h-24 rounded-xl bg-purple-900/20 backdrop-blur-md border border-purple-400/30 p-2 flex flex-col justify-between shadow-md">
          {/* Search bar */}
          <div className="w-full h-4 rounded-md bg-white/10 flex items-center px-1.5 text-[8px] text-purple-200/60">
            🔍 Digite para pesquisar...
          </div>
          {/* Pinned grid */}
          <div className="grid grid-cols-4 gap-1.5 justify-items-center py-1">
            <div className="w-4 h-4 rounded bg-pink-500/80 shadow-xs" />
            <div className="w-4 h-4 rounded bg-purple-500/80 shadow-xs" />
            <div className="w-4 h-4 rounded bg-blue-500/80 shadow-xs" />
            <div className="w-4 h-4 rounded bg-emerald-500/80 shadow-xs" />
          </div>
          <div className="flex items-center justify-between text-[8px] text-purple-300/80 pt-1 border-t border-white/10">
            <span className="font-semibold">Início</span>
            <span>⚡ PMM</span>
          </div>
        </div>
      </div>
    );
  }

  if (cat === "windows" || cat === "aesthetics") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-950/40 via-slate-900 to-purple-950 p-2.5 select-none flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent" />
        <div className="w-full h-22 rounded-xl bg-white/10 backdrop-blur-lg border border-pink-400/30 p-2 flex flex-col justify-between shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-pink-200 truncate max-w-[140px] flex items-center gap-1">
              ✨ {mod.name}
            </span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-400/60" />
              <span className="w-2 h-2 rounded-full bg-purple-400/60" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-sm">
              🎨
            </div>
            <div className="flex flex-col text-[8px] text-pink-200/80">
              <span className="font-semibold">Tema & Efeitos</span>
              <span className="text-[7px] text-white/50">Personalização Ativa</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // System & Audio or others
  return (
    <div className="w-full h-full bg-gradient-to-br from-teal-950/40 via-slate-900 to-emerald-950 p-2 select-none flex flex-col justify-center items-center relative overflow-hidden">
      <div className="w-full px-4 flex items-end justify-center gap-1.5 h-12">
        <div className="w-1.5 h-4 bg-teal-400/60 rounded-full animate-pulse" />
        <div className="w-1.5 h-8 bg-emerald-400/80 rounded-full" />
        <div className="w-1.5 h-10 bg-teal-400 rounded-full shadow-sm shadow-teal-500/50" />
        <div className="w-1.5 h-6 bg-cyan-400/70 rounded-full" />
        <div className="w-1.5 h-9 bg-emerald-400 rounded-full" />
        <div className="w-1.5 h-5 bg-teal-400/60 rounded-full" />
      </div>
      <span className="text-[9px] font-mono text-teal-300/80 mt-1 font-semibold flex items-center gap-1">
        ⚡ Sistema & Desempenho
      </span>
    </div>
  );
};

export const ModCard: React.FC<ModCardProps> = ({ mod }) => {
  const {
    enabledModIds,
    favoriteModIds,
    selectedThemes,
    toggleMod,
    setSelectedTheme,
    toggleFavorite,
    setSelectedModForModal,
  } = useModsStore();

  const [imgError, setImgError] = useState(false);

  const themeDef = getModThemes(mod.id);
  const selectedThemeId = selectedThemes[mod.id] || themeDef?.defaultThemeId;
  const currentTheme = themeDef?.themes.find((t) => t.id === selectedThemeId);

  const isEnabled = enabledModIds.includes(mod.id);
  const isFavorite = favoriteModIds.includes(mod.id);

  const formatUsers = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return `${num}`;
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "taskbar":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "startmenu":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "explorer":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "windows":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "aesthetics":
        return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
      default:
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    }
  };

  const categoryLabels: Record<string, string> = {
    taskbar: "Barra de Tarefas",
    startmenu: "Menu Iniciar",
    explorer: "Explorador",
    windows: "Janelas",
    aesthetics: "Visual & Temas",
    system: "Sistema & Áudio",
  };

  const hasValidImage = Boolean(
    mod.previewImageUrl &&
    !imgError &&
    !mod.previewImageUrl.includes("imgur.com")
  );

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 hover:shadow-soft hover:-translate-y-1 ${
        isEnabled
          ? "border-theme-primary/50 bg-theme-surface-card/95 shadow-sm shadow-theme-primary/5 ring-1 ring-theme-primary/20"
          : "border-theme-border/60 bg-theme-surface-card hover:border-theme-primary/30"
      }`}
    >
      {/* Top row: Category tag, target process, favorite button */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(
                mod.category
              )}`}
            >
              {categoryLabels[mod.category] || mod.category}
            </span>

            {mod.targetProcesses && mod.targetProcesses.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-theme-text-muted bg-theme-border/40 border border-theme-border/40 truncate max-w-[120px]">
                {mod.targetProcesses[0]}
              </span>
            )}
          </div>

          <button
            onClick={() => toggleFavorite(mod.id)}
            className={`p-1.5 rounded-xl transition-all ${
              isFavorite
                ? "text-pink-500 bg-pink-500/10 scale-110"
                : "text-theme-text-muted hover:text-pink-500 hover:bg-pink-500/10"
            }`}
            title={isFavorite ? "Remover dos favoritos" : "Salvar como favorito"}
          >
            <Heart size={16} className={isFavorite ? "fill-pink-500" : ""} />
          </button>
        </div>

        {/* Cover Preview: Interactive multi-image slide carousel with real mod page screenshots */}
        <div className="mb-3">
          <ModImageSlider
            mod={mod}
            fallbackMockup={<ModVisualMockup mod={mod} />}
          />
        </div>

        {/* Title and Author */}
        <h4 className="text-base font-bold text-theme-text group-hover:text-theme-primary transition-colors line-clamp-1">
          {mod.name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-theme-text-muted">
          <span>por {mod.author}</span>
          <span>•</span>
          <span className="font-mono text-[11px]">v{mod.version}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-theme-text-muted/90 mt-2.5 line-clamp-2 leading-relaxed">
          {mod.description}
        </p>

        {/* Theme Picker if mod has customizable visual themes */}
        {themeDef && (
          <div className="mt-3 p-2.5 rounded-xl bg-theme-primary/5 border border-theme-primary/20 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-theme-primary">
                <Palette size={12} />
                <span>Estilo & Tema</span>
              </span>
              <span className="text-[10px] text-theme-text-muted font-medium truncate max-w-[120px]">
                {currentTheme ? currentTheme.name : "Padrão"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {themeDef.themes.map((theme) => {
                const isSelected = (selectedThemeId || themeDef.defaultThemeId) === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTheme(mod.id, theme.id);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] whitespace-nowrap transition-all border ${
                      isSelected
                        ? "bg-theme-primary text-white border-theme-primary shadow-xs font-bold"
                        : "bg-theme-surface-card hover:bg-theme-primary/10 text-theme-text-muted hover:text-theme-text border-theme-border/60 font-medium"
                    }`}
                    title={theme.description}
                  >
                    {theme.badge ? `${theme.badge} ` : ""}{theme.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: Rating, Users count, Toggle & Details button */}
      <div className="mt-4 pt-3.5 border-t border-theme-border/40 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-theme-text-muted">
          <div className="flex items-center gap-3">
            {mod.rating > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Star size={13} className="fill-amber-500" />
                <span>{mod.rating.toFixed(1)}</span>
              </span>
            )}
            {mod.users > 0 && (
              <span className="flex items-center gap-1 font-medium">
                <Users size={13} />
                <span>{formatUsers(mod.users)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {themeDef && (
              <button
                type="button"
                onClick={() => setSelectedModForModal(mod)}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-[11px] font-bold transition-all shadow-2xs"
                title="Configurar temas e estilos visuais"
              >
                <Palette size={12} />
                <span>Temas ({themeDef.themes.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedModForModal(mod)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/25 text-[11px] font-bold transition-all shadow-2xs"
              title="Abrir código-fonte C++ (.wh.cpp) do mod"
            >
              <Code2 size={13} />
              <span>Código</span>
            </button>
          </div>
        </div>

        {/* Toggle switch action */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${
              isEnabled ? "text-emerald-500" : "text-theme-text-muted"
            }`}
          >
            {isEnabled ? "Ativado no Windows" : "Desativado"}
          </span>

          <button
            onClick={() => toggleMod(mod.id)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isEnabled ? "bg-theme-primary" : "bg-theme-border"
            }`}
            title={isEnabled ? "Desativar mod" : "Ativar mod"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
