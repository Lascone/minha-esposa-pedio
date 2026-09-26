import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, ExternalLink } from "lucide-react";

interface ShortcutsWidgetProps {
  widget: WidgetInstance;
}

interface ShortcutItem {
  id: string;
  name: string;
  target: string;
  icon: string;
  color: string;
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { id: "1", name: "Roblox", target: "roblox://", icon: "🎮", color: "from-rose-500 to-red-600" },
  { id: "2", name: "Navegador", target: "https://google.com", icon: "🌐", color: "from-blue-500 to-indigo-600" },
  { id: "3", name: "Discord", target: "discord://", icon: "💬", color: "from-indigo-500 to-purple-600" },
  { id: "4", name: "Arquivos", target: "explorer", icon: "📁", color: "from-amber-400 to-orange-500" },
  { id: "5", name: "Calculadora", target: "calc", icon: "🧮", color: "from-emerald-500 to-teal-600" },
  { id: "6", name: "Bloco de Notas", target: "notepad", icon: "📝", color: "from-pink-400 to-rose-500" },
];

export const ShortcutsWidget: React.FC<ShortcutsWidgetProps> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();
  const shortcuts: ShortcutItem[] = widget.settings?.shortcuts ?? DEFAULT_SHORTCUTS;

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("⭐");

  const handleLaunch = async (targetPath: string) => {
    try {
      await invoke("widget_launch_target", { target: targetPath });
    } catch {
      if (targetPath.startsWith("http")) {
        window.open(targetPath, "_blank");
      }
    }
  };

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !target.trim()) return;

    const newSc: ShortcutItem = {
      id: String(Date.now()),
      name: name.trim(),
      target: target.trim(),
      icon: icon || "⭐",
      color: "from-pink-400 to-purple-500",
    };

    updateWidgetSettings(widget.id, {
      shortcuts: [...shortcuts, newSc],
    });

    setName("");
    setTarget("");
    setIsAdding(false);
  };

  const handleDeleteShortcut = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = shortcuts.filter((s) => s.id !== id);
    updateWidgetSettings(widget.id, { shortcuts: filtered });
  };

  return (
    <div className="flex flex-col w-full h-full select-none justify-between py-1">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1 mb-2 border-b border-black/10 dark:border-white/10">
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
          <span>🚀</span> Atalhos Rápidos
        </span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
          title="Adicionar atalho"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Add Shortcut Form modal/inline */}
      {isAdding ? (
        <form onSubmit={handleAddShortcut} className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/50 dark:bg-slate-800/80 text-xs">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-8 text-center p-1 rounded bg-white dark:bg-slate-900 border text-sm"
              placeholder="Emoji"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex: Roblox)"
              className="flex-1 p-1 rounded bg-white dark:bg-slate-900 border outline-none"
              autoFocus
            />
          </div>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Caminho / URL / Protocolo"
            className="p-1 rounded bg-white dark:bg-slate-900 border outline-none"
          />
          <div className="flex items-center justify-end gap-1 mt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-0.5 rounded text-[10px] text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-2.5 py-0.5 rounded bg-pink-500 text-white font-bold text-[10px]"
            >
              Salvar
            </button>
          </div>
        </form>
      ) : (
        /* Shortcuts Grid */
        <div className="grid grid-cols-3 gap-2 flex-1 items-center justify-center p-1">
          {shortcuts.map((sc) => (
            <div
              key={sc.id}
              onClick={() => handleLaunch(sc.target)}
              className="group/sc relative flex flex-col items-center justify-center p-2 rounded-2xl bg-white/30 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-700/70 border border-black/5 dark:border-white/10 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer text-center"
              title={`Iniciar ${sc.name}`}
            >
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${sc.color} text-white flex items-center justify-center text-lg shadow-sm mb-1`}
              >
                {sc.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">
                {sc.name}
              </span>

              {/* Delete button on hover */}
              <button
                onClick={(e) => handleDeleteShortcut(sc.id, e)}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-500 text-white opacity-0 group-hover/sc:opacity-100 transition-opacity shadow"
                title="Remover atalho"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
