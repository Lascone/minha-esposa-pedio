import React, { useEffect, useState } from "react";
import { WidgetInstance } from "../types";

interface DigitalClockWidgetProps {
  widget: WidgetInstance;
}

export const DigitalClockWidget: React.FC<DigitalClockWidgetProps> = ({ widget }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const is24h = widget.settings?.format !== "12h";
  let hours = time.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  if (!is24h) {
    hours = hours % 12 || 12;
  }
  const hoursStr = String(hours).padStart(2, "0");
  const minutesStr = String(time.getMinutes()).padStart(2, "0");
  const secondsStr = String(time.getSeconds()).padStart(2, "0");

  const weekdayStr = time.toLocaleDateString("pt-BR", { weekday: "long" });
  const fullDateStr = time.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none py-1">
      {/* Time Display */}
      <div className="flex items-baseline gap-1 font-mono tracking-tight text-slate-800 dark:text-white">
        <span className="text-4xl font-extrabold tracking-tighter drop-shadow-sm">
          {hoursStr}:{minutesStr}
        </span>
        <span className="text-lg font-bold text-pink-500 dark:text-pink-400">
          :{secondsStr}
        </span>
        {!is24h && (
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            {ampm}
          </span>
        )}
      </div>

      {/* Weekday badge */}
      <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white/50 dark:bg-slate-800/60 border border-black/5 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">
        {weekdayStr}
      </div>

      {/* Full Date */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
        {fullDateStr}
      </div>
    </div>
  );
};
