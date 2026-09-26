import React, { useRef, useState } from "react";
import { X, FileUp, ImagePlus, Languages, Loader2, AlertTriangle, CheckCircle2, Trash2, Save } from "lucide-react";
import { getSystem, SUPPORTED_SYSTEMS, ConsoleSystemId } from "../systems";
import { ConsoleGame, DEFAULT_PREFS } from "../types";
import { useConsoleLibraryStore } from "../consoleLibraryStore";
import {
  COVER_EXTENSIONS,
  commitGame,
  findDuplicateRom,
  InspectedCover,
  InspectedPatch,
  InspectedRom,
  inspectCover,
  inspectPatch,
  inspectRom,
  newGameId,
  PATCH_EXTENSIONS,
} from "../importer";
import { readFile } from "../consoleService";
import { looksLikePtBrDump, suggestGameName } from "../smw";
import { useCoverUrl } from "../useCoverUrl";
import { KeyMappingEditor } from "./KeyMappingEditor";

interface GameEditorModalProps {
  game?: ConsoleGame;
  onClose: () => void;
  onSaved: (game: ConsoleGame) => void;
}

export const GameEditorModal: React.FC<GameEditorModalProps> = ({ game, onClose, onSaved }) => {
  const { games, upsertGame } = useConsoleLibraryStore();
  const isNew = !game;

  const [systemId, setSystemId] = useState<ConsoleSystemId>(game?.system || SUPPORTED_SYSTEMS[0].id);
  const system = getSystem(systemId)!;
  const [name, setName] = useState(game?.name || "");
  const [rom, setRom] = useState<InspectedRom | null>(null);
  const [patch, setPatch] = useState<InspectedPatch | null>(null);
  const [removePatch, setRemovePatch] = useState(false);
  const [translated, setTranslated] = useState(game?.translatedPtBr ?? false);
  const [cover, setCover] = useState<InspectedCover | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [keys, setKeys] = useState<Record<number, number>>(game?.keys || system.defaultKeys);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const romInput = useRef<HTMLInputElement>(null);
  const patchInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const existingCover = useCoverUrl(removeCover ? undefined : game?.coverSha1, game?.coverMime);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const shownCover = coverPreview || existingCover;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setWorking(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const handleRom = (file?: File) =>
    file &&
    run(async () => {
      const inspected = await inspectRom(file, system, system.id === "snes");
      const dup = findDuplicateRom(games, inspected.sha1, game?.id);
      if (dup) throw new Error(`Esse jogo já está na biblioteca como "${dup.name}".`);
      setRom(inspected);
      setPatch(null);
      setTranslated(looksLikePtBrDump(file.name, inspected.smw?.title));
      if (!name.trim()) setName(suggestGameName(file.name, inspected.smw));
    });

  const currentRomForPatch = async (): Promise<InspectedRom> => {
    if (rom) return rom;
    if (!game?.romSha1) throw new Error("Selecione primeiro o arquivo do jogo.");
    const bytes = await readFile(game.romSha1);
    return { fileName: game.romFileName || "jogo", ext: game.romExt || system.extensions[0], bytes, sha1: game.romSha1, smw: null };
  };

  const handlePatch = (file?: File) =>
    file &&
    run(async () => {
      setPatch(await inspectPatch(file, await currentRomForPatch()));
      setRemovePatch(false);
    });

  const handleCover = (file?: File) =>
    file &&
    run(async () => {
      const inspected = await inspectCover(file);
      setCover(inspected);
      setRemoveCover(false);
      setCoverPreview(URL.createObjectURL(file));
    });

  const handleSave = () =>
    run(async () => {
      if (!name.trim()) throw new Error("Dê um nome para o jogo.");
      if (isNew && !rom) throw new Error("Selecione o arquivo do jogo.");
      const base: ConsoleGame = game || {
        id: newGameId(rom!.sha1, games),
        name: name.trim(),
        system: systemId,
        isBuiltin: false,
        translatedPtBr: false,
        prefs: DEFAULT_PREFS,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const saved = await commitGame({
        base: { ...base, system: systemId },
        name,
        rom: rom || undefined,
        patch: patch ? patch : removePatch ? null : undefined,
        translatedPtBr: translated,
        cover: cover ? cover : removeCover ? null : undefined,
        keys,
      });
      await upsertGame(saved);
      onSaved(saved);
    });

  const hasPatch = !!patch || (!removePatch && !!game?.patchedSha1 && !rom);
  const section = "p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2";

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-pink-500/30 rounded-3xl p-6 shadow-2xl text-white text-xs"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="text-base font-bold">{isNew ? "Adicionar jogo" : `Editar ${game?.name}`}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="font-bold text-white/85">Nome</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Donkey Kong Country"
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 focus:border-pink-400/70 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-white/85">Console</span>
                <select
                  value={systemId}
                  disabled={!isNew}
                  onChange={(e) => setSystemId(e.target.value as ConsoleSystemId)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 outline-none disabled:opacity-60"
                >
                  {SUPPORTED_SYSTEMS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                {shownCover ? <img src={shownCover} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="text-white/80" size={28} />}
              </div>
              <input ref={coverInput} type="file" accept={COVER_EXTENSIONS.join(",")} className="hidden" onChange={(e) => handleCover(e.target.files?.[0])} />
              <div className="flex gap-1">
                <button onClick={() => coverInput.current?.click()} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                  {shownCover ? "Trocar capa" : "Escolher capa"}
                </button>
                {shownCover && (
                  <button
                    onClick={() => {
                      setCover(null);
                      setCoverPreview(null);
                      setRemoveCover(true);
                    }}
                    className="p-1 rounded-lg hover:bg-rose-500/30"
                    title="Remover capa"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={section}>
            <span className="font-bold text-white/85">Arquivo do jogo ({system.extensions.join(", ")})</span>
            <input ref={romInput} type="file" accept={system.extensions.join(",")} className="hidden" onChange={(e) => handleRom(e.target.files?.[0])} />
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => romInput.current?.click()} disabled={working} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/80 hover:bg-pink-500 font-bold">
                <FileUp size={13} /> {rom || game?.romSha1 ? "Trocar arquivo" : "Selecionar arquivo"}
              </button>
              <span className="text-white/60 truncate">
                {rom ? `${rom.fileName} (novo)` : game?.romFileName || (game?.romSha1 ? "configurado" : "nenhum arquivo")}
              </span>
            </div>
            {rom?.smw?.title && <p className="text-white/60">Título interno: "{rom.smw.title}"</p>}
          </div>

          <div className={section}>
            <span className="font-bold text-white/85">Patch opcional (.ips, .bps, .ups)</span>
            <input ref={patchInput} type="file" accept={PATCH_EXTENSIONS.join(",")} className="hidden" onChange={(e) => handlePatch(e.target.files?.[0])} />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => patchInput.current?.click()}
                disabled={working || (!rom && !game?.romSha1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/70 hover:bg-sky-500 font-bold disabled:opacity-40"
              >
                <Languages size={13} /> {hasPatch ? "Trocar patch" : "Selecionar patch"}
              </button>
              {hasPatch && (
                <button
                  onClick={() => {
                    setPatch(null);
                    setRemovePatch(true);
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-rose-500/30"
                >
                  Remover patch
                </button>
              )}
              <span className="text-white/60 truncate">
                {patch ? `${patch.fileName} (${patch.result.format.toUpperCase()}, compatível)` : hasPatch ? game?.patchFileName : "sem patch"}
              </span>
            </div>
            {patch?.result.adjustedHeader && <p className="text-white/60">Cabeçalho de 512 bytes ajustado para combinar com o patch.</p>}
            {patch?.result.warnings.map((w) => (
              <p key={w} className="text-amber-200">{w}</p>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={translated} onChange={(e) => setTranslated(e.target.checked)} className="accent-pink-500" />
              {hasPatch
                ? "Este patch é uma tradução PT-BR (mostra “Jogo em PT-BR”)"
                : "O arquivo do jogo já está em PT-BR (mostra “Jogo em PT-BR”)"}
            </label>
            <p className="text-white/45">O patch é aplicado numa cópia. O arquivo original do jogo nunca é alterado.</p>
          </div>

          <div className={section}>
            <span className="font-bold text-white/85">Controles do teclado</span>
            <KeyMappingEditor system={system} keys={keys} onChange={setKeys} />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 flex gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <span className="text-white/45 flex items-center gap-1">
            <CheckCircle2 size={12} /> Salvamentos deste jogo ficam separados dos outros.
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 font-semibold">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={working}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 font-bold disabled:opacity-40"
            >
              {working ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
