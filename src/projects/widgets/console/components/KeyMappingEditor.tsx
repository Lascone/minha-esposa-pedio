import React, { useEffect, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { ConsoleSystem, keyCodeLabel } from "../systems";

interface KeyMappingEditorProps {
  system: ConsoleSystem;
  keys: Record<number, number>;
  onChange: (keys: Record<number, number>) => void;
  compact?: boolean;
}

export const KeyMappingEditor: React.FC<KeyMappingEditorProps> = ({ system, keys, onChange, compact }) => {
  const [listening, setListening] = useState<number | null>(null);

  useEffect(() => {
    if (listening === null) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.keyCode === 27) {
        setListening(null);
        return;
      }
      const next: Record<number, number> = {};
      for (const [idx, code] of Object.entries(keys)) {
        if (code !== e.keyCode) next[Number(idx)] = code;
      }
      next[listening] = e.keyCode;
      onChange(next);
      setListening(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, keys, onChange]);

  return (
    <div className="space-y-2">
      <div className={`grid gap-1.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {system.buttons.map((btn) => {
          const active = listening === btn.index;
          return (
            <button
              key={btn.index}
              type="button"
              onClick={() => setListening(active ? null : btn.index)}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors ${
                active
                  ? "bg-pink-500/30 border-pink-400 text-white animate-pulse"
                  : "bg-black/30 border-white/10 hover:border-pink-400/60 text-white/85"
              }`}
            >
              <span className="font-bold">{btn.label}</span>
              <span className="font-mono text-pink-200">{active ? "Pressione…" : keyCodeLabel(keys[btn.index])}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/55">
        <span className="flex items-center gap-1">
          <Keyboard size={12} /> Clique num botão e aperte a tecla desejada (Esc cancela).
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...system.defaultKeys })}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-white/70"
        >
          <RotateCcw size={11} /> Padrão
        </button>
      </div>
    </div>
  );
};
