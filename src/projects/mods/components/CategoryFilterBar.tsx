import React from "react";
import { useModsStore } from "../store/modsStore";
import { ModCategory } from "../types";
import {
  Sparkles,
  PanelBottom,
  LayoutGrid,
  FolderTree,
  AppWindow,
  Palette,
  Cpu,
  CheckCircle2,
  Heart,
} from "lucide-react";

interface CategoryDef {
  id: ModCategory;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  { id: "all", label: "Todos", icon: <Sparkles size={14} /> },
  { id: "installed", label: "🟢 Ativos & Instalados", icon: <CheckCircle2 size={14} /> },
  { id: "taskbar", label: "Barra de Tarefas", icon: <PanelBottom size={14} /> },
  { id: "startmenu", label: "Menu Iniciar", icon: <LayoutGrid size={14} /> },
  { id: "explorer", label: "Explorador", icon: <FolderTree size={14} /> },
  { id: "windows", label: "Janelas & Apps", icon: <AppWindow size={14} /> },
  { id: "aesthetics", label: "Visual & Temas", icon: <Palette size={14} /> },
  { id: "system", label: "Sistema & Áudio", icon: <Cpu size={14} /> },
  { id: "favorites", label: "Favoritos", icon: <Heart size={14} /> },
];

export const CategoryFilterBar: React.FC = () => {
  const {
    mods,
    selectedCategory,
    setSelectedCategory,
    installedModIds,
    enabledModIds,
    favoriteModIds,
  } = useModsStore();

  const getCount = (catId: ModCategory): number => {
    if (catId === "all") return mods.length;
    if (catId === "installed") {
      const activeIds = new Set([...installedModIds, ...enabledModIds]);
      return activeIds.size;
    }
    if (catId === "favorites") return favoriteModIds.length;
    return mods.filter((m) => m.category === catId).length;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const count = getCount(cat.id);

        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              isSelected
                ? "bg-theme-primary text-white shadow-soft shadow-theme-primary/20 scale-[1.02]"
                : "bg-theme-surface-card hover:bg-theme-border/40 text-theme-text-muted hover:text-theme-text border border-theme-border/50"
            }`}
          >
            <span className={isSelected ? "text-white" : "text-theme-primary"}>
              {cat.icon}
            </span>
            <span>{cat.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-theme-border/60 text-theme-text-muted"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
