import React, { useState, useEffect, useRef } from "react";
import { WidgetInstance } from "../types";

interface AmbientAudioWidgetProps {
  widget: WidgetInstance;
}

interface SoundChannel {
  id: string;
  name: string;
  icon: string;
  volume: number; // 0 to 100
}

export const AmbientAudioWidget: React.FC<AmbientAudioWidgetProps> = ({ widget }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [channels, setChannels] = useState<SoundChannel[]>([
    { id: "rain", name: "Chuva Suave", icon: "🌧️", volume: 40 },
    { id: "waves", name: "Ondas do Mar", icon: "🌊", volume: 0 },
    { id: "fire", name: "Lareira / Fogo", icon: "🔥", volume: 0 },
    { id: "wind", name: "Vento Suave", icon: "🍃", volume: 0 },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainsRef = useRef<Record<string, GainNode>>({});
  const sourcesRef = useRef<Record<string, AudioNode>>({});

  const initAudio = () => {
    if (audioCtxRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const bufferSize = ctx.sampleRate * 2;

    // Helper: generate noise buffer
    const makeNoiseBuffer = (type: "pink" | "white" | "brown") => {
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === "white") {
          data[i] = white * 0.1;
        } else if (type === "pink") {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
          b6 = white * 0.115926;
        } else if (type === "brown") {
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 0.3;
        }
      }
      return buffer;
    };

    // 1. Rain setup
    const rainBuffer = makeNoiseBuffer("pink");
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "lowpass";
    rainFilter.frequency.value = 1200;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(ctx.destination);
    rainSource.start();

    // 2. Waves setup
    const wavesBuffer = makeNoiseBuffer("brown");
    const wavesSource = ctx.createBufferSource();
    wavesSource.buffer = wavesBuffer;
    wavesSource.loop = true;
    const wavesFilter = ctx.createBiquadFilter();
    wavesFilter.type = "lowpass";
    wavesFilter.frequency.value = 400;
    const wavesGain = ctx.createGain();
    wavesGain.gain.value = 0;
    wavesSource.connect(wavesFilter);
    wavesFilter.connect(wavesGain);
    wavesGain.connect(ctx.destination);
    wavesSource.start();

    // 3. Fire setup
    const fireBuffer = makeNoiseBuffer("white");
    const fireSource = ctx.createBufferSource();
    fireSource.buffer = fireBuffer;
    fireSource.loop = true;
    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = "bandpass";
    fireFilter.frequency.value = 1800;
    fireFilter.Q.value = 3;
    const fireGain = ctx.createGain();
    fireGain.gain.value = 0;
    fireSource.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(ctx.destination);
    fireSource.start();

    // 4. Wind setup
    const windBuffer = makeNoiseBuffer("pink");
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 350;
    windFilter.Q.value = 4;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSource.start();

    gainsRef.current = {
      rain: rainGain,
      waves: wavesGain,
      fire: fireGain,
      wind: windGain,
    };
  };

  const updateVolumes = (activeState: boolean, currentChannels: SoundChannel[]) => {
    if (!audioCtxRef.current) return;
    currentChannels.forEach((ch) => {
      const g = gainsRef.current[ch.id];
      if (g) {
        const targetVal = activeState ? (ch.volume / 100) * 0.4 : 0;
        g.gain.setTargetAtTime(targetVal, audioCtxRef.current!.currentTime, 0.1);
      }
    });
  };

  const togglePlay = () => {
    initAudio();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    updateVolumes(nextPlay, channels);
  };

  const handleVolumeChange = (id: string, vol: number) => {
    const updated = channels.map((c) => (c.id === id ? { ...c, volume: vol } : c));
    setChannels(updated);
    if (isPlaying) {
      updateVolumes(true, updated);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full select-none p-1 text-white justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
          <span>🎧</span>
          <span>Sons Relaxantes</span>
        </div>

        <button
          onClick={togglePlay}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
            isPlaying
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
              : "bg-white/10 hover:bg-white/20 text-white/80"
          }`}
        >
          <span>{isPlaying ? "Tocando ⏸" : "Ouvir ▶"}</span>
        </button>
      </div>

      {/* Sliders List */}
      <div className="flex flex-col gap-2 flex-1 justify-center py-1">
        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center gap-2 text-xs">
            <span className="text-sm shrink-0 w-5 text-center">{ch.icon}</span>
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-white/70 mb-0.5">
                <span>{ch.name}</span>
                <span className="font-mono text-[9px] text-white/40">{ch.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ch.volume}
                onChange={(e) => handleVolumeChange(ch.id, parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="text-[9px] text-white/30 text-center font-mono">
        Sintetizador procedural Web Audio • 100% Offline
      </div>
    </div>
  );
};
