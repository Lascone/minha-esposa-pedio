import React, { useState, useEffect } from "react";
import { WidgetInstance } from "../types";

interface HydrationWidgetProps {
  widget: WidgetInstance;
}

export const HydrationWidget: React.FC<HydrationWidgetProps> = ({ widget }) => {
  const targetMl = widget.settings?.targetMl || 2000;
  const [currentMl, setCurrentMl] = useState<number>(() => {
    const saved = localStorage.getItem("pmm_hydration_ml");
    return saved ? parseInt(saved, 10) : 750;
  });

  const [reminderMinutes, setReminderMinutes] = useState(45);
  const [secondsLeft, setSecondsLeft] = useState(45 * 60);
  const [timerRunning, setTimerRunning] = useState(true);

  // Persist current ml
  useEffect(() => {
    localStorage.setItem("pmm_hydration_ml", currentMl.toString());
  }, [currentMl]);

  // Countdown timer for next water break
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Play gentle web audio chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          } catch {}
          return reminderMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, reminderMinutes]);

  const addWater = (amount: number) => {
    setCurrentMl((prev) => Math.min(targetMl * 2, prev + amount));
    // Reset timer on drink
    setSecondsLeft(reminderMinutes * 60);
  };

  const handleReset = () => {
    setCurrentMl(0);
    setSecondsLeft(reminderMinutes * 60);
  };

  const pct = Math.min(100, Math.round((currentMl / targetMl) * 100));
  const minLeft = Math.floor(secondsLeft / 60);
  const secLeft = secondsLeft % 60;

  return (
    <div className="flex flex-col h-full w-full select-none p-1 text-white justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
          <span>💧</span>
          <span>Hidratação</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/50">
          <span>Próximo gole:</span>
          <span className="font-mono text-cyan-200 font-bold">
            {String(minLeft).padStart(2, "0")}:{String(secLeft).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Center Cup & Progress */}
      <div className="flex items-center gap-3 px-1 my-auto">
        {/* Animated Cup Graphic */}
        <div className="relative w-14 h-20 rounded-b-2xl rounded-t-sm border-2 border-cyan-300/40 bg-black/30 overflow-hidden flex flex-col justify-end shadow-inner shrink-0">
          {/* Water Fill Layer */}
          <div
            style={{ height: `${pct}%` }}
            className="w-full bg-gradient-to-t from-cyan-600 to-sky-400 opacity-80 transition-all duration-500 relative"
          >
            {/* Wave shine effect */}
            <div className="absolute top-0 inset-x-0 h-1 bg-white/40 animate-pulse" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-white drop-shadow">
            {pct}%
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-xl font-bold font-mono tracking-tight text-cyan-200">
            {currentMl} <span className="text-xs text-white/50 font-normal">/ {targetMl} ml</span>
          </div>

          <p className="text-[10px] text-white/70 mt-0.5 leading-snug">
            {pct >= 100
              ? "Meta diária alcançada! Parabéns! 🎉💖"
              : `Faltam ${Math.max(0, targetMl - currentMl)} ml para sua meta de hoje.`}
          </p>

          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              style={{ width: `${pct}%` }}
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-white/10 text-xs">
        <button
          onClick={() => addWater(200)}
          className="flex-1 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-200 active:scale-95 transition font-semibold"
        >
          +200ml
        </button>
        <button
          onClick={() => addWater(350)}
          className="flex-1 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-200 active:scale-95 transition font-semibold"
        >
          +350ml
        </button>
        <button
          onClick={() => addWater(500)}
          className="flex-1 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-200 active:scale-95 transition font-semibold"
        >
          +500ml
        </button>
        <button
          onClick={handleReset}
          title="Reiniciar contador"
          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
        >
          ↺
        </button>
      </div>
    </div>
  );
};
