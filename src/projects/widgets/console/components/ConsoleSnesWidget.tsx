import React, { useEffect, useMemo, useState } from "react";
import { Gamepad2, Plus, Search, X, Edit2, Trash2, Languages, Loader2, AlertTriangle } from "lucide-react";
import { WidgetInstance } from "../../types";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useConsoleLibraryStore, initConsoleLibrarySync } from "../consoleLibraryStore";
import { ConsoleGame, consoleWidgetGameId, isGameConfigured } from "../types";
import { selectConsoleGame } from "../launcher";
import { useCoverUrl } from "../useCoverUrl";
import { ConsoleGameWidget } from "./ConsoleGameWidget";
import { AddGameWizard } from "./AddGameWizard";
import { GameEditorModal } from "./GameEditorModal";

const GameTile: React.FC<{
  game: ConsoleGame;
  onPlay: () => void;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ game, onPlay, onEdit, onRemove }) => {
  const cover = useCoverUrl(game.coverSha1, game.coverMime);
  return (
    <div className="group relative rounded-xl overflow-hidden bg-slate-800/80 border border-white/10 hover:border-pink-400/70 transition-colors">
      <button onClick={onPlay} className="block w-full text-left" title={`Jogar ${game.name}`}>
        <div className="aspect-[4/3] bg-gradient-to-br from-indigo-500/60 via-purple-500/50 to-pink-500/60 flex items-center justify-center overflow-hidden">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <Gamepad2 size={28} className="text-white/80" />
          )}
        </div>
        <div className="px-2 py-1.5">
          <p className="text-[11px] font-bold truncate">{game.name}</p>
          {game.translatedPtBr && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300">
              <Languages size={9} /> PT-BR
            </span>
          )}
        </div>
      </button>
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded-lg bg-black/70 hover:bg-black text-white/85" title="Editar (nome, capa, patch, controles)">
          <Edit2 size={11} />
        </button>
        <button onClick={onRemove} className="p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white/85" title="Remover da biblioteca">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

/** The single Mini Console SNES window: a game library that turns into the player once a game is picked. */
export const ConsoleSnesWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { games, loaded, error, removeGame } = useConsoleLibraryStore();
  const { removeWidget } = useWidgetsStore();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ConsoleGame | null>(null);

  useEffect(() => initConsoleLibrarySync(), []);

  const gameId = consoleWidgetGameId(widget);
  const selected = games.find((g) => g.id === gameId);
  const playable = games.filter(isGameConfigured);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? playable.filter((g) => g.name.toLowerCase().includes(q)) : playable;
  }, [playable, query]);

  const pick = (id: string | null) => selectConsoleGame(widget.id, id);

  if (loaded && selected && isGameConfigured(selected)) {
    return <ConsoleGameWidget key={selected.id} widget={widget} gameId={selected.id} onSwitchGame={() => pick(null)} />;
  }

  const handleRemove = async (game: ConsoleGame) => {
    if (!confirm(`Remover "${game.name}" e todos os salvamentos dele? O arquivo original no seu computador não é apagado.`)) return;
    try {
      await removeGame(game.id);
    } catch (e) {
      alert(`Não foi possível remover: ${(e as Error).message}`);
    }
  };

  return (
    <div className="w-screen h-screen p-1 select-none">
      <div className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-slate-950 border border-pink-500/35 shadow-2xl text-white">
        <div data-tauri-drag-region className="flex items-center gap-2 px-3 h-8 shrink-0 bg-gradient-to-r from-pink-600/40 via-purple-600/30 to-slate-900 cursor-grab">
          <Gamepad2 size={14} className="text-pink-300 pointer-events-none" />
          <span data-tauri-drag-region className="text-xs font-bold truncate flex-1">
            Mini Console SNES
          </span>
          <span className="text-[10px] text-white/55 pointer-events-none">
            {playable.length} jogo{playable.length === 1 ? "" : "s"}
          </span>
          <button onClick={() => removeWidget(widget.id)} className="p-1 rounded-lg hover:bg-rose-500/80 text-white/80" title="Fechar">
            <X size={14} />
          </button>
        </div>

        {!loaded ? (
          <div className="flex-1 flex items-center justify-center text-white/70 text-xs gap-2">
            <Loader2 className="animate-spin text-pink-400" size={18} /> Abrindo biblioteca…
          </div>
        ) : playable.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Gamepad2 size={28} />
            </div>
            <p className="text-sm font-bold">Sua biblioteca de SNES está vazia</p>
            <p className="text-xs text-white/60 max-w-xs">
              Adicione seus jogos (<code>.sfc</code> ou <code>.smc</code>). Nenhum jogo vem com o aplicativo: você escolhe os arquivos que já tem.
            </p>
            {error && (
              <p className="flex items-center gap-1 text-[11px] text-amber-300">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-xs font-bold shadow-lg shadow-pink-500/25"
            >
              <Plus size={14} /> Adicionar jogo
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-white/5">
              <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 focus-within:border-pink-400/60">
                <Search size={12} className="text-white/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar jogo…"
                  className="flex-1 bg-transparent outline-none text-xs placeholder:text-white/35"
                />
              </div>
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-[11px] font-bold">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
                {filtered.map((game) => (
                  <GameTile key={game.id} game={game} onPlay={() => pick(game.id)} onEdit={() => setEditing(game)} onRemove={() => handleRemove(game)} />
                ))}
              </div>
              {filtered.length === 0 && <p className="text-center text-xs text-white/50 py-6">Nenhum jogo encontrado para "{query}".</p>}
            </div>
          </>
        )}

        {adding && (
          <AddGameWizard
            compact
            onClose={() => setAdding(false)}
            onDone={(game, playNow) => {
              setAdding(false);
              if (playNow) pick(game.id);
            }}
          />
        )}
        {editing && <GameEditorModal game={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      </div>
    </div>
  );
};

export default ConsoleSnesWidget;
