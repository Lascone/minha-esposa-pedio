import React, { useState } from "react";
import { WIDGET_REGISTRY } from "../registry";
import { WidgetType } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { Plus, Check, Sparkles, Filter } from "lucide-react";

interface WidgetsGalleryViewProps {
  onWidgetAdded?: () => void;
}

export const WidgetsGalleryView: React.FC<WidgetsGalleryViewProps> = ({
  onWidgetAdded,
}) => {
  const { activeWidgets, addWidget } = useWidgetsStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "Todos os Gadgets" },
    { id: "time", label: "Relógio & Calendário" },
    { id: "system", label: "Monitor do PC" },
    { id: "productivity", label: "Produtividade" },
    { id: "utilities", label: "Utilitários" },
  ];

  const filteredWidgets =
    selectedCategory === "all"
      ? WIDGET_REGISTRY
      : WIDGET_REGISTRY.filter((w) => w.category === selectedCategory);

  const handleAdd = (type: WidgetType) => {
    addWidget(type);
    setJustAddedId(type);
    setTimeout(() => setJustAddedId(null), 1500);
    if (onWidgetAdded) onWidgetAdded();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <Filter size={16} className="text-theme-text-muted mr-1 flex-shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
              selectedCategory === cat.id
                ? "bg-theme-primary text-white shadow-soft"
                : "bg-theme-surface-card hover:bg-theme-surface border border-theme-border/60 text-theme-text-muted hover:text-theme-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Gallery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWidgets.map((def) => {
          const activeCount = activeWidgets.filter((w) => w.type === def.type).length;
          const isJustAdded = justAddedId === def.type;

          return (
            <div
              key={def.type}
              className="flex flex-col justify-between p-5 rounded-cuter bg-theme-surface border border-theme-border/70 hover:border-pink-400/60 shadow-soft hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Card Top: Icon & Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-500 text-white flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform">
                  {def.icon}
                </div>

                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-300 text-[10px] font-bold border border-pink-300/40">
                    {activeCount} ativo{activeCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Title and Description */}
              <div className="flex flex-col gap-1.5 mb-4">
                <h4 className="text-sm font-extrabold text-theme-text group-hover:text-theme-primary transition-colors">
                  {def.name}
                </h4>
                <p className="text-xs text-theme-text-muted leading-relaxed line-clamp-2">
                  {def.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {def.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-theme-surface-card text-theme-text-muted font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Add Button */}
              <button
                onClick={() => handleAdd(def.type)}
                className={`w-full py-2 px-3 rounded-cute text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-soft ${
                  isJustAdded
                    ? "bg-emerald-500 text-white"
                    : "bg-theme-surface-card hover:bg-theme-primary text-theme-text hover:text-white border border-theme-border/60 hover:border-transparent"
                }`}
              >
                {isJustAdded ? (
                  <>
                    <Check size={14} />
                    <span>Adicionado à Área de Trabalho!</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Adicionar à Área de Trabalho</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
