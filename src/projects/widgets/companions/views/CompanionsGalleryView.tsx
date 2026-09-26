import React, { useState, useMemo } from "react";
import {
  Search,
  Star,
  Plus,
  Sparkles,
  Upload,
  Check,
  Info,
  ShieldCheck,
  Cat,
  Dog,
  Ghost,
  Heart,
  UserCheck,
} from "lucide-react";
import { CompanionCategory, CompanionManifest } from "../types";
import { DEFAULT_COMPANIONS } from "../registry";
import { useCompanionsStore } from "../store/companionsStore";
import { CompanionImportModal } from "../components/CompanionImportModal";

export const CompanionsGalleryView: React.FC = () => {
  const {
    customCompanions,
    favoriteIds,
    activeCompanions,
    settings,
    toggleFavorite,
    spawnCompanion,
  } = useCompanionsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [spawnNotice, setSpawnNotice] = useState<string | null>(null);

  // Combine default and custom companions
  const allCompanions: CompanionManifest[] = useMemo(() => {
    return [...DEFAULT_COMPANIONS, ...customCompanions];
  }, [customCompanions]);

  // Filtered list
  const filteredCompanions = useMemo(() => {
    return allCompanions.filter((item) => {
      // Search
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      // Favorite
      const matchesFavorite =
        !showOnlyFavorites || favoriteIds.includes(item.id);

      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [allCompanions, searchQuery, selectedCategory, showOnlyFavorites, favoriteIds]);

  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Todos", icon: <Sparkles className="w-3.5 h-3.5 text-pink-400" /> },
    { id: "waifus", label: "Waifus Chibi", icon: <Heart className="w-3.5 h-3.5 text-rose-400" /> },
    { id: "cats", label: "Gatinhos", icon: <Cat className="w-3.5 h-3.5 text-amber-400" /> },
    { id: "dogs", label: "Cachorrinhos", icon: <Dog className="w-3.5 h-3.5 text-orange-400" /> },
    { id: "creatures", label: "Criaturas & Fantasia", icon: <Ghost className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: "other", label: "Outros", icon: <UserCheck className="w-3.5 h-3.5 text-sky-400" /> },
  ];

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSpawn = async (id: string) => {
    if (activeCompanions.length >= settings.maxCompanions) {
      setSpawnNotice(
        `Limite máximo de ${settings.maxCompanions} companheiros na tela atingido. Guarde algum para adicionar mais!`
      );
      setTimeout(() => setSpawnNotice(null), 3500);
      return;
    }
    const result = await spawnCompanion(id);
    if (result) {
      setSpawnNotice("Companheiro adicionado à sua área de trabalho! 💕");
      setTimeout(() => setSpawnNotice(null), 2500);
    }
  };

  const handleSpawnSelectedBatch = async () => {
    if (selectedIds.length === 0) return;
    let spawnedCount = 0;
    for (const id of selectedIds) {
      if (activeCompanions.length + spawnedCount >= settings.maxCompanions) {
        break;
      }
      await spawnCompanion(id);
      spawnedCount++;
    }
    setSelectedIds([]);
    setSpawnNotice(`${spawnedCount} companheiro(s) adicionados com sucesso! 🥰`);
    setTimeout(() => setSpawnNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Notification */}
      {spawnNotice && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>{spawnNotice}</span>
          </div>
          <button
            onClick={() => setSpawnNotice(null)}
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Bar: Search, Category Filters, Multi-selection bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, autor, raça..."
            className="w-full bg-slate-900/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Favorite Toggle */}
          <button
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all border ${
              showOnlyFavorites
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                showOnlyFavorites ? "fill-amber-400 text-amber-400" : ""
              }`}
            />
            <span>Favoritos</span>
          </button>

          {/* Multi-selection trigger */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleSpawnSelectedBatch}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-pink-500/25"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Selecionados ({selectedIds.length})</span>
            </button>
          )}

          {/* Import Package */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-pink-300 border border-pink-500/30 text-xs font-semibold transition-all shadow"
          >
            <Upload className="w-3.5 h-3.5 text-pink-400" />
            <span>Importar Pacote</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? "bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-pink-500 text-pink-200 shadow-md shadow-pink-500/10"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Companions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCompanions.map((comp) => {
          const isFav = favoriteIds.includes(comp.id);
          const isSelected = selectedIds.includes(comp.id);
          const activeCount = activeCompanions.filter(
            (a) => a.companionId === comp.id
          ).length;

          return (
            <div
              key={comp.id}
              className={`group relative flex flex-col justify-between bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border transition-all duration-200 hover:-translate-y-1 ${
                isSelected
                  ? "border-pink-500 ring-2 ring-pink-500/30 shadow-xl shadow-pink-500/20"
                  : "border-white/10 hover:border-pink-500/40 hover:shadow-xl hover:shadow-black/40"
              }`}
            >
              {/* Card Top: Favorite + Select Checkbox */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => toggleFavorite(comp.id)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-amber-400 transition-colors"
                  title="Favoritar"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFav ? "fill-amber-400 text-amber-400" : ""
                    }`}
                  />
                </button>

                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                      {activeCount} na tela
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleSelect(comp.id)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-pink-500 border-pink-400 text-white"
                        : "border-white/20 bg-white/5 hover:border-pink-400"
                    }`}
                    title="Selecionar para adicionar em lote"
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Animated Avatar Preview Area */}
              <div className="relative h-36 flex items-center justify-center bg-gradient-to-b from-white/5 to-white/0 rounded-2xl mb-4 overflow-hidden border border-white/5">
                <img
                  src={comp.preview}
                  alt={comp.name}
                  className="h-24 w-24 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]"
                />
              </div>

              {/* Information */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white group-hover:text-pink-300 transition-colors">
                    {comp.name}
                  </h3>
                </div>
                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                  {comp.description}
                </p>

                {/* Author & License Badges */}
                <div className="pt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 border border-white/5 flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5 text-pink-400" />
                    {comp.author}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-emerald-300/80 border border-white/5 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                    {comp.license}
                  </span>
                </div>
              </div>

              {/* Spawn Button */}
              <button
                onClick={() => handleSpawn(comp.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar à Área de Trabalho</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredCompanions.length === 0 && (
        <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 text-white/60">
          <p className="text-sm">Nenhum companheiro encontrado com os filtros atuais.</p>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <CompanionImportModal onClose={() => setImportModalOpen(false)} />
      )}
    </div>
  );
};
