import React, { useState, useEffect } from "react";
import { WidgetInstance } from "../types";
import { Play, Pause, RotateCcw } from "lucide-react";

interface PomodoroWidgetProps {
  widget: WidgetInstance;
}

type Mode = "focus" | "shortBreak" | "longBreak";

const MODE_CONFIGS: Record<Mode, { label: string; defaultSec: number; color: string; icon: string }> = {
  focus: { label: "Foco", defaultSec: 25 * 60, color: "text-rose-400", icon: "🎯" },
  shortBreak: { label: "Pausa Curta", defaultSec: 5 * 60, color: "text-emerald-400", icon: "☕" },
  longBreak: { label: "Pausa Longa", defaultSec: 15 * 60, color: "text-sky-400", icon: "✨" },
};

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({ widget }) => {
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODE_CONFIGS.focus.defaultSec);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const totalSec = MODE_CONFIGS[mode].defaultSec;
  const progressPercent = Math.max(0, Math.min(100, ((totalSec - secondsLeft) / totalSec) * 100));

  // Audio tone helper (safe web audio)
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Ignore audio context errors if blocked by browser policy
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            playChime();
            setIsRunning(false);
            if (mode === "focus") {
              setCompletedSessions((c) => c + 1);
              setMode("shortBreak");
              return MODE_CONFIGS.shortBreak.defaultSec;
            } else {
              setMode("focus");
              return MODE_CONFIGS.focus.defaultSec;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode]);

  const switchMode = (newMode: Mode) => {
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(MODE_CONFIGS[newMode].defaultSec);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(MODE_CONFIGS[mode].defaultSec);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center justify-between h-full w-full p-2 select-none">
      {/* Mode selection tabs */}
      <div className="flex items-center gap-1 bg-white/10 dark:bg-black/20 p-1 rounded-full border border-white/10 backdrop-blur-sm text-[10px] font-bold">
        <button
          onClick={() => switchMode("focus")}
          className={`px-2.5 py-1 rounded-full transition-all ${
            mode === "focus"
              ? "bg-rose-500 text-white shadow-sm"
              : "text-white/70 hover:text-white"
          }`}
        >
          🎯 Foco
        </button>
        <button
          onClick={() => switchMode("shortBreak")}
          className={`px-2.5 py-1 rounded-full transition-all ${
            mode === "shortBreak"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-white/70 hover:text-white"
          }`}
        >
          ☕ Pausa
        </button>
        <button
          onClick={() => switchMode("longBreak")}
          className={`px-2.5 py-1 rounded-full transition-all ${
            mode === "longBreak"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-white/70 hover:text-white"
          }`}
        >
          ✨ Longa
        </button>
      </div>

      {/* Timer Circular Display */}
      <div className="relative my-2 flex items-center justify-center">
        {/* Circular SVG Ring */}
        <svg className="w-28 h-28 transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r="46"
            stroke="currentColor"
            strokeWidth="6"
            className="text-white/10"
            fill="transparent"
          />
          <circle
            cx="56"
            cy="56"
            r="46"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={289}
            strokeDashoffset={289 - (289 * progressPercent) / 100}
            strokeLinecap="round"
            className={`transition-all duration-500 ${
              mode === "focus"
                ? "text-rose-400"
                : mode === "shortBreak"
                ? "text-emerald-400"
                : "text-sky-400"
            }`}
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-black tracking-tight text-white drop-shadow-sm font-mono">
            {formattedTime}
          </span>
          <span className="text-[10px] text-white/70 uppercase tracking-widest font-semibold mt-0.5">
            {MODE_CONFIGS[mode].label}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md active:scale-95 transition-all ${
            isRunning
              ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
              : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
          }`}
          title={isRunning ? "Pausar" : "Iniciar"}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          onClick={resetTimer}
          className="w-8 h-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all border border-white/10"
          title="Reiniciar"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Sessions badge */}
      <div className="mt-1 text-[10px] text-white/60 flex items-center gap-1 font-medium">
        <span>Sessões concluídas:</span>
        <span className="font-bold text-rose-300">{completedSessions}</span>
        <span>🍅</span>
      </div>
    </div>
  );
};
