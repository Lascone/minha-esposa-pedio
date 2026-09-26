import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Play, Edit2, ImagePlus, Trash2, Gamepad2, Languages, FolderLock, Check, AlertTriangle } from "lucide-react";
import { useConsoleLibraryStore, initConsoleLibrarySync } from "../consoleLibraryStore";
import { ConsoleGame, isGameConfigured } from "../types";
import { getSystem, SUPPORTED_SYSTEMS, EMULATORJS_VERSION } from "../systems";
import { openConsole, forgetConsoleGame } from "../launcher";
import { commitGame, COVER_EXTENSIONS, inspectCover } from "../importer";
import { getDataDir } from "../consoleService";
import { useCoverUrl } from "../useCoverUrl";
import { GameEditorModal } from "./GameEditorModal";
import { AddGameWizard } from "./AddGameWizard";

const GameRow: React.FC<{
  game: ConsoleGame;
  onEdit: () => void;
  onChangeCover: (file: File) => void;
  onRemove: () => void;
  onOpen: () => void;
}> = ({ game, onEdit, onChangeCover, onRemove, onOpen }) => {
  const cover = useCoverUrl(game.coverSha1, game.coverMime);
  const coverInput = useRef<HTMLInputElement>(null);
  const configured = isGameConfigured(game);
  const btn =
    "flex items-center gap-1 px-2.5 py-1.5 rounded-cute text-xs font-semibold border border-theme-border/60 bg-theme-surface-card hover:bg-theme-surface text-theme-text-muted hover:text-theme-text transition-colors disabled:opacity-40";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-cuter bg-theme-surface border border-theme-border/70 shadow-soft">
      <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <Gamepad2 className="text-white/90" size={24} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-extrabold text-theme-text truncate">{game.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 text-[10px] font-bold">
            {getSystem(game.system)?.shortLabel}
          </span>
          {game.translatedPtBr && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
              <Languages size={10} /> Jogo em PT-BR
            </span>
          )}
        </div>
        <p className="text-xs text-theme-text-muted truncate mt-0.5">
          {configured ? `${game.romFileName || "arquivo configurado"}${game.patchFileName ? ` + ${game.patchFileName}` : ""}` : "Ainda não configurado"}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={onOpen} disabled={!configured} className={`${btn} !bg-theme-primary !text-white !border-transparent hover:!bg-pink-600`}>
          <Play size={12} /> Abrir
        </button>
        <button onClick={onEdit} className={btn}>
          <Edit2 size={12} /> {configured ? "Editar" : "Configurar"}
        </button>
        <input
          ref={coverInput}
          type="file"
          accept={COVER_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChangeCover(f);
            e.target.value = "";
          }}
        />
        <button onClick={() => coverInput.current?.click()} disabled={!configured} className={btn}>
          <ImagePlus size={12} /> Trocar capa
        </button>
        <button onClick={onRemove} disabled={!configured} className={`${btn} hover:!text-rose-500`}>
          <Trash2 size={12} /> Remover
        </button>
      </div>
    </div>
  );
};

export const ManageGamesView: React.FC = () => {
  const { games, error: loadError, upsertGame, removeGame } = useConsoleLibraryStore();
  const [editing, setEditing] = useState<ConsoleGame | "new" | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [dataDir, setDataDir] = useState("");

  useEffect(() => initConsoleLibrarySync(), []);
  useEffect(() => {
    getDataDir().then(setDataDir).catch(() => {});
  }, []);

  const flash = (kind: "ok" | "error", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 3500);
  };

  const handleChangeCover = async (game: ConsoleGame, file: File) => {
    try {
      const cover = await inspectCover(file);
      await upsertGame(await commitGame({ base: game, name: game.name, cover }));
      flash("ok", `Capa de "${game.name}" atualizada.`);
    } catch (e) {
      flash("error", (e as Error).message);
    }
  };

  const handleRemove = async (game: ConsoleGame) => {
    if (!confirm(`Remover "${game.name}" e todos os salvamentos dele? Os arquivos originais no seu computador não são apagados.`)) return;
    try {
      forgetConsoleGame(game.id);
      await removeGame(game.id);
      flash("ok", `"${game.name}" removido.`);
    } catch (e) {
      flash("error", `Não foi possível remover: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.location.hash = "/settings")}
            className="p-2 rounded-cute bg-theme-surface-card hover:bg-theme-surface border border-theme-border/60 text-theme-text-muted hover:text-theme-text"
            title="Voltar para Configurações"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-theme-text flex items-center gap-2">
              <Gamepad2 className="text-pink-400" size={22} /> Gerenciar jogos
            </h1>
            <p className="text-xs text-theme-text-muted">Biblioteca do Mini Console SNES. Adicione quantos jogos quiser; todos aparecem dentro do widget.</p>
          </div>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-cute bg-theme-primary hover:bg-pink-600 text-white text-xs font-bold shadow-soft active:scale-95 transition-all"
        >
          <Plus size={14} /> Adicionar jogo
        </button>
      </div>

      {loadError && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs flex gap-2">
          <AlertTriangle size={14} className="shrink-0" /> {loadError}
        </div>
      )}

      {notice && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
            notice.kind === "ok"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-200"
              : "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-200"
          }`}
        >
          {notice.kind === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />} {notice.text}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {games.length === 0 && !loadError && (
          <div className="p-8 rounded-cuter bg-theme-surface border border-dashed border-theme-border text-center text-xs text-theme-text-muted">
            Nenhum jogo ainda. Clique em <strong>Adicionar jogo</strong> e escolha um arquivo <code>.sfc</code> ou <code>.smc</code> do seu computador.
          </div>
        )}
        {games.filter(isGameConfigured).map((game) => (
          <GameRow
            key={game.id}
            game={game}
            onOpen={() => {
              openConsole(game.id);
              flash("ok", `${game.name} aberto na área de trabalho.`);
            }}
            onEdit={() => setEditing(game)}
            onChangeCover={(f) => handleChangeCover(game, f)}
            onRemove={() => handleRemove(game)}
          />
        ))}
      </div>

      <div className="p-4 rounded-cuter bg-theme-surface-card border border-theme-border/60 text-xs text-theme-text-muted space-y-1.5">
        <p className="flex items-start gap-2">
          <FolderLock size={14} className="shrink-0 mt-0.5 text-pink-400" />
          <span>
            Os arquivos importados ficam numa pasta privada do app{dataDir ? ": " : "."}
            {dataDir && <code className="break-all text-theme-text">{dataDir}</code>}. Importar o mesmo arquivo de novo não cria cópias duplicadas.
          </span>
        </p>
        <p>
          Consoles suportados: {SUPPORTED_SYSTEMS.map((s) => s.label).join(", ")}. Emulador: EmulatorJS {EMULATORJS_VERSION} (GPL-3.0),
          carregado da internet quando o jogo abre.
        </p>
      </div>

      {editing && (
        <GameEditorModal
          game={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(g) => {
            setEditing(null);
            flash("ok", `"${g.name}" salvo.`);
          }}
        />
      )}

      {wizardOpen && (
        <AddGameWizard
          onClose={() => setWizardOpen(false)}
          onDone={(g, playNow) => {
            setWizardOpen(false);
            if (playNow) openConsole(g.id);
            flash("ok", `"${g.name}" adicionado à biblioteca.`);
          }}
        />
      )}
    </div>
  );
};

export default ManageGamesView;
