import React, { useState } from "react";
import { useWidgetsStore } from "./store/widgetsStore";
import { useCompanionsStore } from "./companions/store/companionsStore";
import { WidgetsGalleryView } from "./views/WidgetsGalleryView";
import { ActiveWidgetsListView } from "./views/ActiveWidgetsListView";
import { DesktopWidgetsCanvas } from "./views/DesktopWidgetsCanvas";
import { CompanionsGalleryView } from "./companions/views/CompanionsGalleryView";
import { ActiveCompanionsListView } from "./companions/views/ActiveCompanionsListView";
import { WidgetConfigModal } from "./components/WidgetConfigModal";
import { WidgetTheme } from "./types";
import {
  LayoutGrid,
  List,
  Monitor,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Heart,
  Sliders,
  Play,
  Cat,
} from "lucide-react";

export const WidgetsApp: React.FC = () => {
  const {
    activeWidgets,
    allWidgetsVisible,
    toggleAllWidgets,
    resetAllPositions: resetAllWidgetPositions,
    launchAllActiveWidgets,
    globalTheme,
    setGlobalTheme,
  } = useWidgetsStore();

  const {
    activeCompanions,
    launchAllActiveCompanions,
    resetAllPositions: resetAllCompanionPositions,
  } = useCompanionsStore();

  // Main Section: Gadgets vs Companions
  const [mainSection, setMainSection] = useState<"widgets" | "companions">("widgets");

  // Sub Tabs for Widgets
  const [activeWidgetTab, setActiveWidgetTab] = useState<"gallery" | "active" | "canvas">("gallery");

  // Sub Tabs for Companions
  const [activeCompanionTab, setActiveCompanionTab] = useState<"catalog" | "active">("catalog");

  const [configuringWidgetId, setConfiguringWidgetId] = useState<string | null>(null);
  const selectedWidget = activeWidgets.find((w) => w.id === configuringWidgetId) || null;

  const themes: { id: WidgetTheme; label: string }[] = [
    { id: "aero-glass", label: "Aero Glass (Win 7) 💎" },
    { id: "cute-pastel", label: "Rosa Pastel 💕" },
    { id: "dark-modern", label: "Escuro Moderno 🌙" },
    { id: "cyber-neon", label: "Cyber Neon ⚡" },
    { id: "minimal-white", label: "Clean ✨" },
  ];

  const handleLaunchAll = () => {
    launchAllActiveWidgets();
    launchAllActiveCompanions();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-2">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-transparent p-6 rounded-cuter border border-theme-border/60 shadow-soft">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl select-none">
                {mainSection === "widgets" ? "🪟" : "🐾"}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-theme-primary">
                {mainSection === "widgets"
                  ? "Gadgets & Widgets da Área de Trabalho"
                  : "Companheiros & Mascotes da Área de Trabalho"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-theme-text">
              {mainSection === "widgets"
                ? "Widgets Clássicos para o seu Windows ✨"
                : "Companheiros da Área de Trabalho 💕"}
            </h1>
            <p className="text-xs md:text-sm text-theme-text-muted max-w-xl leading-relaxed">
              {mainSection === "widgets"
                ? "Inspirado nos gadgets do Windows 7: relógios analógicos e digitais, calendário, previsão do tempo, notas e monitores de hardware para enfeitar e turbinar seu PC!"
                : "Personagens fofinhos originais que andam e brincam pela sua tela: waifus chibi anime, gatinhos carinhosos, cachorrinhos e criaturas mágicas para alegrar o seu dia!"}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Launch on Desktop button */}
            <button
              onClick={handleLaunchAll}
              className="px-3.5 py-2 rounded-cute bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold shadow-soft flex items-center gap-1.5 transition-all active:scale-95"
              title="Garante que todas as janelas ativas estejam abertas no Windows"
            >
              <Play size={14} className="fill-white" />
              <span>Ativar na Área de Trabalho</span>
            </button>

            {mainSection === "widgets" ? (
              <>
                <button
                  onClick={() => toggleAllWidgets()}
                  className={`px-3.5 py-2 rounded-cute text-xs font-bold shadow-soft flex items-center gap-1.5 transition-all ${
                    allWidgetsVisible
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {allWidgetsVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{allWidgetsVisible ? "Ocultar Gadgets" : "Exibir Gadgets"}</span>
                </button>

                <button
                  onClick={resetAllWidgetPositions}
                  className="px-3.5 py-2 rounded-cute bg-theme-surface hover:bg-theme-surface-card border border-theme-border/80 text-theme-text text-xs font-bold shadow-soft flex items-center gap-1.5 transition-colors"
                  title="Traz de volta gadgets para o monitor principal"
                >
                  <RotateCcw size={14} />
                  <span>Recuperar Gadgets</span>
                </button>
              </>
            ) : (
              <button
                onClick={resetAllCompanionPositions}
                className="px-3.5 py-2 rounded-cute bg-theme-surface hover:bg-theme-surface-card border border-theme-border/80 text-theme-text text-xs font-bold shadow-soft flex items-center gap-1.5 transition-colors"
                title="Traz de volta todos os mascotes para o centro da tela"
              >
                <RotateCcw size={14} />
                <span>Recuperar Companheiros</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Theme Selector row for Widgets */}
        {mainSection === "widgets" && (
          <div className="relative z-10 flex items-center gap-2 mt-4 pt-3 border-t border-theme-border/40 text-xs">
            <span className="text-theme-text-muted font-bold flex items-center gap-1">
              <Sliders size={12} />
              Tema Padrão:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setGlobalTheme(t.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    globalTheme === t.id
                      ? "bg-theme-primary text-white shadow-soft"
                      : "bg-theme-surface/70 hover:bg-theme-surface text-theme-text-muted border border-theme-border/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Background glow */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Section Switcher: Gadgets vs Companheiros */}
      <div className="flex items-center gap-2 p-1.5 bg-theme-surface-card rounded-2xl border border-theme-border/60">
        <button
          onClick={() => setMainSection("widgets")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainSection === "widgets"
              ? "bg-theme-primary text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text"
          }`}
        >
          <LayoutGrid size={15} />
          <span>Gadgets Clássicos ({activeWidgets.length})</span>
        </button>

        <button
          onClick={() => setMainSection("companions")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainSection === "companions"
              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-soft"
              : "text-theme-text-muted hover:text-theme-text"
          }`}
        >
          <Cat size={15} className="text-pink-300" />
          <span>Companheiros da Área de Trabalho</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
            NOVO 💕
          </span>
        </button>
      </div>

      {/* SECTION 1: WIDGETS */}
      {mainSection === "widgets" && (
        <div className="space-y-6">
          {/* Tabs Header */}
          <div className="flex items-center gap-2 border-b border-theme-border/60 pb-2">
            <button
              onClick={() => setActiveWidgetTab("gallery")}
              className={`flex items-center gap-2 px-4 py-2 rounded-cute text-xs font-bold transition-all ${
                activeWidgetTab === "gallery"
                  ? "bg-theme-primary text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
              }`}
            >
              <LayoutGrid size={16} />
              <span>Galeria de Gadgets</span>
            </button>

            <button
              onClick={() => setActiveWidgetTab("active")}
              className={`flex items-center gap-2 px-4 py-2 rounded-cute text-xs font-bold transition-all ${
                activeWidgetTab === "active"
                  ? "bg-theme-primary text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
              }`}
            >
              <List size={16} />
              <span>Gadgets Ativos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {activeWidgets.length}
              </span>
            </button>

            <button
              onClick={() => setActiveWidgetTab("canvas")}
              className={`flex items-center gap-2 px-4 py-2 rounded-cute text-xs font-bold transition-all ${
                activeWidgetTab === "canvas"
                  ? "bg-theme-primary text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
              }`}
            >
              <Monitor size={16} />
              <span>Simulador & Posição</span>
            </button>
          </div>

          {/* Sub Tab Contents */}
          {activeWidgetTab === "gallery" && (
            <WidgetsGalleryView onWidgetAdded={() => {}} />
          )}

          {activeWidgetTab === "active" && (
            <ActiveWidgetsListView
              onConfigureWidget={(id) => setConfiguringWidgetId(id)}
              onNavigateToGallery={() => setActiveWidgetTab("gallery")}
            />
          )}

          {activeWidgetTab === "canvas" && (
            <DesktopWidgetsCanvas
              onConfigureWidget={(id) => setConfiguringWidgetId(id)}
            />
          )}
        </div>
      )}

      {/* SECTION 2: COMPANIONS */}
      {mainSection === "companions" && (
        <div className="space-y-6">
          {/* Sub Tabs Header */}
          <div className="flex items-center gap-2 border-b border-theme-border/60 pb-2">
            <button
              onClick={() => setActiveCompanionTab("catalog")}
              className={`flex items-center gap-2 px-4 py-2 rounded-cute text-xs font-bold transition-all ${
                activeCompanionTab === "catalog"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
              }`}
            >
              <Sparkles size={16} />
              <span>Catálogo de Personagens</span>
            </button>

            <button
              onClick={() => setActiveCompanionTab("active")}
              className={`flex items-center gap-2 px-4 py-2 rounded-cute text-xs font-bold transition-all ${
                activeCompanionTab === "active"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-card"
              }`}
            >
              <Heart size={16} />
              <span>Mascotes Passeando</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {activeCompanions.length}
              </span>
            </button>
          </div>

          {/* Sub Tab Contents */}
          {activeCompanionTab === "catalog" && <CompanionsGalleryView />}
          {activeCompanionTab === "active" && <ActiveCompanionsListView />}
        </div>
      )}

      {/* Config Modal for Widgets */}
      {configuringWidgetId && (
        <WidgetConfigModal
          widget={selectedWidget}
          onClose={() => setConfiguringWidgetId(null)}
        />
      )}
    </div>
  );
};

export default WidgetsApp;
