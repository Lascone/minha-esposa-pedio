import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Save,
  FolderOpen,
  Gamepad2,
  Maximize2,
  Minimize2,
  X,
  Info,
  Loader2,
  WifiOff,
  RefreshCw,
  Languages,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";
import { WidgetInstance } from "../../types";
import { useWidgetsStore } from "../../store/widgetsStore";
import { useConsoleLibraryStore, initConsoleLibrarySync } from "../consoleLibraryStore";
import * as service from "../consoleService";
import { crc32 } from "../patcher";
import { EMULATORJS_CDN_DATA, EMULATORJS_VERSION, getSystem } from "../systems";
import { isGameConfigured, playableSha1 } from "../types";
import { saveConsoleBounds } from "../launcher";
import { KeyMappingEditor } from "./KeyMappingEditor";
import { GamepadSettings } from "./GamepadSettings";
import { playerPadConfig, useGamepadStore } from "../gamepadStore";

type Phase = "waiting" | "reading" | "loading" | "playing" | "error";
type Panel = null | "volume" | "save" | "load" | "controls" | "about";

interface SlotInfo {
  slot: number;
  exists: boolean;
  modified: number;
  thumb: string | null;
}

const SLOTS = [1, 2, 3, 4];
const SRAM_NAME = "sram.srm";
const SRAM_INTERVAL_MS = 10_000;

function errorText(kind: string): { title: string; detail: string } {
  switch (kind) {
    case "offline":
      return {
        title: "Sem internet",
        detail: "O emulador é carregado da internet (EmulatorJS CDN). Verifique a conexão e tente novamente.",
      };
    case "timeout":
      return {
        title: "O emulador demorou demais para iniciar",
        detail: "A conexão pode estar lenta ou o arquivo do jogo pode não ser compatível. Tente novamente.",
      };
    case "missing-files":
      return {
        title: "Arquivos do jogo não encontrados",
        detail: "Abra a galeria de widgets e configure o jogo novamente.",
      };
    default:
      return { title: "Não foi possível abrir o jogo", detail: kind };
  }
}

interface ConsoleGameWidgetProps {
  widget: WidgetInstance;
  gameId: string;
  /** Leaves the game (after saving the cartridge memory) and goes back to the library. */
  onSwitchGame: () => void;
}

export const ConsoleGameWidget: React.FC<ConsoleGameWidgetProps> = ({ widget, gameId, onSwitchGame }) => {
  const { games, loaded, updatePrefs, updateGame } = useConsoleLibraryStore();
  const { removeWidget, recordWidgetBounds } = useWidgetsStore();
  const game = games.find((g) => g.id === gameId);
  const system = getSystem(game?.system);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pending = useRef(new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>());
  const nextId = useRef(1);
  const initSentFor = useRef<number>(-1);
  const lastSramCrc = useRef<number | null>(null);
  const prefsLoaded = useRef(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  const [frameKey, setFrameKey] = useState(0);
  /** frameKey of the player that already announced it is listening. */
  const [playerReady, setPlayerReady] = useState(-1);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [errorKind, setErrorKind] = useState<string>("");
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [muted, setMuted] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => initConsoleLibrarySync(), []);

  useEffect(() => {
    if (game && !prefsLoaded.current && loaded) {
      prefsLoaded.current = true;
      setVolume(game.prefs.volume);
      setMuted(game.prefs.muted);
    }
  }, [game, loaded]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const send = useCallback(<T,>(cmd: string, arg?: unknown, transfer: Transferable[] = []): Promise<T> => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return Promise.reject(new Error("Emulador indisponível"));
    const id = nextId.current++;
    return new Promise<T>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      win.postMessage({ type: "ejs:cmd", id, cmd, arg }, window.location.origin, transfer);
      window.setTimeout(() => {
        if (pending.current.delete(id)) reject(new Error("O emulador não respondeu"));
      }, 10_000);
    });
  }, []);

  const focusGame = useCallback(() => {
    iframeRef.current?.focus();
    send("focus").catch(() => {});
  }, [send]);

  const sendInit = useCallback(async () => {
    const g = gameRef.current;
    const sys = getSystem(g?.system);
    const sha = g ? playableSha1(g) : undefined;
    if (!g || !sys || !sha || initSentFor.current === frameKey) return;
    initSentFor.current = frameKey;
    setPhase("reading");
    try {
      const rom = await service.readFile(sha);
      const sram = await service.readSave(g.id, SRAM_NAME).catch(() => null);
      lastSramCrc.current = sram ? crc32(sram) : null;
      const romBuf = rom.slice().buffer;
      const sramBuf = sram ? sram.slice().buffer : null;
      const transfer: Transferable[] = [romBuf];
      if (sramBuf) transfer.push(sramBuf);
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "ejs:init",
          payload: {
            core: sys.core,
            gameName: `${g.id}${g.romExt || sys.extensions[0]}`,
            rom: romBuf,
            sram: sramBuf,
            keys: g.keys || sys.defaultKeys,
            gamepad: playerPadConfig(useGamepadStore.getState()),
            volume: g.prefs.volume,
            muted: g.prefs.muted,
            dataPath: EMULATORJS_CDN_DATA,
          },
        },
        window.location.origin,
        transfer
      );
      setPhase("loading");
    } catch (e) {
      setErrorKind(String(e).includes("NOT_FOUND") ? "missing-files" : String(e));
      setPhase("error");
    }
  }, [frameKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      switch (data.type) {
        case "ejs:hello":
          setPlayerReady(frameKey);
          break;
        case "ejs:status":
          if (data.status === "started") {
            setPhase("playing");
            setPaused(false);
          } else if (data.status === "error") {
            setErrorKind(data.message || "unknown");
            setPhase("error");
          }
          break;
        case "ejs:controls-changed": {
          const g = gameRef.current;
          if (g) updateGame(g.id, { keys: data.keys }).catch(() => {});
          break;
        }
        case "ejs:reply": {
          const p = pending.current.get(data.id);
          if (!p) return;
          pending.current.delete(data.id);
          if (data.ok) p.resolve(data.data);
          else p.reject(new Error(data.error));
          break;
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameKey, updateGame]);

  // Controller settings apply immediately, even mid-game.
  useEffect(
    () =>
      useGamepadStore.subscribe((s) => {
        send("setGamepad", playerPadConfig(s)).catch(() => {});
      }),
    [send]
  );

  // Send the game once both the player is listening and the library is loaded.
  useEffect(() => {
    if (playerReady === frameKey && loaded && isGameConfigured(game) && phase === "waiting") {
      sendInit();
    }
  }, [playerReady, frameKey, loaded, game, phase, sendInit]);

  const flushSram = useCallback(async () => {
    if (phase !== "playing") return;
    try {
      const buf = await send<ArrayBuffer | null>("getSram");
      if (!buf) return;
      const bytes = new Uint8Array(buf);
      const c = crc32(bytes);
      if (c === lastSramCrc.current) return;
      await service.writeSave(gameId, SRAM_NAME, bytes);
      lastSramCrc.current = c;
    } catch {
      // Keep playing; the next attempt will retry.
    }
  }, [phase, send, gameId]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = window.setInterval(flushSram, SRAM_INTERVAL_MS);
    const onHide = () => flushSram();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("pagehide", onHide);
    };
  }, [phase, flushSram]);

  // Persist window position/size (logical pixels) whenever the native window moves or resizes.
  useEffect(() => {
    if (!service.isTauriRuntime()) return;
    const win = getCurrentWindow();
    let timer: number | undefined;
    const save = async () => {
      try {
        if (await win.isFullscreen()) return;
        const [pos, size, sf] = await Promise.all([win.outerPosition(), win.innerSize(), win.scaleFactor()]);
        const bounds = { x: pos.x / sf, y: pos.y / sf, width: size.width / sf, height: size.height / sf };
        saveConsoleBounds(bounds);
        recordWidgetBounds(widget.id, bounds);
      } catch {
        // Window may be closing.
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 500);
    };
    const unMoved = win.onMoved(schedule);
    const unResized = win.onResized(schedule);
    return () => {
      window.clearTimeout(timer);
      unMoved.then((f) => f()).catch(() => {});
      unResized.then((f) => f()).catch(() => {});
    };
  }, [widget.id, recordWidgetBounds]);

  const refreshSlots = useCallback(async () => {
    try {
      const entries = await service.listSaves(gameId);
      const infos = await Promise.all(
        SLOTS.map(async (slot) => {
          const state = entries.find((e) => e.name === `state-${slot}.state`);
          let thumb: string | null = null;
          if (state && entries.some((e) => e.name === `state-${slot}.png`)) {
            const png = await service.readSave(gameId, `state-${slot}.png`).catch(() => null);
            if (png) thumb = URL.createObjectURL(new Blob([png as unknown as BlobPart], { type: "image/png" }));
          }
          return { slot, exists: !!state, modified: state?.modified_ms ?? 0, thumb };
        })
      );
      setSlots((old) => {
        old.forEach((s) => s.thumb && URL.revokeObjectURL(s.thumb));
        return infos;
      });
    } catch {
      setSlots([]);
    }
  }, [gameId]);

  useEffect(() => {
    if (panel === "save" || panel === "load") refreshSlots();
  }, [panel, refreshSlots]);

  const persistPrefs = useCallback(
    (prefs: { volume?: number; muted?: boolean }) => {
      updatePrefs(gameId, prefs).catch(() => {});
    },
    [gameId, updatePrefs]
  );

  const handleTogglePause = async () => {
    try {
      const nowPaused = await send<boolean>(paused ? "play" : "pause");
      setPaused(nowPaused);
      if (nowPaused) flushSram();
    } catch (e) {
      showToast(String((e as Error).message));
    }
  };

  const handleRestart = async () => {
    if (!confirm("Reiniciar o jogo? O progresso que não foi salvo será perdido.")) return;
    try {
      await send("restart");
      setPaused(false);
      showToast("Jogo reiniciado");
    } catch (e) {
      showToast(String((e as Error).message));
    }
  };

  const applyVolume = (v: number, m: boolean) => {
    setVolume(v);
    setMuted(m);
    send("volume", m ? 0 : v).catch(() => {});
  };

  const handleSaveState = async (slot: number) => {
    setBusy(true);
    try {
      const res = await send<{ state: ArrayBuffer; screenshot: ArrayBuffer | null }>("getState");
      await service.writeSave(gameId, `state-${slot}.state`, new Uint8Array(res.state));
      if (res.screenshot) await service.writeSave(gameId, `state-${slot}.png`, new Uint8Array(res.screenshot));
      await flushSram();
      showToast(`Estado salvo no espaço ${slot}`);
      setPanel(null);
      focusGame();
    } catch (e) {
      showToast(`Não foi possível salvar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadState = async (slot: number) => {
    setBusy(true);
    try {
      const bytes = await service.readSave(gameId, `state-${slot}.state`);
      if (!bytes) {
        showToast(`O espaço ${slot} está vazio`);
        return;
      }
      const buf = bytes.slice().buffer;
      await send("loadState", buf, [buf]);
      setPaused(false);
      showToast(`Estado ${slot} carregado`);
      setPanel(null);
    } catch (e) {
      showToast(`Não foi possível carregar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleKeysChange = (keys: Record<number, number>) => {
    if (!game) return;
    updateGame(game.id, { keys }).catch(() => {});
    send("setControls", { keys }).catch(() => {});
  };

  const handleToggleFullscreen = async () => {
    try {
      const win = getCurrentWindow();
      const next = !(await win.isFullscreen());
      await win.setFullscreen(next);
      setFullscreen(next);
      focusGame();
    } catch {
      showToast("Tela cheia indisponível");
    }
  };

  const handleClose = async () => {
    await Promise.race([flushSram(), new Promise((r) => window.setTimeout(r, 2000))]);
    try {
      if (fullscreen) await getCurrentWindow().setFullscreen(false);
    } catch {
      // ignore
    }
    removeWidget(widget.id);
  };

  const handleSwitchGame = async () => {
    await Promise.race([flushSram(), new Promise((r) => window.setTimeout(r, 2000))]);
    try {
      if (fullscreen) await getCurrentWindow().setFullscreen(false);
    } catch {
      // ignore
    }
    onSwitchGame();
  };

  const retry = () => {
    setErrorKind("");
    setPhase("waiting");
    initSentFor.current = -1;
    setFrameKey((k) => k + 1);
  };

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const playing = phase === "playing";
  const effectiveMuted = muted || volume === 0;

  const iframe = useMemo(
    () => (
      <iframe
        key={frameKey}
        ref={iframeRef}
        src="/console/player.html"
        title={game?.name || "Mini Console"}
        allow="autoplay; fullscreen; gamepad"
        className="w-full h-full border-0 bg-black"
      />
    ),
    [frameKey, game?.name]
  );

  if (loaded && !isGameConfigured(game)) return null;

  const iconBtn =
    "p-1.5 rounded-lg text-white/85 hover:text-white hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent transition-colors";

  return (
    <div className="w-screen h-screen p-1 select-none">
      <div className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-slate-950 border border-pink-500/35 shadow-2xl text-white">
        {/* Title bar (drag handle) */}
        <div data-tauri-drag-region className="flex items-center gap-2 px-3 h-8 shrink-0 bg-gradient-to-r from-pink-600/40 via-purple-600/30 to-slate-900 cursor-grab">
          <Gamepad2 size={14} className="text-pink-300 pointer-events-none" />
          <span data-tauri-drag-region className="text-xs font-bold truncate flex-1">
            {game?.name || "Mini Console"}
          </span>
          {game?.translatedPtBr && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 text-[9px] font-bold pointer-events-none">
              <Languages size={10} /> Jogo em PT-BR
            </span>
          )}
          <button onClick={handleSwitchGame} className={`${iconBtn} flex items-center gap-1 text-[10px] font-bold`} title="Salvar e voltar para a biblioteca de jogos">
            <LayoutGrid size={13} /> Trocar jogo
          </button>
          <button onClick={() => togglePanel("about")} className={iconBtn} title="Sobre o mini console">
            <Info size={13} />
          </button>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-rose-500/80 text-white/80" title="Fechar (salva o progresso do jogo)">
            <X size={14} />
          </button>
        </div>

        {/* Game area (EmulatorJS letterboxes to the console aspect ratio inside the canvas) */}
        <div className="relative flex-1 min-h-0 bg-black" onMouseDown={() => setPanel(null)}>
          {iframe}

          {phase !== "playing" && phase !== "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white/80 text-xs">
              <Loader2 className="animate-spin text-pink-400" size={28} />
              <span>{phase === "loading" ? "Carregando o emulador…" : "Preparando o jogo…"}</span>
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-6 text-center">
              {errorKind === "offline" ? <WifiOff className="text-amber-300" size={28} /> : <AlertTriangle className="text-amber-300" size={28} />}
              <p className="text-sm font-bold">{errorText(errorKind).title}</p>
              <p className="text-xs text-white/65 max-w-xs">{errorText(errorKind).detail}</p>
              {errorKind !== "missing-files" && (
                <button onClick={retry} className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-xs font-bold">
                  <RefreshCw size={13} /> Tentar novamente
                </button>
              )}
            </div>
          )}

          {toast && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/80 border border-pink-400/40 text-[11px] text-white shadow-lg pointer-events-none">
              {toast}
            </div>
          )}
        </div>

        {/* Floating panels */}
        {panel && (
          <div data-no-drag className="absolute left-2 right-2 bottom-12 z-20 max-h-[70%] overflow-y-auto rounded-2xl bg-slate-900/95 border border-white/15 p-3 shadow-2xl backdrop-blur-md text-xs custom-scrollbar">
            {panel === "volume" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Volume</span>
                  <span className="font-mono text-pink-200">{effectiveMuted ? "mudo" : `${Math.round(volume * 100)}%`}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => applyVolume(Number(e.target.value), false)}
                  onMouseUp={() => persistPrefs({ volume, muted: false })}
                  className="w-full accent-pink-500"
                />
                <button
                  onClick={() => {
                    applyVolume(volume, !muted);
                    persistPrefs({ muted: !muted });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  {muted ? "Ativar som" : "Silenciar"}
                </button>
              </div>
            )}

            {(panel === "save" || panel === "load") && (
              <div className="space-y-2">
                <span className="font-bold">{panel === "save" ? "Salvar estado" : "Carregar estado"}</span>
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.map((slot) => {
                    const info = slots.find((s) => s.slot === slot);
                    const disabled = busy || (panel === "load" && !info?.exists);
                    return (
                      <button
                        key={slot}
                        disabled={disabled}
                        onClick={() => (panel === "save" ? handleSaveState(slot) : handleLoadState(slot))}
                        className="flex flex-col items-stretch gap-1 p-1.5 rounded-xl bg-black/40 border border-white/10 hover:border-pink-400/70 disabled:opacity-40 text-left"
                      >
                        <div className="aspect-[4/3] rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center">
                          {info?.thumb ? (
                            <img src={info.thumb} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
                          ) : (
                            <span className="text-white/35 text-[10px]">vazio</span>
                          )}
                        </div>
                        <span className="font-bold text-[11px]">Espaço {slot}</span>
                        <span className="text-[10px] text-white/50">
                          {info?.exists ? new Date(info.modified).toLocaleString("pt-BR") : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {panel === "save" && <p className="text-[10px] text-white/50">Salvar num espaço ocupado substitui o estado anterior.</p>}
              </div>
            )}

            {panel === "controls" && system && (
              <div className="space-y-3">
                <GamepadSettings system={system} />
                <div className="h-px bg-white/10" />
                <span className="font-bold">Teclado</span>
                <KeyMappingEditor system={system} keys={game?.keys || system.defaultKeys} onChange={handleKeysChange} compact />
              </div>
            )}

            {panel === "about" && (
              <div className="space-y-1.5 text-white/75 leading-relaxed">
                <p className="font-bold text-white">Mini Console</p>
                <p>
                  Emulador: EmulatorJS {EMULATORJS_VERSION} (GPL-3.0), carregado da internet a cada abertura. Núcleo: {system?.core}.
                </p>
                <p>{system?.coreLicense}</p>
                <p>
                  {game?.translatedPtBr
                    ? `Jogo em PT-BR (patch ${game.patchFormat?.toUpperCase()} aplicado a uma cópia; o arquivo original foi preservado).`
                    : "Sem patch de tradução: apenas os menus do mini console estão em PT-BR."}
                </p>
                <p className="text-white/50">O progresso do jogo é salvo automaticamente a cada 10 segundos e ao fechar.</p>
              </div>
            )}
          </div>
        )}

        {/* Control bar */}
        <div className="flex items-center gap-0.5 px-2 h-10 shrink-0 bg-slate-900 border-t border-white/10">
          <button onClick={handleTogglePause} disabled={!playing} className={iconBtn} title={paused ? "Continuar" : "Pausar"}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button onClick={handleRestart} disabled={!playing} className={iconBtn} title="Reiniciar">
            <RotateCcw size={15} />
          </button>
          <button onClick={() => togglePanel("volume")} className={iconBtn} title="Volume">
            {effectiveMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => togglePanel("save")} disabled={!playing} className={iconBtn} title="Salvar estado">
            <Save size={15} />
          </button>
          <button onClick={() => togglePanel("load")} disabled={!playing} className={iconBtn} title="Carregar estado">
            <FolderOpen size={15} />
          </button>
          <button onClick={() => togglePanel("controls")} disabled={!system} className={iconBtn} title="Configurar teclado ou controle">
            <Gamepad2 size={15} />
          </button>
          <div className="flex-1" data-tauri-drag-region />
          {paused && playing && <span className="text-[10px] font-bold text-amber-300 mr-1">PAUSADO</span>}
          <button onClick={handleToggleFullscreen} className={iconBtn} title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          {!fullscreen && (
            <div
              data-no-drag
              title="Arraste para redimensionar"
              onMouseDown={(e) => {
                e.preventDefault();
                getCurrentWindow().startResizeDragging("SouthEast").catch(() => {});
              }}
              className="ml-1 w-4 h-4 self-end mb-1 cursor-se-resize opacity-50 hover:opacity-100"
              style={{
                background:
                  "linear-gradient(135deg, transparent 50%, rgba(244,114,182,0.9) 50%, rgba(244,114,182,0.9) 60%, transparent 60%, transparent 70%, rgba(244,114,182,0.9) 70%, rgba(244,114,182,0.9) 80%, transparent 80%)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsoleGameWidget;
