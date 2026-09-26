import React, { useEffect, useRef, useState } from "react";
import { X, Gamepad2, FileUp, Languages, CheckCircle2, AlertTriangle, Loader2, ChevronLeft, ChevronRight, FolderLock, ImagePlus, Trash2 } from "lucide-react";
import { getSystem } from "../systems";
import { ConsoleGame, DEFAULT_PREFS } from "../types";
import { useConsoleLibraryStore } from "../consoleLibraryStore";
import {
  COVER_EXTENSIONS,
  commitGame,
  findDuplicateRom,
  inspectCover,
  InspectedCover,
  inspectPatch,
  inspectRom,
  InspectedPatch,
  InspectedRom,
  newGameId,
  PATCH_EXTENSIONS,
} from "../importer";
import { getDataDir } from "../consoleService";
import { looksLikePtBrDump, suggestGameName } from "../smw";

interface AddGameWizardProps {
  onClose: () => void;
  onDone: (game: ConsoleGame, playNow: boolean) => void;
  /** Rendered inside the small console window instead of over the main app. */
  compact?: boolean;
}

type Step = 1 | 2 | 3;

/** Adds any SNES game (.sfc/.smc) to the Mini Console library. Nothing ships with the app. */
export const AddGameWizard: React.FC<AddGameWizardProps> = ({ onClose, onDone, compact = false }) => {
  const { games, upsertGame } = useConsoleLibraryStore();
  const system = getSystem("snes")!;

  const [step, setStep] = useState<Step>(1);
  const [rom, setRom] = useState<InspectedRom | null>(null);
  const [name, setName] = useState("");
  const [patch, setPatch] = useState<InspectedPatch | null>(null);
  const [alreadyPtBr, setAlreadyPtBr] = useState(false);
  const [cover, setCover] = useState<InspectedCover | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [dataDir, setDataDir] = useState<string>("");
  const romInput = useRef<HTMLInputElement>(null);
  const patchInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDataDir().then(setDataDir).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

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

  const handleRom = (file: File | undefined) =>
    file &&
    run(async () => {
      setPatch(null);
      const inspected = await inspectRom(file, system, true);
      const dup = findDuplicateRom(games, inspected.sha1);
      if (dup) {
        setRom(null);
        throw new Error(`Esse arquivo já está na biblioteca como "${dup.name}".`);
      }
      setRom(inspected);
      setName(suggestGameName(file.name, inspected.smw));
      setAlreadyPtBr(looksLikePtBrDump(file.name, inspected.smw?.title));
    });

  const handlePatch = (file: File | undefined) =>
    file &&
    rom &&
    run(async () => {
      setPatch(await inspectPatch(file, rom));
    });

  const handleCover = (file: File | undefined) =>
    file &&
    run(async () => {
      setCover(await inspectCover(file));
      setCoverPreview(URL.createObjectURL(file));
    });

  const finish = (playNow: boolean) =>
    rom &&
    run(async () => {
      if (!name.trim()) throw new Error("Dê um nome para o jogo.");
      const base: ConsoleGame = {
        id: newGameId(rom.sha1, games),
        name: name.trim(),
        system: "snes",
        isBuiltin: false,
        translatedPtBr: false,
        prefs: DEFAULT_PREFS,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const game = await commitGame({
        base,
        name,
        rom,
        patch: patch || null,
        translatedPtBr: patch ? true : alreadyPtBr,
        cover: cover || undefined,
      });
      await upsertGame(game);
      onDone(game, playNow);
    });

  const willBePtBr = !!patch || alreadyPtBr;

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md ${compact ? "p-1" : "p-4"}`}
      data-no-drag
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl max-h-full flex flex-col bg-slate-900 border border-pink-500/30 shadow-2xl text-white text-xs ${
          compact ? "h-full rounded-2xl p-4" : "rounded-3xl p-6 max-h-[92vh]"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">Adicionar jogo de SNES</h2>
              <p className="text-white/55">Passo {step} de 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3 pr-1 custom-scrollbar">
          {step === 1 && (
            <>
              <p className="text-white/80 leading-relaxed">
                Selecione no seu computador um jogo de Super Nintendo (<code>.sfc</code> ou <code>.smc</code>). O app faz uma cópia privada; o
                arquivo original fica onde está. Você pode adicionar quantos jogos quiser.
              </p>
              <input
                ref={romInput}
                type="file"
                accept={system.extensions.join(",")}
                className="hidden"
                onChange={(e) => {
                  handleRom(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => romInput.current?.click()}
                disabled={working}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-pink-400/50 hover:border-pink-400 hover:bg-pink-500/10 transition-colors font-bold"
              >
                {working ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                {rom ? "Escolher outro arquivo" : "Selecionar arquivo do jogo"}
              </button>

              {rom && (
                <div className="p-3 rounded-2xl border flex gap-2 bg-emerald-500/15 border-emerald-500/30 text-emerald-100">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold break-all">{rom.fileName}</p>
                    <p>
                      {rom.smw?.title ? `Título interno: "${rom.smw.title}". ` : ""}
                      {rom.smw?.isSmw ? "Reconhecido como Super Mario World." : "Arquivo de SNES válido."}
                    </p>
                  </div>
                </div>
              )}

              {rom && (
                <label className="block space-y-1">
                  <span className="font-bold text-white/85">Nome do jogo</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    placeholder="Ex.: Donkey Kong Country"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 focus:border-pink-400/70 outline-none"
                  />
                </label>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-white/80 leading-relaxed">
                <strong>Opcional:</strong> se você tem um patch de tradução PT-BR compatível (<code>.ips</code>, <code>.bps</code> ou <code>.ups</code>),
                selecione aqui. O app confere se ele combina com o arquivo e cria uma cópia traduzida, sem mexer no original.
              </p>
              <input
                ref={patchInput}
                type="file"
                accept={PATCH_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  handlePatch(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => patchInput.current?.click()}
                disabled={working}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-sky-400/50 hover:border-sky-400 hover:bg-sky-500/10 transition-colors font-bold"
              >
                {working ? <Loader2 className="animate-spin" size={16} /> : <Languages size={16} />}
                {patch ? "Escolher outro patch" : "Selecionar patch de tradução"}
              </button>

              {patch && (
                <div className="p-3 rounded-2xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-100 flex gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      {patch.fileName} ({patch.result.format.toUpperCase()}) compatível
                    </p>
                    {patch.result.adjustedHeader && <p>O cabeçalho de 512 bytes do arquivo foi ajustado para combinar com o patch.</p>}
                    {patch.result.warnings.map((w) => (
                      <p key={w} className="text-amber-200">
                        {w}
                      </p>
                    ))}
                    <button onClick={() => setPatch(null)} className="underline text-white/70 hover:text-white">
                      Remover patch
                    </button>
                  </div>
                </div>
              )}

              {!patch && (
                <label className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer">
                  <input type="checkbox" checked={alreadyPtBr} onChange={(e) => setAlreadyPtBr(e.target.checked)} className="accent-pink-500" />
                  <span>
                    Meu arquivo <strong>já está traduzido</strong> para PT-BR (não precisa de patch)
                  </span>
                </label>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                    {coverPreview ? <img src={coverPreview} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="text-white/80" size={24} />}
                  </div>
                  <input
                    ref={coverInput}
                    type="file"
                    accept={COVER_EXTENSIONS.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      handleCover(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-1">
                    <button onClick={() => coverInput.current?.click()} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                      {coverPreview ? "Trocar capa" : "Capa (opcional)"}
                    </button>
                    {coverPreview && (
                      <button
                        onClick={() => {
                          setCover(null);
                          setCoverPreview(null);
                        }}
                        className="p-1 rounded-lg hover:bg-rose-500/30"
                        title="Remover capa"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <p className="truncate">
                    🎮 <strong>{name || rom?.fileName}</strong>
                  </p>
                  <p className="text-white/60 truncate">{rom?.fileName}</p>
                  <p>
                    {willBePtBr ? (
                      <span className="text-emerald-300 font-bold">🇧🇷 Jogo em PT-BR</span>
                    ) : (
                      <span className="text-white/70">Sem tradução: apenas os menus do mini console ficam em PT-BR.</span>
                    )}
                  </p>
                </div>
              </div>
              <p className="flex items-start gap-2 text-white/60">
                <FolderLock size={14} className="shrink-0 mt-0.5" />
                <span>
                  Cópias guardadas na pasta privada do app{dataDir ? ":" : "."} {dataDir && <code className="break-all text-pink-200">{dataDir}</code>}
                </span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 flex gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0 gap-2">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 font-semibold"
          >
            <ChevronLeft size={14} /> {step === 1 ? "Cancelar" : "Voltar"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                setError(null);
                setStep((s) => (s + 1) as Step);
              }}
              disabled={working || !rom || (step === 1 && !name.trim())}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 font-bold"
            >
              {step === 2 && !patch && !alreadyPtBr ? "Pular (sem tradução)" : "Continuar"} <ChevronRight size={14} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => finish(false)} disabled={working} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 font-semibold disabled:opacity-40">
                Só adicionar
              </button>
              <button
                onClick={() => finish(true)}
                disabled={working}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 font-bold shadow-lg shadow-pink-500/25 disabled:opacity-40"
              >
                {working ? <Loader2 className="animate-spin" size={14} /> : <Gamepad2 size={14} />} Adicionar e jogar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddGameWizard;
