import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { CheckSquare, Square, Palette, Plus, Trash2 } from "lucide-react";

interface StickyNotesWidgetProps {
  widget: WidgetInstance;
}

export const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();

  const title = widget.settings?.title ?? "Notas Rápidas";
  const content = widget.settings?.content ?? "";
  const noteColor = widget.settings?.noteColor ?? "yellow";
  const isTodoList = widget.settings?.isTodoList ?? false;
  const todoItems: { id: string; text: string; done: boolean }[] = widget.settings?.todoItems ?? [
    { id: "1", text: "Café da manhã especial ☕", done: true },
    { id: "2", text: "Jogar Roblox juntos 💕", done: false },
    { id: "3", text: "Ver série no sofá 🍿", done: false },
  ];

  const [newTodoText, setNewTodoText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Background color classes based on chosen note color
  const getColorClass = () => {
    switch (noteColor) {
      case "pink":
        return "bg-pink-100/95 dark:bg-pink-900/90 text-pink-950 dark:text-pink-100 border-pink-300";
      case "mint":
        return "bg-emerald-100/95 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-100 border-emerald-300";
      case "blue":
        return "bg-sky-100/95 dark:bg-sky-950/90 text-sky-950 dark:text-sky-100 border-sky-300";
      case "lavender":
        return "bg-purple-100/95 dark:bg-purple-950/90 text-purple-950 dark:text-purple-100 border-purple-300";
      case "dark":
        return "bg-slate-900/95 text-slate-100 border-slate-700";
      case "yellow":
      default:
        return "bg-amber-100/95 dark:bg-amber-950/90 text-amber-950 dark:text-amber-100 border-amber-300";
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetSettings(widget.id, { title: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWidgetSettings(widget.id, { content: e.target.value });
  };

  const handleToggleTodo = (todoId: string) => {
    const updated = todoItems.map((item) =>
      item.id === todoId ? { ...item, done: !item.done } : item
    );
    updateWidgetSettings(widget.id, { todoItems: updated });
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newItem = {
      id: String(Date.now()),
      text: newTodoText.trim(),
      done: false,
    };
    updateWidgetSettings(widget.id, { todoItems: [...todoItems, newItem] });
    setNewTodoText("");
  };

  const handleDeleteTodo = (todoId: string) => {
    const updated = todoItems.filter((i) => i.id !== todoId);
    updateWidgetSettings(widget.id, { todoItems: updated });
  };

  const colors = ["yellow", "pink", "mint", "blue", "lavender", "dark"];

  return (
    <div className={`flex flex-col w-full h-full select-none rounded-2xl p-2.5 transition-colors border shadow-sm ${getColorClass()}`}>
      {/* Top Header: Title & Action buttons */}
      <div className="flex items-center justify-between pb-1 border-b border-black/10 dark:border-white/10 mb-2">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="text-xs font-extrabold bg-transparent outline-none flex-1 truncate placeholder:text-black/40 dark:placeholder:text-white/40"
          placeholder="Título do lembrete..."
        />

        <div className="flex items-center gap-1">
          <button
            onClick={() => updateWidgetSettings(widget.id, { isTodoList: !isTodoList })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
              isTodoList ? "bg-black/15 dark:bg-white/20" : "hover:bg-black/10"
            }`}
            title="Alternar entre lista de tarefas e texto livre"
          >
            {isTodoList ? "✓ Lista" : "¶ Texto"}
          </button>

          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            title="Mudar cor do post-it"
          >
            <Palette size={12} />
          </button>
        </div>
      </div>

      {/* Color Palette Popover */}
      {showColorPicker && (
        <div className="flex items-center gap-1.5 p-1 mb-2 bg-black/10 dark:bg-white/10 rounded-lg justify-center">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                updateWidgetSettings(widget.id, { noteColor: c });
                setShowColorPicker(false);
              }}
              className={`w-4 h-4 rounded-full border border-black/20 ${
                c === "yellow"
                  ? "bg-amber-300"
                  : c === "pink"
                  ? "bg-pink-300"
                  : c === "mint"
                  ? "bg-emerald-300"
                  : c === "blue"
                  ? "bg-sky-300"
                  : c === "lavender"
                  ? "bg-purple-300"
                  : "bg-slate-800"
              } ${noteColor === c ? "ring-2 ring-black/40 dark:ring-white/60" : ""}`}
            />
          ))}
        </div>
      )}

      {/* Main Content: Todo List or Rich Textarea */}
      {isTodoList ? (
        <div className="flex flex-col flex-1 overflow-y-auto pr-1 gap-1.5 custom-scrollbar text-xs">
          {todoItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between group/item gap-1.5 py-0.5"
            >
              <div
                onClick={() => handleToggleTodo(item.id)}
                className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden"
              >
                {item.done ? (
                  <CheckSquare size={14} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <Square size={14} className="opacity-60 flex-shrink-0" />
                )}
                <span className={`truncate text-xs ${item.done ? "line-through opacity-50" : "font-medium"}`}>
                  {item.text}
                </span>
              </div>
              <button
                onClick={() => handleDeleteTodo(item.id)}
                className="opacity-0 group-hover/item:opacity-100 hover:text-rose-500 transition-opacity p-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add Todo Form */}
          <form onSubmit={handleAddTodo} className="flex items-center gap-1 mt-auto pt-1">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Adicionar tarefa..."
              className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 outline-none flex-1 placeholder:text-black/30 dark:placeholder:text-white/30"
            />
            <button
              type="submit"
              className="p-1 rounded bg-black/10 dark:bg-white/20 hover:scale-105 transition-transform"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Escreva algo fofo ou anote suas tarefas aqui..."
          className="flex-1 w-full bg-transparent resize-none outline-none text-xs leading-relaxed font-sans placeholder:text-black/30 dark:placeholder:text-white/30 custom-scrollbar"
        />
      )}
    </div>
  );
};
