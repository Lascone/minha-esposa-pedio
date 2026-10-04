import React, { useState } from "react";
import {
  Zap,
  Crosshair,
  Sliders,
  Disc,
  Keyboard,
  Folder,
  History,
  Settings,
} from "lucide-react";
import { useAutoClickStore } from "./store/autoclickStore";
import { AutoClickTab } from "./types";

// Views
import { QuickClickView } from "./components/QuickClickView";
import { MultiPointView } from "./components/MultiPointView";
import { AutomationBuilderView } from "./components/AutomationBuilderView";
import { RecorderView } from "./components/RecorderView";
import { KeyClickerView } from "./components/KeyClickerView";
import { ProfilesView } from "./components/ProfilesView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";

// Overlays & Modals
import { TargetPickerModal } from "./components/TargetPickerModal";
import { MiniHudOverlay } from "./components/MiniHudOverlay";

export const AutoClickApp: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isRunning,
    hotkeyStartStop,
  } = useAutoClickStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPointIdToPick, setSelectedPointIdToPick] = useState<string | null>(null);


  const tabs: { id: AutoClickTab; label: string; icon: React.ReactNode }[] = [
    { id: "quick", label: "Rápido", icon: <Zap size={14} /> },
    { id: "multipoint", label: "Multi-Pontos", icon: <Crosshair size={14} /> },
    { id: "builder", label: "Sequências", icon: <Sliders size={14} /> },
    { id: "recorder", label: "Gravador", icon: <Disc size={14} /> },
    { id: "keyboard", label: "Teclas", icon: <Keyboard size={14} /> },
    { id: "profiles", label: "Perfis", icon: <Folder size={14} /> },
    { id: "history", label: "Histórico", icon: <History size={14} /> },
    { id: "settings", label: "Ajustes", icon: <Settings size={14} /> },
  ];

  const handleOpenPickerForPoint = (ptId: string) => {
    setSelectedPointIdToPick(ptId);
    setPickerOpen(true);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "quick":
        return (
          <QuickClickView
            onOpenPicker={() => {
              setSelectedPointIdToPick(null);
              setPickerOpen(true);
            }}
          />
        );
      case "multipoint":
        return <MultiPointView onPickPoint={handleOpenPickerForPoint} />;
      case "builder":
        return <AutomationBuilderView />;
      case "recorder":
        return <RecorderView />;
      case "keyboard":
        return <KeyClickerView />;
      case "profiles":
        return <ProfilesView />;
      case "history":
        return <HistoryView />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <QuickClickView
            onOpenPicker={() => {
              setSelectedPointIdToPick(null);
              setPickerOpen(true);
            }}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-10 select-none">
      {/* Minimalist Header */}
      <div className="flex items-center justify-between px-6 py-4 rounded-2xl bg-theme-surface/80 backdrop-blur-md border border-theme-border/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center font-bold text-sm">
            <Zap size={16} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-theme-text">
                Auto Click
              </h1>
              <button
                onClick={() => { window.location.hash = "/shortcuts"; }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-theme-surface-card border border-theme-border/60 hover:border-theme-primary text-theme-text-muted hover:text-theme-text transition-colors flex items-center gap-1"
                title="Configurar teclas na Central de Atalhos"
              >
                <Keyboard size={11} className="text-theme-primary" />
                <span>Atalho: {hotkeyStartStop || "Insert"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-500 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
              <span>Executando</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-surface-card border border-theme-border/40 text-theme-text-muted text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-border" />
              <span>Parado</span>
            </div>
          )}
        </div>
      </div>

      {/* Minimalist Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-theme-surface/50 border border-theme-border/40 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-theme-surface text-theme-text shadow-sm border border-theme-border/60"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface/40"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div className="min-h-[460px]">{renderActiveTab()}</div>

      {/* Target Coordinate Picker Overlay */}
      <TargetPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        targetPointId={selectedPointIdToPick}
      />

      {/* Floating Mini HUD */}
      <MiniHudOverlay />
    </div>
  );
};

export default AutoClickApp;
