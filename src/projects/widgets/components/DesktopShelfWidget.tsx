import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus,
  Trash2,
  Folder,
  Globe,
  Music,
  Gamepad2,
  FileText,
  Sparkles,
  Settings2,
  Upload,
  Check,
  Maximize2,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";

export interface ShelfShortcut {
  id: string;
  name: string;
  path: string;
  iconType: "browser" | "folder" | "music" | "game" | "notes" | "custom";
  customIcon?: string;
  slotIndex?: number;
}

export const DesktopShelfWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { updateWidgetSettings, updateWidgetSize } = useWidgetsStore();
  const { addToast } = useToast();

  const settings = widget.settings || {};
  // Empty by default: if user hasn't added shortcuts, it stays completely empty!
  const shortcuts: ShelfShortcut[] = settings.shortcuts || [];
  const columns: number = Math.min(8, Math.max(2, settings.columns || 4));
  const rows: number = Math.min(6, Math.max(1, settings.rows || 2));
  const shelfMaterial: "wood" | "glass" | "neon" | "obsidian" | "pink-pastel" =
    settings.shelfMaterial || "wood";
  const shelfProp: "plant" | "cat" | "coffee" | "books" | "retro-game" | "none" =
    settings.shelfProp || "none";

  const [isHoveringDrop, setIsHoveringDrop] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [selectedSlotForAdd, setSelectedSlotForAdd] = useState<number | null>(null);

  const [newShortcutName, setNewShortcutName] = useState("");
  const [newShortcutPath, setNewShortcutPath] = useState("");
  const [newShortcutIcon, setNewShortcutIcon] = useState<ShelfShortcut["iconType"]>("browser");

  // Launch a shortcut safely
  const handleLaunch = async (sc: ShelfShortcut) => {
    try {
      if (sc.path.startsWith("http://") || sc.path.startsWith("https://")) {
        window.open(sc.path, "_blank");
        return;
      }
      if (sc.path.startsWith("#/")) {
        window.location.hash = sc.path;
        return;
      }
      await invoke("widget_launch_target", { target: sc.path });
    } catch {
      // Fallback
      addToast(`Abrindo: ${sc.name}`, "info");
      window.open(sc.path, "_blank");
    }
  };

  // Add new shortcut
  const handleAddShortcut = (targetSlot?: number) => {
    if (!newShortcutName.trim() || !newShortcutPath.trim()) return;

    const newSc: ShelfShortcut = {
      id: `sc-${Date.now()}`,
      name: newShortcutName.trim(),
      path: newShortcutPath.trim(),
      iconType: newShortcutIcon,
      slotIndex: targetSlot !== undefined ? targetSlot : shortcuts.length,
    };

    updateWidgetSettings(widget.id, {
      shortcuts: [...shortcuts, newSc],
    });

    setNewShortcutName("");
    setNewShortcutPath("");
    setSelectedSlotForAdd(null);
    setEditingSettings(false);
    addToast("Atalho colocado na prateleira! ✨", "sparkle");
  };

  // Remove shortcut
  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateWidgetSettings(widget.id, {
      shortcuts: shortcuts.filter((s) => s.id !== id),
    });
    addToast("Atalho removido da estante.", "info");
  };

  // Apply grid size preset and auto-adjust widget dimensions
  const handleApplyPreset = (newCols: number, newRows: number) => {
    const widthPerCol = 68;
    const heightPerRow = 100;
    const calculatedWidth = Math.max(260, newCols * widthPerCol + 48);
    const calculatedHeight = Math.max(160, newRows * heightPerRow + 40);

    updateWidgetSize(widget.id, calculatedWidth, calculatedHeight);
    updateWidgetSettings(widget.id, {
      columns: newCols,
      rows: newRows,
    });

    addToast(`Prateleira redimensionada para ${newCols}x${newRows}! 🪵`, "sparkle");
  };

  // Drag and Drop files/shortcuts from desktop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoveringDrop(true);
  };

  const handleDragLeave = () => {
    setIsHoveringDrop(false);
  };

  const handleDrop = (e: React.DragEvent, targetRow?: number) => {
    e.preventDefault();
    setIsHoveringDrop(false);

    // 1. Check if native files dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const newItems: ShelfShortcut[] = droppedFiles.map((f, i) => {
        const cleanName = f.name.replace(/\.[^/.]+$/, "");
        let iconType: ShelfShortcut["iconType"] = "folder";
        const lower = f.name.toLowerCase();

        if (lower.endsWith(".exe") || lower.endsWith(".lnk")) iconType = "game";
        else if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".flac"))
          iconType = "music";
        else if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".docx"))
          iconType = "notes";
        else if (lower.endsWith(".url") || lower.endsWith(".html")) iconType = "browser";

        const baseSlot = targetRow !== undefined ? targetRow * columns : shortcuts.length;

        return {
          id: `sc-${Date.now()}-${i}`,
          name: cleanName,
          path: (f as any).path || f.name,
          iconType,
          slotIndex: baseSlot + i,
        };
      });

      updateWidgetSettings(widget.id, {
        shortcuts: [...shortcuts, ...newItems],
      });
      addToast(`${newItems.length} item(ns) colocados na prateleira! 💕`, "love");
      return;
    }

    // 2. Check if URL/Text dropped
    const textData =
      e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (textData) {
      const isUrl = textData.startsWith("http://") || textData.startsWith("https://");
      const cleanTitle = isUrl
        ? new URL(textData).hostname.replace("www.", "")
        : "Novo Atalho";

      const newSc: ShelfShortcut = {
        id: `sc-${Date.now()}`,
        name: cleanTitle,
        path: textData,
        iconType: isUrl ? "browser" : "folder",
        slotIndex: targetRow !== undefined ? targetRow * columns : shortcuts.length,
      };

      updateWidgetSettings(widget.id, {
        shortcuts: [...shortcuts, newSc],
      });
      addToast("Atalho adicionado com sucesso!", "sparkle");
    }
  };

  // Render icon based on type
  const renderShortcutIcon = (sc: ShelfShortcut) => {
    switch (sc.iconType) {
      case "browser":
        return <Globe size={22} className="text-sky-400 group-hover:scale-110 transition-transform" />;
      case "folder":
        return <Folder size={22} className="text-amber-400 group-hover:scale-110 transition-transform" />;
      case "music":
        return <Music size={22} className="text-pink-400 group-hover:scale-110 transition-transform" />;
      case "game":
        return <Gamepad2 size={22} className="text-purple-400 group-hover:scale-110 transition-transform" />;
      case "notes":
        return <FileText size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />;
      default:
        return <Sparkles size={22} className="text-pink-300 group-hover:scale-110 transition-transform" />;
    }
  };

  // Material styling for shelf planks
  const getPlankStyle = () => {
    switch (shelfMaterial) {
      case "glass":
        return "bg-white/20 dark:bg-white/10 backdrop-blur-md border-t border-white/60 border-b border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.15)]";
      case "neon":
        return "bg-slate-900 border-t-2 border-cyan-400 border-b border-cyan-500/30 shadow-[0_4px_16px_rgba(6,182,212,0.4)]";
      case "obsidian":
        return "bg-neutral-900 border-t border-neutral-700 border-b border-black/60 shadow-2xl";
      case "pink-pastel":
        return "bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 dark:from-pink-900/60 dark:via-rose-800/50 dark:to-pink-900/60 border-t border-pink-300/70 border-b border-pink-400/40 shadow-[0_6px_14px_rgba(244,114,182,0.2)]";
      default:
        // Sweet Oak Wood
        return "bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 dark:from-amber-900/80 dark:via-amber-800/70 dark:to-amber-900/80 border-t border-amber-300/80 border-b border-amber-950/40 shadow-[0_8px_18px_rgba(180,83,9,0.25)]";
    }
  };

  // Side upright column styles
  const getSideUprightStyle = () => {
    switch (shelfMaterial) {
      case "glass":
        return "bg-white/30 backdrop-blur-sm border-x border-white/40";
      case "neon":
        return "bg-cyan-950/80 border-x border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]";
      case "obsidian":
        return "bg-neutral-950 border-x border-neutral-800";
      case "pink-pastel":
        return "bg-pink-300/60 dark:bg-pink-900/60 border-x border-pink-400/50";
      default:
        return "bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 border-x border-amber-950/50 shadow-md";
    }
  };

  // Bracket style for shelf joints
  const getBracketStyle = () => {
    switch (shelfMaterial) {
      case "glass":
        return "bg-white/40 border border-white/60";
      case "neon":
        return "bg-cyan-400 shadow-[0_0_8px_#22d3ee]";
      case "obsidian":
        return "bg-neutral-800 border border-neutral-700";
      default:
        return "bg-amber-900/90 border border-amber-950/60";
    }
  };

  // Organize items by rows and columns
  const renderRow = (rowIndex: number) => {
    const rowSlots = [];
    const startIndex = rowIndex * columns;

    for (let col = 0; col < columns; col++) {
      const slotIndex = startIndex + col;
      const shortcut = shortcuts.find(
        (s) => s.slotIndex === slotIndex || (s.slotIndex === undefined && shortcuts.indexOf(s) === slotIndex)
      );

      rowSlots.push(
        <div
          key={`slot-${slotIndex}`}
          className="relative flex-1 flex flex-col items-center justify-end min-h-[68px] pb-1 px-1 group"
        >
          {shortcut ? (
            <div
              onClick={() => handleLaunch(shortcut)}
              className="relative flex flex-col items-center justify-end cursor-pointer p-1 rounded-xl hover:bg-white/20 transition-all duration-200 transform hover:-translate-y-1.5 w-full"
              title={`Clique para abrir: ${shortcut.name}\n${shortcut.path}`}
            >
              {/* Remove button on hover */}
              <button
                onClick={(e) => handleRemove(shortcut.id, e)}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110 z-20"
                title="Remover da prateleira"
              >
                <Trash2 size={10} />
              </button>

              {/* Shortcut Stand / Badge resting on shelf */}
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-theme-surface-card/95 border border-theme-border/60 shadow-[0_4px_10px_rgba(0,0,0,0.1)] group-hover:border-pink-400/80 group-hover:shadow-[0_6px_14px_rgba(244,114,182,0.25)] transition-all">
                {renderShortcutIcon(shortcut)}
              </div>

              {/* Label resting on shelf */}
              <span className="mt-1 text-[10px] font-semibold text-theme-text line-clamp-1 max-w-[56px] text-center drop-shadow-sm">
                {shortcut.name}
              </span>
            </div>
          ) : (
            /* Empty slot on the shelf: subtle + icon appears on hover, clean when not hovering */
            <button
              onClick={() => setSelectedSlotForAdd(slotIndex)}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 flex flex-col items-center justify-center w-8 h-8 rounded-xl border border-dashed border-theme-text-muted hover:border-pink-400 hover:bg-pink-500/10 text-theme-text-muted hover:text-pink-400 transition-all mb-2"
              title={`Adicionar atalho neste nicho (${rowIndex + 1}ª prateleira)`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        key={`row-${rowIndex}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, rowIndex)}
        className="relative flex flex-col w-full my-1"
      >
        {/* Row Items Space */}
        <div className="flex items-end justify-between w-full px-2 z-10">{rowSlots}</div>

        {/* Physical 3D Shelf Plank for THIS row */}
        <div
          className={`relative w-full h-3.5 rounded-md flex items-center justify-between px-2 ${getPlankStyle()} z-0`}
        >
          {/* Subtle wood grains or light reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-md pointer-events-none" />

          {/* Left & Right shelf mounting brackets */}
          <div className={`w-2 h-2 rounded-sm ${getBracketStyle()}`} />
          <div className={`w-2 h-2 rounded-sm ${getBracketStyle()}`} />
        </div>
      </div>
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
      className={`relative flex flex-col justify-between w-full h-full p-2 select-none transition-all duration-300 ${
        isHoveringDrop ? "scale-[1.01] ring-2 ring-pink-400/80 rounded-2xl" : ""
      }`}
    >
      {/* Top quick action tools */}
      <div className="absolute top-1 right-2 flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity z-30">
        <button
          onClick={() => setEditingSettings(!editingSettings)}
          className="p-1 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
          title="Tamanho da Estante & Personalização"
        >
          <Settings2 size={13} />
        </button>
      </div>

      {/* Settings Modal (Grid Size: 4x1, 4x2, 6x2, 8x4, Custom, Materials) */}
      {editingSettings && (
        <div className="absolute inset-2 z-40 flex flex-col justify-between p-3.5 rounded-2xl bg-slate-900/95 text-white border border-pink-500/40 backdrop-blur-xl animate-in fade-in duration-200 text-xs overflow-y-auto">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="font-bold text-pink-300 flex items-center gap-1.5">
                🪵 Configurar Estante ({columns}x{rows})
              </span>
              <button
                onClick={() => setEditingSettings(false)}
                className="text-white/60 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Presets: 4x1, 4x2, 6x2, 8x2, 8x4 */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-white/70 font-semibold">Tamanho Rápido:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "4x1 (1 Nível)", cols: 4, r: 1 },
                  { label: "4x2 (Padrão)", cols: 4, r: 2 },
                  { label: "6x2 (Ampla)", cols: 6, r: 2 },
                  { label: "6x3 (3 Níveis)", cols: 6, r: 3 },
                  { label: "8x2 (Panorâmica)", cols: 8, r: 2 },
                  { label: "8x4 (Estante 8x4)", cols: 8, r: 4 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleApplyPreset(preset.cols, preset.r)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      columns === preset.cols && rows === preset.r
                        ? "bg-pink-500 border-pink-400 text-white shadow-sm"
                        : "bg-slate-800 border-white/15 text-white/80 hover:bg-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders for Custom Cols & Rows */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span>Colunas:</span>
                  <span className="font-bold text-pink-300">{columns}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={columns}
                  onChange={(e) => handleApplyPreset(Number(e.target.value), rows)}
                  className="w-full accent-pink-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span>Prateleiras:</span>
                  <span className="font-bold text-pink-300">{rows}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={rows}
                  onChange={(e) => handleApplyPreset(columns, Number(e.target.value))}
                  className="w-full accent-pink-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Material select */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-[11px]">Material:</span>
              <select
                value={shelfMaterial}
                onChange={(e) =>
                  updateWidgetSettings(widget.id, { shelfMaterial: e.target.value })
                }
                className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="wood">Carvalho Doce (Madeira)</option>
                <option value="pink-pastel">Pastel Rosa & Algodão</option>
                <option value="glass">Cristal Aero Glass</option>
                <option value="neon">Cyber Neon RGB</option>
                <option value="obsidian">Mármore Preto Obsidian</option>
              </select>
            </div>

            {/* Prop select */}
            <div className="flex items-center justify-between">
              <span className="text-[11px]">Decoração no Topo:</span>
              <select
                value={shelfProp}
                onChange={(e) =>
                  updateWidgetSettings(widget.id, { shelfProp: e.target.value })
                }
                className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="none">Nenhuma (Livre & Limpa)</option>
                <option value="plant">Suculenta 🪴</option>
                <option value="cat">Gatinho Sonolento 🐱</option>
                <option value="coffee">Café Quente ☕</option>
                <option value="books">Livros Decorativos 📚</option>
                <option value="retro-game">Cartucho Retrô 🕹️</option>
              </select>
            </div>

            {/* Quick Add Manual Shortcut */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
              <span className="font-semibold text-[11px] text-pink-200">
                + Adicionar Atalho Manualmente:
              </span>
              <input
                type="text"
                placeholder="Nome do atalho/site..."
                value={newShortcutName}
                onChange={(e) => setNewShortcutName(e.target.value)}
                className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Caminho (.exe) ou URL (https://...)"
                value={newShortcutPath}
                onChange={(e) => setNewShortcutPath(e.target.value)}
                className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs text-white font-mono"
              />
              <div className="flex items-center justify-between gap-1">
                <select
                  value={newShortcutIcon}
                  onChange={(e) => setNewShortcutIcon(e.target.value as any)}
                  className="bg-slate-800 border border-white/20 rounded-lg px-1.5 py-1 text-[11px]"
                >
                  <option value="browser">🌐 Navegador</option>
                  <option value="folder">📁 Pasta</option>
                  <option value="music">🎵 Música</option>
                  <option value="game">🎮 Jogo</option>
                  <option value="notes">📝 Notas</option>
                </select>
                <button
                  onClick={() => handleAddShortcut()}
                  className="px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-[11px]"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal when user clicked an empty slot '+' */}
      {selectedSlotForAdd !== null && (
        <div className="absolute inset-2 z-40 flex flex-col justify-center p-3.5 rounded-2xl bg-slate-900/95 text-white border border-pink-500/40 backdrop-blur-xl animate-in fade-in duration-200 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
            <span className="font-bold text-pink-300">Colocar Atalho no Nicho</span>
            <button
              onClick={() => setSelectedSlotForAdd(null)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Nome do app/site..."
              value={newShortcutName}
              onChange={(e) => setNewShortcutName(e.target.value)}
              className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Caminho (.exe) ou URL (https://...)"
              value={newShortcutPath}
              onChange={(e) => setNewShortcutPath(e.target.value)}
              className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
            />
            <div className="flex items-center justify-between gap-1 mt-1">
              <select
                value={newShortcutIcon}
                onChange={(e) => setNewShortcutIcon(e.target.value as any)}
                className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs"
              >
                <option value="browser">🌐 Navegador</option>
                <option value="folder">📁 Pasta</option>
                <option value="music">🎵 Música</option>
                <option value="game">🎮 Jogo</option>
                <option value="notes">📝 Notas</option>
              </select>
              <button
                onClick={() => handleAddShortcut(selectedSlotForAdd)}
                className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs"
              >
                Salvar no Nicho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Shelf Crown / Wall Support & Decorative Prop */}
      <div className="flex items-end justify-between px-3 h-5 select-none">
        <div className="flex items-center gap-1.5">
          {shelfProp === "plant" && <span className="text-lg drop-shadow-sm">🪴</span>}
          {shelfProp === "cat" && <span className="text-lg drop-shadow-sm">🐱</span>}
          {shelfProp === "coffee" && <span className="text-lg drop-shadow-sm">☕</span>}
          {shelfProp === "books" && <span className="text-lg drop-shadow-sm">📚</span>}
          {shelfProp === "retro-game" && <span className="text-lg drop-shadow-sm">🕹️</span>}
        </div>

        {/* Drag Hint on empty shelf */}
        {shortcuts.length === 0 && (
          <div className="text-[10px] text-theme-text-muted/60 flex items-center gap-1">
            <Upload size={10} className="text-pink-400" />
            <span>Estante vazia • Arraste atalhos aqui</span>
          </div>
        )}
      </div>

      {/* Main Shelving Unit Structure (Left Upright, Shelves Rows, Right Upright) */}
      <div className="relative flex flex-1 items-stretch w-full">
        {/* Left Vertical Side Upright Pillar */}
        <div className={`w-2 rounded-l-md ${getSideUprightStyle()}`} />

        {/* Shelves Body */}
        <div className="flex-1 flex flex-col justify-around px-1 py-0.5">
          {Array.from({ length: rows }).map((_, rIdx) => renderRow(rIdx))}
        </div>

        {/* Right Vertical Side Upright Pillar */}
        <div className={`w-2 rounded-r-md ${getSideUprightStyle()}`} />
      </div>

      {/* Bottom Feet / Ground Brackets */}
      <div className="flex justify-between px-4 -mt-1 z-0">
        <div className="w-3 h-2 bg-black/40 rounded-b-md" />
        <div className="w-3 h-2 bg-black/40 rounded-b-md" />
      </div>
    </div>
  );
};
