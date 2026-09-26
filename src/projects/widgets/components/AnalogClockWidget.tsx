import React, { useEffect, useState } from "react";
import { WidgetInstance } from "../types";

interface AnalogClockWidgetProps {
  widget: WidgetInstance;
}

export const AnalogClockWidget: React.FC<AnalogClockWidgetProps> = ({ widget }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDegrees = (hours % 12) * 30 + minutes * 0.5;
  const minuteDegrees = minutes * 6 + seconds * 0.1;
  const secondDegrees = seconds * 6;

  const showDate = widget.settings?.showDate !== false;
  const dayOfMonth = time.getDate();
  const weekDay = time.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase().replace(".", "");

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
      {/* Clock Outer Bezel */}
      <div className="relative w-44 h-44 rounded-full border-4 border-white/50 dark:border-white/20 shadow-inner flex items-center justify-center bg-gradient-to-b from-white/40 via-white/10 to-transparent dark:from-slate-800/60 dark:to-slate-900/60">
        {/* Hour Markers (12, 3, 6, 9 and ticks) */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
          <div
            key={deg}
            className="absolute w-full h-full flex justify-center items-start pt-1.5"
            style={{ transform: `rotate(${deg}deg)` }}
          >
            <div
              className={`rounded-full ${
                i % 3 === 0
                  ? "w-1 h-3 bg-slate-800 dark:bg-white/90"
                  : "w-0.5 h-1.5 bg-slate-500/70 dark:bg-white/40"
              }`}
            />
          </div>
        ))}

        {/* Small Date Window (like classic Windows 7 Gadget) */}
        {showDate && (
          <div className="absolute right-7 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/70 border border-black/10 dark:border-white/10 text-[10px] font-bold text-slate-800 dark:text-slate-100 shadow-sm flex items-center gap-1">
            <span className="text-[8px] text-pink-600 dark:text-pink-400 font-extrabold">{weekDay}</span>
            <span>{dayOfMonth}</span>
          </div>
        )}

        {/* Brand/Subtitle */}
        <div className="absolute top-10 flex flex-col items-center">
          <span className="text-[8px] font-extrabold tracking-widest uppercase text-slate-600 dark:text-slate-300">
            AERO CLOCK
          </span>
        </div>

        {/* Hour Hand */}
        <div
          className="absolute w-full h-full flex justify-center items-center pointer-events-none transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${hourDegrees}deg)` }}
        >
          <div className="w-1.5 h-12 bg-slate-800 dark:bg-white rounded-full shadow -translate-y-6" />
        </div>

        {/* Minute Hand */}
        <div
          className="absolute w-full h-full flex justify-center items-center pointer-events-none transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${minuteDegrees}deg)` }}
        >
          <div className="w-1 h-16 bg-slate-700 dark:bg-slate-200 rounded-full shadow -translate-y-8" />
        </div>

        {/* Second Hand (Classic vibrant Red/Pink) */}
        <div
          className="absolute w-full h-full flex justify-center items-center pointer-events-none transition-transform duration-100 ease-linear"
          style={{ transform: `rotate(${secondDegrees}deg)` }}
        >
          <div className="w-0.5 h-18 bg-rose-500 dark:bg-pink-400 rounded-full shadow -translate-y-9" />
          <div className="w-0.5 h-4 bg-rose-500/70 dark:bg-pink-400/70 rounded-full translate-y-2" />
        </div>

        {/* Center Pivot Pin */}
        <div className="w-3 h-3 rounded-full bg-rose-600 dark:bg-pink-400 border-2 border-white dark:border-slate-800 z-20 shadow" />
      </div>
    </div>
  );
};
