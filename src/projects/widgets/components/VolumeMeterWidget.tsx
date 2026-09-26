import React, { useState, useEffect } from "react";
import { WidgetInstance } from "../types";
import { Volume2, VolumeX, Music, Sliders } from "lucide-react";

interface VolumeMeterWidgetProps {
  widget: WidgetInstance;
}

export const VolumeMeterWidget: React.FC<VolumeMeterWidgetProps> = ({ widget }) => {
  const [volume, setVolume] = useState<number>(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [barLevels, setBarLevels] = useState<number[]>([40, 60, 80, 50, 70, 30, 90, 65]);

  // Audio test note generator
  const playTestTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      setIsPlayingTest(true);

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        const currentVol = isMuted ? 0 : (volume / 100) * 0.15;
        gain.gain.setValueAtTime(currentVol, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8 + idx * 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + 0.9 + idx * 0.08);
      });

      setTimeout(() => setIsPlayingTest(false), 800);
    } catch {
      setIsPlayingTest(false);
    }
  };

  // Subtle pulsing animated VU meter bars
  useEffect(() => {
    const timer = setInterval(() => {
      setBarLevels((prev) =>
        prev.map((_, i) => {
          if (isMuted) return 5;
          const base = isPlayingTest ? 60 : 25;
          const randomFactor = Math.sin(Date.now() / 200 + i) * 20;
          return Math.max(10, Math.min(100, (base + randomFactor) * (volume / 100)));
        })
      );
    }, 120);

    return () => clearInterval(timer);
  }, [volume, isMuted, isPlayingTest]);

  return (
    <div className="flex flex-col justify-between h-full w-full p-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <Sliders size={13} className="text-emerald-400" />
          <span>Medidor de Áudio</span>
        </div>
        <button
          onClick={playTestTone}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 font-semibold transition-all active:scale-95"
          title="Tocar acorde suave de teste"
        >
          <Music size={10} />
          <span>{isPlayingTest ? "Tocando..." : "Testar Som"}</span>
        </button>
      </div>

      {/* Animated Graphic VU Meter Equalizer */}
      <div className="flex items-end justify-center gap-1 h-12 my-auto px-1 bg-black/20 rounded-xl p-1.5 border border-white/5">
        {barLevels.map((lvl, index) => {
          const isHigh = lvl > 75;
          const isMid = lvl > 45;

          const barColor = isMuted
            ? "bg-slate-600"
            : isHigh
            ? "bg-rose-400"
            : isMid
            ? "bg-amber-400"
            : "bg-emerald-400";

          return (
            <div
              key={index}
              className="flex-1 bg-white/10 rounded-sm overflow-hidden flex flex-col justify-end h-full"
            >
              <div
                className={`w-full rounded-sm transition-all duration-100 ${barColor}`}
                style={{ height: `${lvl}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Volume slider & Mute button */}
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/5">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded-lg border transition-all ${
            isMuted
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
              : "bg-white/10 border-white/10 text-white/80 hover:text-white"
          }`}
          title={isMuted ? "Desmutar" : "Mutar"}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />

        <span className="text-[11px] font-mono font-bold text-white/90 w-8 text-right">
          {isMuted ? "0%" : `${volume}%`}
        </span>
      </div>
    </div>
  );
};
