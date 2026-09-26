import React, { useState } from "react";
import {
  Keyboard,
  Monitor,
  Crosshair,
  MousePointer,
  LayoutGrid,
  Search,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Info,
  Sliders,
  Layers,
} from "lucide-react";
import {
  useShortcutsStore,
  ShortcutCategory,
  ShortcutDefinition,
} from "../stores/shortcutsStore";
import { ShortcutRecorder } from "../components/ShortcutRecorder";
import { useToast } from "../components/Toast";

export const ShortcutsHubView: React.FC = () => {
  const { addToast } = useToast();
  const {
    shortcuts,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    resetAll,
  } = useShortcutsStore();

  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const categories: { id: ShortcutCategory; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Todos os Atalhos", icon: <Layers size={16} /> },
    { id: "system", label: "Sistema", icon: <Monitor size={16} /> },
    { id: "crosshair", label: "Mira & Crosshair", icon: <Crosshair size={16} /> },
    { id: "autoclick", label: "Auto Click", icon: <MousePointer size={16} /> },
    { id: "widgets", label: "Widgets & Gadgets", icon: <LayoutGrid size={16} /> },
  ];

  // Filtros de busca e categoria
  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesCategory =
      selectedCategory === "all" || s.category === selectedCategory;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.label.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.currentKey.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const customCount = shortcuts.filter(
    (s) => s.currentKey !== s.defaultKey
  ).length;

  const handleResetAllShortcuts = async () => {
    await resetAll();
    setConfirmResetAll(false);
    addToast("Todos os atalhos foram restaurados para os padrões originais! 💕", "sparkle");
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 select-none animate-fade-in">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border/60 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-soft">
            <Keyboard size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-theme-text">
                Central de Atalhos
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                Unificado
              </span>
            </div>
            <p className="text-xs text-theme-text-muted">
              Configure, revise e teste todos os atalhos rápidos do aplicativo em um único lugar
            </p>
          </div>
        </div>

        {/* Resumo & Botão Reset */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {customCount > 0 && (
            <span className="text-xs text-theme-primary font-bold">
              {customCount} {customCount === 1 ? "personalizado" : "personalizados"}
            </span>
          )}

          {confirmResetAll ? (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-red-500 px-1">
                Restaurar todos?
              </span>
              <button
                onClick={handleResetAllShortcuts}
                className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
              >
                Sim
              </button>
              <button
                onClick={() => setConfirmResetAll(false)}
                className="px-2.5 py-1 rounded-lg bg-theme-surface text-theme-text text-xs hover:bg-theme-surface-card transition-colors"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmResetAll(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-card border border-theme-border/60 text-xs font-bold text-theme-text-muted hover:text-theme-text transition-all"
            >
              <RotateCcw size={13} />
              <span>Restaurar Padrões</span>
            </button>
          )}
        </div>
      </div>

      {/* Dica de Segurança sobre o ESC nos Jogos */}
      <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/20 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-pink-500/20 text-pink-500 flex-shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div className="flex flex-col text-xs">
          <span className="font-bold text-theme-text">
            Proteção de Jogos Ativada:
          </span>
          <span className="text-theme-text-muted">
            A tecla <strong>ESC</strong> isolada é preservada integralmente para os seus jogos (Roblox, Minecraft, etc.).
            A parada de emergência do autoclick utiliza com segurança a combinação <strong>Shift + ESC</strong>.
          </span>
        </div>
      </div>

      {/* Submenus e Barra de Pesquisa */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Submenus por Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl bg-theme-surface/70 border border-theme-border/50 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const count =
              cat.id === "all"
                ? shortcuts.length
                : shortcuts.filter((s) => s.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-theme-surface text-theme-primary shadow-sm border border-theme-border/80"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface/40"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-theme-primary/10 text-theme-primary"
                      : "bg-theme-bg/60 text-theme-text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Campo de Busca */}
        <div className="relative min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar atalho ou tecla..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-theme-surface border border-theme-border/60 text-xs text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-primary transition-colors"
          />
        </div>
      </div>

      {/* Lista de Atalhos */}
      <div className="flex flex-col gap-3">
        {filteredShortcuts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-theme-surface border border-theme-border/60 flex flex-col items-center justify-center gap-2">
            <Keyboard size={32} className="text-theme-text-muted opacity-40 mb-1" />
            <span className="font-bold text-sm text-theme-text">
              Nenhum atalho encontrado
            </span>
            <span className="text-xs text-theme-text-muted max-w-sm">
              Tente buscar por outro termo ou selecione uma categoria diferente no submenu acima.
            </span>
          </div>
        ) : (
          filteredShortcuts.map((shortcut) => (
            <ShortcutRecorder key={shortcut.id} shortcut={shortcut} />
          ))
        )}
      </div>

      {/* Dica de Uso */}
      <div className="p-4 rounded-2xl bg-theme-surface/50 border border-theme-border/40 flex items-center justify-between text-xs text-theme-text-muted">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-theme-primary" />
          <span>
            Dica: Clique no botão <strong>Alterar</strong> ou diretamente nas teclas para gravar uma nova combinação personalizada.
          </span>
        </div>
        <span className="text-[10px] font-mono">Pressione para testar em tempo real</span>
      </div>
    </div>
  );
};

export default ShortcutsHubView;
