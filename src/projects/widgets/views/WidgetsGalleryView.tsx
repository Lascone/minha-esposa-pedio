import React, { useEffect, useState } from "react";
import { WIDGET_REGISTRY } from "../registry";
import { WidgetType, WidgetDefinition } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { useCustomWidgetsStore } from "../custom/customWidgetsStore";
import { CustomWidgetPackage } from "../custom/types";
import { CustomWidgetEditorModal } from "../custom/CustomWidgetEditorModal";
import { CustomWidgetDocsModal } from "../custom/CustomWidgetDocsModal";
import { ConsoleSnesCard } from "../console/components/ConsoleSnesCard";
import { WidgetThumbnail } from "../components/WidgetThumbnail";
import { AddGameWizard } from "../console/components/AddGameWizard";
import { useConsoleLibraryStore, initConsoleLibrarySync } from "../console/consoleLibraryStore";
import { openConsole } from "../console/launcher";
import { ConsoleGame } from "../console/types";
import {
  Plus,
  Check,
  Sparkles,
  Filter,
  Code,
  Upload,
  BookOpen,
  Edit2,
  Copy,
  Trash2,
  Download,
} from "lucide-react";

interface WidgetsGalleryViewProps {
  onWidgetAdded?: () => void;
}

export const WidgetsGalleryView: React.FC<WidgetsGalleryViewProps> = ({
  onWidgetAdded,
}) => {
  const { activeWidgets, addWidget } = useWidgetsStore();
  const {
    packages: customPackages,
    deletePackage,
    duplicatePackage,
    exportPackageAsJson,
    importPackageFromJson,
  } = useCustomWidgetsStore();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CustomWidgetPackage | undefined>(undefined);
  const [docsOpen, setDocsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const consoleGames = useConsoleLibraryStore((s) => s.games);

  useEffect(() => initConsoleLibrarySync(), []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleOpenConsole = (game?: ConsoleGame) => {
    openConsole(game ? game.id : undefined);
    showNotice(game ? `${game.name} aberto na área de trabalho! 🎮` : "Mini Console SNES aberto na área de trabalho! 🎮");
    if (onWidgetAdded) onWidgetAdded();
  };

  const categories = [
    { id: "all", label: "Todos os Gadgets" },
    { id: "console", label: "Mini Console 🎮" },
    { id: "custom", label: "Personalizados ✨" },
    { id: "time", label: "Relógio & Calendário" },
    { id: "system", label: "Monitor do PC" },
    { id: "productivity", label: "Produtividade" },
    { id: "utilities", label: "Utilitários" },
  ];

  // Convert custom packages to WidgetDefinitions so they blend seamlessly
  const customWidgetDefs: WidgetDefinition[] = customPackages.map((pkg) => ({
    type: pkg.manifest.id,
    name: pkg.manifest.name,
    category: (pkg.manifest.category || "utilities") as any,
    icon: pkg.manifest.icon || "🧩",
    description: pkg.manifest.description,
    defaultWidth: pkg.manifest.defaultWidth,
    defaultHeight: pkg.manifest.defaultHeight,
    minWidth: pkg.manifest.minWidth,
    minHeight: pkg.manifest.minHeight,
    resizable: pkg.manifest.resizable,
    tags: pkg.manifest.tags || ["custom"],
  }));

  const allAvailableWidgets = [...customWidgetDefs, ...WIDGET_REGISTRY];

  const filteredWidgets =
    selectedCategory === "all"
      ? allAvailableWidgets
      : selectedCategory === "console"
      ? []
      : selectedCategory === "custom"
      ? customWidgetDefs
      : allAvailableWidgets.filter((w) => w.category === selectedCategory);

  const showConsoleCards = selectedCategory === "all" || selectedCategory === "console";

  const handleAdd = (type: string) => {
    addWidget(type as WidgetType);
    setJustAddedId(type);
    setTimeout(() => setJustAddedId(null), 1500);
    if (onWidgetAdded) onWidgetAdded();
  };

  const handleOpenNewEditor = () => {
    setEditingPackage(undefined);
    setEditorOpen(true);
  };

  const handleEditCustom = (id: string) => {
    const pkg = customPackages.find((p) => p.manifest.id === id);
    if (pkg) {
      setEditingPackage(pkg);
      setEditorOpen(true);
    }
  };

  const handleDuplicateCustom = (id: string) => {
    const duplicated = duplicatePackage(id);
    if (duplicated) {
      setNotice(`Widget "${duplicated.manifest.name}" duplicado com sucesso!`);
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const handleDeleteCustom = (id: string) => {
    const pkg = customPackages.find((p) => p.manifest.id === id);
    if (pkg && confirm(`Deseja remover o widget personalizado "${pkg.manifest.name}"?`)) {
      deletePackage(id);
      setNotice(`Widget "${pkg.manifest.name}" removido.`);
      setTimeout(() => setNotice(null), 2000);
    }
  };

  const handleExportCustom = (id: string) => {
    const json = exportPackageAsJson(id);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = importPackageFromJson(text);
      if (res.success && res.pkg) {
        setNotice(`Widget "${res.pkg.manifest.name}" importado com sucesso!`);
        setTimeout(() => setNotice(null), 2500);
      } else {
        alert(res.error || "Erro ao importar pacote.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Adicionar Personalizado */}
      <div className="relative overflow-hidden rounded-cuter p-5 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 backdrop-blur-md shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center text-2xl shadow-soft shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                Adicionar Personalizado <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500 text-white">Novo!</span>
              </h3>
              <p className="text-xs text-theme-text-muted mt-0.5 leading-relaxed">
                Crie seus próprios widgets com código (HTML/CSS/JS isolado em sandbox) ou importe pacotes .json prontos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Create with code */}
            <button
              onClick={handleOpenNewEditor}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-cute bg-theme-primary hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-soft active:scale-95"
            >
              <Code size={14} />
              <span>Criar com Modelo</span>
            </button>

            {/* Import JSON */}
            <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-cute bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text text-xs font-bold transition-all cursor-pointer shadow-soft">
              <Upload size={14} className="text-pink-400" />
              <span>Importar Pacote</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {/* In-app Documentation */}
            <button
              onClick={() => setDocsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-cute bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text text-xs font-semibold transition-all shadow-soft"
              title="Aprenda a criar seu widget personalizado"
            >
              <BookOpen size={14} className="text-sky-400" />
              <span>Como Criar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between shadow-soft animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      )}

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
        {showConsoleCards && (
          <ConsoleSnesCard
            games={consoleGames}
            onOpen={() => handleOpenConsole()}
            onAddGame={() => setWizardOpen(true)}
            onManage={() => (window.location.hash = "/settings/console")}
          />
        )}
        {filteredWidgets.map((def) => {
          const isCustom = customPackages.some((p) => p.manifest.id === def.type);
          const activeCount = activeWidgets.filter((w) => w.type === def.type).length;
          const isJustAdded = justAddedId === def.type;

          return (
            <div
              key={def.type}
              className={`flex flex-col justify-between p-5 rounded-cuter bg-theme-surface border shadow-soft hover:shadow-md transition-all group relative overflow-hidden ${
                isCustom
                  ? "border-pink-500/40 hover:border-pink-500"
                  : "border-theme-border/70 hover:border-pink-400/60"
              }`}
            >
              {/* Card Top: Icon, Badges & Custom Actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-500 text-white flex items-center justify-center text-lg shadow-soft group-hover:scale-110 transition-transform">
                  {def.icon}
                </div>

                <div className="flex items-center gap-1.5">
                  {isCustom && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 dark:text-purple-300 text-[10px] font-bold border border-purple-500/30">
                      Personalizado
                    </span>
                  )}
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-300 text-[10px] font-bold border border-pink-300/40">
                      {activeCount} ativo{activeCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <WidgetThumbnail def={def} />
              </div>

              {/* Title and Description */}
              <div className="flex flex-col gap-1.5 mb-3">
                <h4 className="text-sm font-extrabold text-theme-text group-hover:text-theme-primary transition-colors">
                  {def.name}
                </h4>
                <p className="text-xs text-theme-text-muted leading-relaxed line-clamp-2">
                  {def.description}
                </p>
              </div>

              {/* Tags & Action Icons for Custom Widgets */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap gap-1">
                  {def.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-theme-surface-card text-theme-text-muted font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {isCustom && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditCustom(def.type)}
                      className="p-1 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-pink-400 transition-colors"
                      title="Editar código"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDuplicateCustom(def.type)}
                      className="p-1 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-sky-400 transition-colors"
                      title="Duplicar widget"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => handleExportCustom(def.type)}
                      className="p-1 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-emerald-400 transition-colors"
                      title="Exportar pacote .json"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCustom(def.type)}
                      className="p-1 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-rose-400 transition-colors"
                      title="Excluir widget"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
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

      {filteredWidgets.length === 0 && !showConsoleCards && (
        <div className="text-center py-16 bg-theme-surface rounded-cuter border border-theme-border text-theme-text-muted">
          <p className="text-sm">Nenhum gadget encontrado nesta categoria.</p>
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <CustomWidgetEditorModal
          initialPackage={editingPackage}
          onClose={() => setEditorOpen(false)}
          onSaved={(pkg) => {
            setNotice(`Widget "${pkg.manifest.name}" salvo com sucesso!`);
            setTimeout(() => setNotice(null), 2500);
          }}
        />
      )}

      {wizardOpen && (
        <AddGameWizard
          onClose={() => setWizardOpen(false)}
          onDone={(game, playNow) => {
            setWizardOpen(false);
            if (playNow) handleOpenConsole(game);
            else showNotice(`${game.name} adicionado à biblioteca do Mini Console!`);
          }}
        />
      )}

      {/* Docs Modal */}
      {docsOpen && (
        <CustomWidgetDocsModal
          onClose={() => setDocsOpen(false)}
          onOpenEditor={() => {
            setDocsOpen(false);
            handleOpenNewEditor();
          }}
        />
      )}
    </div>
  );
};
