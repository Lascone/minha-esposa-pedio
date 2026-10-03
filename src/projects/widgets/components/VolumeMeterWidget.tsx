import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WidgetInstance } from "../types";
import { Volume1, Volume2, VolumeX, Music, Sliders, Play, SkipBack, SkipForward } from "lucide-react";

interface VolumeMeterWidgetProps {
  widget: WidgetInstance;
}

const BAR_COUNT = 8;
const IDLE_BARS = Array(BAR_COUNT).fill(4);

export const VolumeMeterWidget: React.FC<VolumeMeterWidgetProps> = ({ widget }) => {
  const [testVolume, setTestVolume] = useState<number>(60);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [barLevels, setBarLevels] = useState<number[]>(IDLE_BARS);
  const [feedback, setFeedback] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const sendMediaKey = async (action: string, label: string) => {
    try {
      await invoke("media_send_command", { action });
      setFeedback(label);
    } catch {
      setFeedback("Não consegui falar com o Windows");
    }
    window.setTimeout(() => setFeedback(null), 1400);
  };

  // Plays a short chord and drives the bars from the real output of an AnalyserNode.
  const playTestTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || isPlayingTest) return;
      const ctx: AudioContext = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.connect(ctx.destination);
      setIsPlayingTest(true);

      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + idx * 0.08;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(Math.max(0.0002, (testVolume / 100) * 0.15), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        osc.connect(gain);
        gain.connect(analyser);
        osc.start(t);
        osc.stop(t + 0.9);
      });

      const data = new Uint8Array(analyser.frequencyBinCount);
      const started = performance.now();
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / BAR_COUNT) || 1;
        setBarLevels(Array.from({ length: BAR_COUNT }, (_, i) => Math.max(4, (data[i * step] / 255) * 100)));
        if (performance.now() - started < 1100) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setBarLevels(IDLE_BARS);
          setIsPlayingTest(false);
          ctx.close().catch(() => {});
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setIsPlayingTest(false);
      setBarLevels(IDLE_BARS);
    }
  };

  const keyBtn =
    "flex-1 flex items-center justify-center p-1.5 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all active:scale-95";

  return (
    <div className="flex flex-col justify-between h-full w-full p-2 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <Sliders size={13} className="text-emerald-400" />
          <span>{feedback ?? "Controle de Som"}</span>
        </div>
        <button
          onClick={playTestTone}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 font-semibold transition-all active:scale-95"
          title="Tocar um acorde suave para testar as caixinhas de som"
        >
          <Music size={10} />
          <span>{isPlayingTest ? "Tocando..." : "Testar Som"}</span>
        </button>
      </div>

      <div
        className="flex items-end justify-center gap-1 h-10 my-auto px-1 bg-black/20 rounded-xl p-1.5 border border-white/5"
        title="Nível real do som de teste"
      >
        {barLevels.map((lvl, index) => (
          <div key={index} className="flex-1 bg-white/10 rounded-sm overflow-hidden flex flex-col justify-end h-full">
            <div
              className={`w-full rounded-sm transition-[height] duration-75 ${lvl > 75 ? "bg-rose-400" : lvl > 45 ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ height: `${lvl}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 mt-1">
        <button className={keyBtn} title="Diminuir volume do Windows" onClick={() => sendMediaKey("volume_down", "Volume −")}>
          <Volume1 size={14} />
        </button>
        <button className={keyBtn} title="Mutar / desmutar o Windows" onClick={() => sendMediaKey("mute", "Mudo alternado")}>
          <VolumeX size={14} />
        </button>
        <button className={keyBtn} title="Aumentar volume do Windows" onClick={() => sendMediaKey("volume_up", "Volume +")}>
          <Volume2 size={14} />
        </button>
        <span className="w-px h-5 bg-white/10 mx-0.5" />
        <button className={keyBtn} title="Faixa anterior" onClick={() => sendMediaKey("previous", "Faixa anterior")}>
          <SkipBack size={13} />
        </button>
        <button className={keyBtn} title="Tocar / pausar" onClick={() => sendMediaKey("play_pause", "Tocar / pausar")}>
          <Play size={13} />
        </button>
        <button className={keyBtn} title="Próxima faixa" onClick={() => sendMediaKey("next", "Próxima faixa")}>
          <SkipForward size={13} />
        </button>
      </div>

      <label className="flex items-center gap-2 mt-1 pt-1 border-t border-white/5 text-[10px] text-white/50">
        <span className="whitespace-nowrap">Volume do teste</span>
        <input
          type="range"
          min="0"
          max="100"
          value={testVolume}
          onChange={(e) => setTestVolume(Number(e.target.value))}
          className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
        <span className="font-mono font-bold text-white/80 w-8 text-right">{testVolume}%</span>
      </label>
    </div>
  );
};
