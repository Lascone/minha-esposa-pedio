import React, { useEffect, useMemo } from "react";
import { useModsStore } from "../store/modsStore";
import { EngineStatusBanner } from "../components/EngineStatusBanner";
import { CategoryFilterBar } from "../components/CategoryFilterBar";
import { ModCard } from "../components/ModCard";
import { ModDetailsModal } from "../components/ModDetailsModal";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  X,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { ModSortOption } from "../types";

export const ModsView: React.FC = () => {
  const {
    mods,
    isLoading,
    searchQuery,
    selectedCategory,
    selectedSort,
    installedModIds,
    enabledModIds,
    favoriteModIds,
    setSearchQuery,
    setSelectedSort,
    loadInitialData,
  } = useModsStore();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filter and sort mods
  const filteredMods = useMemo(() => {
    let result = [...mods];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.targetProcesses.some((p) => p.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory === "installed") {
      result = result.filter(
        (m) => installedModIds.includes(m.id) || enabledModIds.includes(m.id)
      );
    } else if (selectedCategory === "favorites") {
      result = result.filter((m) => favoriteModIds.includes(m.id));
    } else if (selectedCategory !== "all") {
      result = result.filter((m) => m.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      switch (selectedSort) {
        case "popular":
          return b.users - a.users;
        case "rating":
          return b.rating - a.rating;
        case "recent":
          return b.updatedAt - a.updatedAt;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [
    mods,
    searchQuery,
    selectedCategory,
    selectedSort,
    installedModIds,
    enabledModIds,
    favoriteModIds,
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-2">
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">✨</span>
            <h2 className="text-2xl font-extrabold text-theme-text tracking-tight">
              Windows Mods & Customizações
            </h2>
          </div>
          <p className="text-xs text-theme-text-muted max-w-2xl">
            Catálogo completo e gerenciador de modificações do Windows via Motor Nativo PMM Mods. Personalize a barra de tarefas, o Explorer, janelas e efeitos visuais com total independência e estabilidade.
          </p>
        </div>

        {/* Quick stats badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-2xl bg-theme-surface-card border border-theme-border/60 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-theme-text">
              {enabledModIds.length} Ativos
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-theme-surface-card border border-theme-border/60 shadow-sm flex items-center gap-1.5 text-theme-text-muted">
            <Layers size={13} />
            <span>{mods.length} Mods</span>
          </div>
        </div>
      </div>

      {/* Engine Status & Quick Actions Banner */}
      <EngineStatusBanner />

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mod por nome, autor, descrição ou processo (ex: explorer.exe)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-theme-border/60 bg-theme-surface-card text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-primary/60 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-text-muted hover:text-theme-text rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-theme-border/60 bg-theme-surface-card text-xs text-theme-text shadow-sm">
              <ArrowUpDown size={14} className="text-theme-text-muted" />
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as ModSortOption)}
                className="bg-transparent text-xs font-semibold text-theme-text focus:outline-none cursor-pointer"
              >
                <option value="popular">Mais Populares</option>
                <option value="rating">Melhor Avaliados</option>
                <option value="recent">Atualizados Recentemente</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <CategoryFilterBar />
      </div>

      {/* Mods Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3 text-theme-text-muted">
          <span className="text-3xl animate-spin">⏳</span>
          <span className="text-sm font-medium">Carregando catálogo de mods do Windows...</span>
        </div>
      ) : selectedCategory === "installed" && filteredMods.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>{filteredMods.length} mod(s) ativos no sistema.</strong> Para as alterações visuais entrarem em vigor no Windows Explorer ou barra de tarefas, certifique-se de reiniciar o Explorer.
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMods.map((mod) => (
              <ModCard key={mod.id} mod={mod} />
            ))}
          </div>
        </div>
      ) : filteredMods.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-dashed border-theme-border/60 bg-theme-surface-card/40 gap-3 text-center">
          <span className="text-4xl">{selectedCategory === "installed" ? "📦" : "🔍"}</span>
          <h4 className="text-base font-bold text-theme-text">
            {selectedCategory === "installed"
              ? "Nenhum mod ativo no momento"
              : "Nenhum mod encontrado"}
          </h4>
          <p className="text-xs text-theme-text-muted max-w-md">
            {selectedCategory === "installed"
              ? "Você ainda não ativou nenhum mod. Navegue pela aba 'Todos' ou pelas categorias para escolher modificações para a barra de tarefas, menu iniciar ou explorador!"
              : "Nenhum mod corresponde aos filtros selecionados. Tente buscar por outros termos ou selecionar outra categoria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMods.map((mod) => (
            <ModCard key={mod.id} mod={mod} />
          ))}
        </div>
      )}

      {/* Details & Source Code Modal */}
      <ModDetailsModal />
    </div>
  );
};
