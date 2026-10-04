import React, { useState } from "react";
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Crosshair,
  Clock,
  Zap,
  MousePointer,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAutoClickStore } from "../store/autoclickStore";
import { MouseButton, ClickType, ClickMode, PositionMode, RepeatMode } from "../types";

export const QuickClickView: React.FC<{ onOpenPicker: () => void }> = ({ onOpenPicker }) => {
  const {
    clickMode,
    setClickMode,
    intervalMs,
    setIntervalMs,
    cps,
    setCps,
    minIntervalMs,
    maxIntervalMs,
    setIntervalRange,
    jitterMs,
    setJitterMs,
    mouseButton,
    setMouseButton,
    clickType,
    setClickType,
    positionMode,
    setPositionMode,
    fixedX,
    fixedY,
    repeatMode,
    setRepeatMode,
    repeatCount,
    setRepeatCount,
    repeatDurationSeconds,
    setRepeatDurationSeconds,
    startDelaySeconds,
    setStartDelaySeconds,
    isRunning,
    isPaused,
    sessionClicks,
    realCps,
    statusMessage,
    countdownSeconds,
    timerDriftMs,
    startAutoClick,
    stopAutoClick,
    pauseAutoClick,
    resumeAutoClick,
    emergencyStop,
    hotkeyStartStop,
    hotkeyEmergencyStop,
  } = useAutoClickStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Time breakdown
  const hours = Math.floor(intervalMs / 3600000);
  const minutes = Math.floor((intervalMs % 3600000) / 60000);
  const seconds = Math.floor((intervalMs % 60000) / 1000);
  const milliseconds = Math.floor(intervalMs % 1000);

  const handleTimeChange = (h: number, m: number, s: number, ms: number) => {
    const total = h * 3600000 + m * 60000 + s * 1000 + ms;
    setIntervalMs(Math.max(1, total));
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in max-w-4xl mx-auto">
      {/* Minimalist Hero Bar */}
      <div
        className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isRunning
            ? "bg-pink-500/5 border-pink-500/40 shadow-sm ring-1 ring-pink-500/20"
            : "bg-theme-surface border-theme-border/50"
        }`}
      >
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isRunning
                ? "bg-pink-500 text-white shadow-sm"
                : "bg-theme-surface-card text-theme-text-muted border border-theme-border/40"
            }`}
          >
            {countdownSeconds !== null ? (
              <span className="font-mono font-bold text-lg">{countdownSeconds}</span>
            ) : isRunning ? (
              <Zap size={22} className="animate-pulse" />
            ) : (
              <MousePointer size={20} />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-theme-text">
                {countdownSeconds !== null
                  ? `Iniciando em ${countdownSeconds}s...`
                  : isRunning
                  ? isPaused
                    ? "Pausado"
                    : "Auto Click Ativo"
                  : "Pronto para Iniciar"}
              </h2>
              {isRunning && (
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-500 font-semibold">
                  {realCps > 0 ? `${realCps} CPS real` : `${cps} CPS`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-theme-text-muted mt-0.5">
              {statusMessage.startsWith("Posição") || statusMessage.startsWith("Captura") ? (
                <span className="text-pink-500 font-semibold">{statusMessage}</span>
              ) : (
                <span>{sessionClicks.toLocaleString()} cliques na sessão</span>
              )}
              {timerDriftMs > 0 && isRunning && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[10px]">drift {timerDriftMs}ms</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {!isRunning ? (
            <button
              onClick={() => startAutoClick()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-theme-primary hover:opacity-90 active:scale-98 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Play size={14} className="fill-white" />
              <span>Iniciar ({hotkeyStartStop || "Insert"})</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {isPaused ? (
                <button
                  onClick={() => resumeAutoClick()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all flex items-center gap-1.5"
                >
                  <Play size={12} className="fill-white" />
                  <span>Continuar</span>
                </button>
              ) : (
                <button
                  onClick={() => pauseAutoClick()}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-all flex items-center gap-1.5"
                >
                  <Pause size={12} className="fill-white" />
                  <span>Pausar</span>
                </button>
              )}

              <button
                onClick={() => stopAutoClick()}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
              >
                <Square size={12} className="fill-white" />
                <span>Parar ({hotkeyStartStop || "Insert"})</span>
              </button>

              <button
                onClick={() => emergencyStop()}
                title={`Parada de Emergência (${hotkeyEmergencyStop || "Shift+ESC"})`}
                className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white transition-all"
              >
                <ShieldAlert size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Clean & Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Velocidade & Intervalo */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-theme-primary" />
              <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
                Velocidade & Intervalo
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-theme-primary">
              {cps} CPS = {intervalMs}ms
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted">Cliques por Segundo (CPS)</span>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={cps}
                onChange={(e) => setCps(parseFloat(e.target.value) || 1)}
                className="w-16 px-2 py-1 rounded-lg bg-theme-surface-card border border-theme-border/60 text-right font-mono text-xs text-theme-text focus:outline-none"
              />
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={cps}
              onChange={(e) => setCps(parseFloat(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer h-1.5 bg-theme-surface-card rounded-lg"
            />
          </div>

          {/* Granular Time Inputs */}
          <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
            <div className="flex flex-col">
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) =>
                  handleTimeChange(parseInt(e.target.value) || 0, minutes, seconds, milliseconds)
                }
                className="p-1 rounded-lg bg-theme-surface-card border border-theme-border/50 text-center font-mono text-xs text-theme-text"
              />
              <span className="text-[10px] text-theme-text-muted mt-0.5">Horas</span>
            </div>
            <div className="flex flex-col">
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  handleTimeChange(hours, parseInt(e.target.value) || 0, seconds, milliseconds)
                }
                className="p-1 rounded-lg bg-theme-surface-card border border-theme-border/50 text-center font-mono text-xs text-theme-text"
              />
              <span className="text-[10px] text-theme-text-muted mt-0.5">Minutos</span>
            </div>
            <div className="flex flex-col">
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) =>
                  handleTimeChange(hours, minutes, parseInt(e.target.value) || 0, milliseconds)
                }
                className="p-1 rounded-lg bg-theme-surface-card border border-theme-border/50 text-center font-mono text-xs text-theme-text"
              />
              <span className="text-[10px] text-theme-text-muted mt-0.5">Segundos</span>
            </div>
            <div className="flex flex-col">
              <input
                type="number"
                min="1"
                value={milliseconds}
                onChange={(e) =>
                  handleTimeChange(hours, minutes, seconds, parseInt(e.target.value) || 0)
                }
                className="p-1 rounded-lg bg-theme-surface-card border border-theme-border/50 text-center font-mono text-xs font-semibold text-theme-primary"
              />
              <span className="text-[10px] text-theme-text-muted mt-0.5">Milissegundos</span>
            </div>
          </div>
        </div>

        {/* Card 2: Botão & Tipo de Clique */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/50 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MousePointer size={15} className="text-theme-primary" />
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              Botão & Tipo de Clique
            </h3>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-theme-text-muted">Botão do Mouse</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(["left", "middle", "right"] as MouseButton[]).map((btn) => (
                <button
                  key={btn}
                  onClick={() => setMouseButton(btn)}
                  className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${
                    mouseButton === btn
                      ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                      : "bg-theme-surface-card text-theme-text border-theme-border/40 hover:border-theme-border"
                  }`}
                >
                  {btn === "left" ? "Esquerdo" : btn === "right" ? "Direito" : "Meio"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] text-theme-text-muted">Tipo de Ação</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(["single", "double", "triple", "hold"] as ClickType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setClickType(t)}
                  className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${
                    clickType === t
                      ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                      : "bg-theme-surface-card text-theme-text border-theme-border/40 hover:border-theme-border"
                  }`}
                >
                  {t === "single" ? "Único" : t === "double" ? "Duplo" : t === "triple" ? "Triplo" : "Segurar"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Posição */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/50 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Crosshair size={15} className="text-theme-primary" />
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              Posição do Cursor
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPositionMode("current_cursor")}
              className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all ${
                positionMode === "current_cursor"
                  ? "bg-theme-primary/10 border-theme-primary text-theme-primary"
                  : "bg-theme-surface-card border-theme-border/40 text-theme-text"
              }`}
            >
              <div className="font-semibold">Cursor Atual</div>
              <div className="text-[10px] text-theme-text-muted mt-0.5">Onde o mouse estiver</div>
            </button>

            <button
              onClick={() => setPositionMode("fixed")}
              className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all ${
                positionMode === "fixed"
                  ? "bg-theme-primary/10 border-theme-primary text-theme-primary"
                  : "bg-theme-surface-card border-theme-border/40 text-theme-text"
              }`}
            >
              <div className="font-semibold">Coordenada Fixa</div>
              <div className="text-[10px] text-theme-text-muted mt-0.5">
                X: {fixedX}, Y: {fixedY}
              </div>
            </button>
          </div>

          {positionMode === "fixed" && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-theme-surface-card border border-theme-border/40 text-xs">
              <span className="font-mono text-theme-text">
                X: {fixedX} &nbsp; Y: {fixedY}
              </span>
              <button
                onClick={onOpenPicker}
                className="px-2.5 py-1 rounded-lg bg-theme-primary text-white text-xs font-medium flex items-center gap-1 shadow-sm"
              >
                <Crosshair size={12} />
                <span>Mirar na Tela</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 4: Repetição & Atraso */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/50 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={15} className="text-theme-primary" />
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              Repetição & Atraso
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setRepeatMode("infinite")}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                repeatMode === "infinite"
                  ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                  : "bg-theme-surface-card text-theme-text border-theme-border/40"
              }`}
            >
              Até Parar
            </button>
            <button
              onClick={() => setRepeatMode("count")}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                repeatMode === "count"
                  ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                  : "bg-theme-surface-card text-theme-text border-theme-border/40"
              }`}
            >
              Contagem
            </button>
            <button
              onClick={() => setRepeatMode("duration")}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                repeatMode === "duration"
                  ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                  : "bg-theme-surface-card text-theme-text border-theme-border/40"
              }`}
            >
              Temporizado
            </button>
          </div>

          {repeatMode === "count" && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-theme-text-muted">Parar após</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value) || 100)}
                  className="w-20 px-2 py-1 rounded-lg bg-theme-surface-card border border-theme-border/50 font-mono text-xs text-right text-theme-text"
                />
                <span className="text-theme-text-muted text-[11px]">cliques</span>
              </div>
            </div>
          )}

          {repeatMode === "duration" && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-theme-text-muted">Duração</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  value={repeatDurationSeconds}
                  onChange={(e) => setRepeatDurationSeconds(parseInt(e.target.value) || 30)}
                  className="w-16 px-2 py-1 rounded-lg bg-theme-surface-card border border-theme-border/50 font-mono text-xs text-right text-theme-text"
                />
                <span className="text-theme-text-muted text-[11px]">segundos</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-theme-text-muted">Atraso Inicial (3..2..1)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="10"
                value={startDelaySeconds}
                onChange={(e) => setStartDelaySeconds(parseInt(e.target.value) || 0)}
                className="w-12 px-2 py-1 rounded-lg bg-theme-surface-card border border-theme-border/50 font-mono text-xs text-right text-theme-text"
              />
              <span className="text-theme-text-muted text-[11px]">s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Variation (Collapsible) */}
      <div className="rounded-2xl bg-theme-surface/60 border border-theme-border/40 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs font-medium text-theme-text-muted hover:text-theme-text transition-colors"
        >
          <span>Modo de Intervalo & Humanização (Jitter / Variação Aleatória)</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-theme-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-2">
              <span className="text-theme-text font-medium">Modo de Variação</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(["fixed", "base_jitter", "random_interval", "random_cps"] as ClickMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setClickMode(m)}
                    className={`py-1.5 rounded-lg border text-xs capitalize ${
                      clickMode === m
                        ? "bg-theme-primary text-white border-theme-primary"
                        : "bg-theme-surface-card border-theme-border/40 text-theme-text"
                    }`}
                  >
                    {m === "fixed"
                      ? "Fixo"
                      : m === "base_jitter"
                      ? "Jitter"
                      : m === "random_interval"
                      ? "Intervalo Randômico"
                      : "CPS Randômico"}
                  </button>
                ))}
              </div>
            </div>

            {clickMode === "base_jitter" && (
              <div className="flex flex-col gap-1.5 justify-center">
                <div className="flex justify-between text-theme-text-muted">
                  <span>Jitter Máximo: ±{jitterMs}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={jitterMs}
                  onChange={(e) => setJitterMs(parseFloat(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>
            )}

            {clickMode === "random_interval" && (
              <div className="flex flex-col gap-1.5 justify-center">
                <span className="text-theme-text-muted">
                  Faixa de Intervalo: {minIntervalMs}ms - {maxIntervalMs}ms
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minIntervalMs}
                    onChange={(e) => setIntervalRange(parseFloat(e.target.value) || 50, maxIntervalMs)}
                    className="w-16 p-1 rounded bg-theme-surface-card border border-theme-border/40 text-center font-mono"
                  />
                  <span>até</span>
                  <input
                    type="number"
                    value={maxIntervalMs}
                    onChange={(e) => setIntervalRange(minIntervalMs, parseFloat(e.target.value) || 150)}
                    className="w-16 p-1 rounded bg-theme-surface-card border border-theme-border/40 text-center font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickClickView;
