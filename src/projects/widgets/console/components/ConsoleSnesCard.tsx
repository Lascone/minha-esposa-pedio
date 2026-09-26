import React from "react";
import { Gamepad2, Settings2, Play, Plus } from "lucide-react";
import { ConsoleGame, isConsoleWidgetType, isGameConfigured } from "../types";
import { useCoverUrl } from "../useCoverUrl";
import { useWidgetsStore } from "../../store/widgetsStore";

interface ConsoleSnesCardProps {
  games: ConsoleGame[];
  onOpen: () => void;
  onAddGame: () => void;
  onManage: () => void;
}

const CoverCell: React.FC<{ game: ConsoleGame }> = ({ game }) => {
  const cover = useCoverUrl(game.coverSha1, game.coverMime);
  return (
    <div className="rounded-md overflow-hidden bg-gradient-to-br from-indigo-500/60 via-purple-500/50 to-pink-500/60 flex items-center justify-center" title={game.name}>
      {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <span className="text-[7px] font-bold px-1 text-center line-clamp-2">{game.name}</span>}
    </div>
  );
};

/** Miniature of the console window showing the library grid (or an empty "add game" screen). */
const LibraryPreview: React.FC<{ games: ConsoleGame[] }> = ({ games }) => (
  <div aria-hidden className="w-full h-[150px] rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/15 flex items-center justify-center pointer-events-none select-none">
    <div className="h-[126px] aspect-[4/3.4] rounded-xl bg-slate-950/90 border border-white/15 shadow-lg flex flex-col overflow-hidden text-white">
      <div className="h-4 px-2 flex items-center gap-1 bg-gradient-to-r from-pink-600/40 to-transparent text-[7px] font-bold text-white/80 truncate">
        <Gamepad2 size={8} className="text-pink-300 shrink-0" />
        <span className="truncate flex-1">Mini Console SNES</span>
        <span className="text-white/50">{games.length}</span>
      </div>
      {games.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-white/60">
          <Gamepad2 size={24} className="text-pink-300" />
          <span className="text-[8px] font-bold tracking-widest">ADICIONE JOGOS</span>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1 p-1.5">
          {games.slice(0, 6).map((g) => (
            <CoverCell key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  </div>
);

export const ConsoleSnesCard: React.FC<ConsoleSnesCardProps> = ({ games, onOpen, onAddGame, onManage }) => {
  const playable = games.filter(isGameConfigured);
  const isOpen = useWidgetsStore((s) => s.activeWidgets.some((w) => isConsoleWidgetType(w.type) && w.visible));

  return (
    <div className="flex flex-col justify-between p-5 rounded-cuter bg-theme-surface border border-pink-500/40 hover:border-pink-500 shadow-soft hover:shadow-md transition-all group relative overflow-hidden">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            onClick={onManage}
            className="order-last ml-auto p-1 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-pink-400 transition-colors"
            title="Gerenciar jogos"
          >
            <Settings2 size={14} />
          </button>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
            Mini Console · SNES
          </span>
          <span className="px-2 py-0.5 rounded-full bg-theme-surface-card text-theme-text-muted text-[10px] font-bold border border-theme-border/60">
            {playable.length} jogo{playable.length === 1 ? "" : "s"}
          </span>
          {isOpen && (
            <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-300 text-[10px] font-bold border border-pink-300/40">
              aberto
            </span>
          )}
        </div>
        <LibraryPreview games={playable} />
        <h4 className="mt-3 text-sm font-extrabold text-theme-text group-hover:text-theme-primary transition-colors truncate">Mini Console SNES</h4>
        <p className="text-xs text-theme-text-muted leading-relaxed line-clamp-2">
          {playable.length === 0
            ? "Adicione quantos jogos de Super Nintendo quiser (.sfc/.smc) e jogue direto na área de trabalho."
            : "Sua biblioteca de SNES na área de trabalho: escolha o jogo, salve o progresso e troque quando quiser."}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onOpen}
          className="flex-1 py-2 px-3 rounded-cute text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-soft bg-theme-primary hover:bg-pink-600 text-white"
        >
          <Play size={14} />
          <span>{isOpen ? "Mostrar" : "Abrir na área de trabalho"}</span>
        </button>
        <button
          onClick={onAddGame}
          className="px-3 py-2 rounded-cute text-xs font-semibold flex items-center gap-1 bg-theme-surface-card hover:bg-theme-surface border border-theme-border/60 text-theme-text-muted hover:text-theme-text"
          title="Adicionar um jogo à biblioteca"
        >
          <Plus size={14} /> Jogo
        </button>
      </div>
    </div>
  );
};
