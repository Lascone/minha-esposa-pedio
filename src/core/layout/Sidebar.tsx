import React from "react";
import {
  Heart,
  Home,
  Crosshair,
  FolderKanban,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  User,
  LayoutGrid,
  MousePointer,
  Keyboard,
  SlidersHorizontal,
  Bot,
  Cat,
} from "lucide-react";
import { useThemeStore } from "../theme/themeManager";
import { useProfileStore } from "../providers/dicebearProvider";

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  const { currentTheme } = useThemeStore();
  const { wifeProfile, getWifeAvatarUrl } = useProfileStore();

  const navItems: {
    id: string;
    label: string;
    icon: React.ReactNode;
    route: string;
    badge?: string;
  }[] = [
    { id: "home", label: "Início", icon: <Home size={18} />, route: "/" },
    {
      id: "projects",
      label: "Projetos",
      icon: <FolderKanban size={18} />,
      route: "/projects",
    },
    {
      id: "crosshair",
      label: "Crosshair",
      icon: <Crosshair size={18} />,
      route: "/projects/crosshair",
    },
    {
      id: "widgets",
      label: "Widgets",
      icon: <LayoutGrid size={18} />,
      route: "/widgets",
    },
    {
      id: "pet",
      label: "🐾 Pet Virtual (VPet)",
      icon: <Cat size={18} />,
      route: "/pet",
      badge: "JOGO NOVO",
    },
    {
      id: "mods",
      label: "Windows Mods",
      icon: <SlidersHorizontal size={18} />,
      route: "/mods",
      badge: "NOVO",
    },
    {
      id: "autoclick",
      label: "Auto Click",
      icon: <MousePointer size={18} />,
      route: "/autoclick",
    },
    {
      id: "shortcuts",
      label: "Atalhos",
      icon: <Keyboard size={18} />,
      route: "/shortcuts",
    },
    {
      id: "hub",
      label: "Asset Hub",
      icon: <Search size={18} />,
      route: "/hub",
    },
    {
      id: "ai",
      label: "IAs & Modelos",
      icon: <Bot size={18} />,
      route: "/ai",
      badge: "NOVO",
    },
    {
      id: "settings",
      label: "Configurações",
      icon: <Settings size={18} />,
      route: "/settings",
    },
    {
      id: "profile",
      label: "Perfil",
      icon: <User size={18} />,
      route: "/profile",
    },
    {
      id: "about",
      label: "Sobre",
      icon: <Info size={18} />,
      route: "/about",
    },
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between bg-theme-surface border-r border-theme-border/60 transition-all duration-300 z-30 select-none ${
        collapsed ? "w-20 p-3" : "w-64 p-4"
      }`}
    >
      {/* Top: Logo & Title */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div
            onClick={() => onNavigate("/")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-pink-500/30 shadow-soft group-hover:scale-105 transition-transform flex-shrink-0 bg-pink-500/10">
              <img src="/logo.png" alt="Logo Pedi para meu Marido" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-extrabold text-theme-text truncate">
                  Pedi p/ meu marido
                </span>
                <span className="text-[10px] text-theme-primary font-bold flex items-center gap-1">
                  Feito com amor 💕
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-theme-text transition-colors"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-cute text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-theme-primary text-white shadow-soft font-bold"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-xs">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Wife Special Profile Badge */}
      <div className="flex flex-col gap-2 pt-4 border-t border-theme-border/40">
        <button
          onClick={() => onNavigate("/profile")}
          className={`flex items-center gap-2.5 p-2 rounded-2xl bg-theme-surface-card hover:bg-theme-primary-light border border-theme-border/60 transition-all text-left group ${
            collapsed ? "justify-center p-1" : ""
          }`}
          title="Ver perfil da esposa"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-theme-primary/60 bg-pink-100 flex-shrink-0">
            <img
              src={getWifeAvatarUrl()}
              alt="Avatar da Esposa"
              className="w-full h-full object-cover"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-theme-text truncate group-hover:text-theme-primary transition-colors">
                {wifeProfile.name}
              </span>
              <span className="text-[10px] text-theme-text-muted truncate">
                {wifeProfile.nickname}
              </span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
