import React from "react";
import { useCrosshairStore } from "@/projects/crosshair/store/crosshairStore";
import { useThemeStore, AVAILABLE_THEMES } from "../theme/themeManager";
import { useProfileStore } from "../providers/dicebearProvider";
import { Heart, Sparkles, Play, Pause, Palette, Search, User } from "lucide-react";

interface HeaderProps {
  currentRoute: string;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute }) => {
  const { isOverlayActive, setOverlayActive } = useCrosshairStore();
  const { currentTheme, setTheme } = useThemeStore();
  const { wifeProfile, getWifeAvatarUrl } = useProfileStore();

  const getPageTitle = () => {
    if (currentRoute === "/") return "Central da Esposa";
    if (currentRoute.startsWith("/hub")) return "🔍 Asset Hub Unificado";
    if (currentRoute.startsWith("/profile")) return "👩 Perfil da Esposa 💕";
    if (currentRoute.startsWith("/projects/crosshair")) return "🎯 Crosshair Studio";
    if (currentRoute.startsWith("/projects")) return "Projetos & Módulos";
    if (currentRoute === "/settings") return "Configurações";
    if (currentRoute === "/dock-settings") return "🚀 Dock da Área de Trabalho";
    if (currentRoute === "/about") return "Sobre & Mimos";
    return "Pedi para meu marido";
  };

  return (
    <header className="h-16 px-6 bg-theme-surface/80 backdrop-blur-md border-b border-theme-border/60 flex items-center justify-between z-20 select-none">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-theme-text">{getPageTitle()}</h2>
        <span className="hidden sm:inline-block text-xs text-theme-primary/70 bg-theme-primary-light px-2.5 py-0.5 rounded-full font-semibold">
          Mais uma coisa que você pediu ✨
        </span>
      </div>

      {/* Right Quick Status & Controls */}
      <div className="flex items-center gap-3">
        {/* Overlay Quick Toggle */}
        <button
          onClick={() => setOverlayActive(!isOverlayActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            isOverlayActive
              ? "bg-emerald-500 text-white shadow-soft"
              : "bg-theme-surface-card border border-theme-border/60 text-theme-text-muted hover:text-theme-text"
          }`}
          title="Ativar/Desativar mira fixa na tela"
        >
          {isOverlayActive ? (
            <>
              <Pause size={13} />
              <span>Overlay Ativo 🟢</span>
            </>
          ) : (
            <>
              <Play size={13} />
              <span>Ativar Overlay</span>
            </>
          )}
        </button>

        {/* Quick Theme Cycle Dropdown */}
        <div className="flex items-center gap-1 bg-theme-surface-card p-1 rounded-xl border border-theme-border/60">
          <Palette size={14} className="text-theme-primary ml-1" />
          <select
            value={currentTheme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-transparent text-xs font-medium text-theme-text focus:outline-none cursor-pointer pr-1"
          >
            {AVAILABLE_THEMES.map((th) => (
              <option key={th.id} value={th.id} className="bg-white text-gray-900">
                {th.emoji} {th.name}
              </option>
            ))}
          </select>
        </div>

        {/* Avatar Mini Icon */}
        <a
          href="#/profile"
          className="w-8 h-8 rounded-full border border-theme-primary/60 overflow-hidden bg-pink-100 flex-shrink-0 hover:scale-105 transition-transform"
          title={`Perfil de ${wifeProfile.name}`}
        >
          <img
            src={getWifeAvatarUrl()}
            alt={wifeProfile.name}
            className="w-full h-full object-cover"
          />
        </a>
      </div>
    </header>
  );
};
