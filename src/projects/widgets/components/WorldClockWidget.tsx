import React, { useState, useEffect } from "react";
import { WidgetInstance } from "../types";
import { Globe, Sun, Moon } from "lucide-react";

interface WorldClockWidgetProps {
  widget: WidgetInstance;
}

interface CityClock {
  name: string;
  timeZone: string;
  flag: string;
}

const AVAILABLE_CITIES: CityClock[] = [
  { name: "Brasília", timeZone: "America/Sao_Paulo", flag: "🇧🇷" },
  { name: "Tóquio", timeZone: "Asia/Tokyo", flag: "🇯🇵" },
  { name: "Nova York", timeZone: "America/New_York", flag: "🇺🇸" },
  { name: "Londres", timeZone: "Europe/London", flag: "🇬🇧" },
  { name: "Paris", timeZone: "Europe/Paris", flag: "🇫🇷" },
  { name: "Seul", timeZone: "Asia/Seoul", flag: "🇰🇷" },
];

export const WorldClockWidget: React.FC<WorldClockWidgetProps> = ({ widget }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCityTime = (timeZone: string) => {
    try {
      const formatter = new Intl.DateTimeFormat("pt-BR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(time);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
      const isDay = hour >= 6 && hour < 18;

      return {
        formatted: formatter.format(time),
        isDay,
        hour,
      };
    } catch {
      return {
        formatted: "--:--:--",
        isDay: true,
        hour: 12,
      };
    }
  };

  // Default display top 4 cities
  const cities = AVAILABLE_CITIES.slice(0, 4);

  return (
    <div className="flex flex-col justify-between h-full w-full p-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
          <Globe size={13} className="text-sky-400" />
          <span>Relógio Mundial</span>
        </div>
        <span className="text-[10px] text-white/50">Fusos Globais</span>
      </div>

      {/* Cities Grid / List */}
      <div className="grid grid-cols-2 gap-1.5 my-auto">
        {cities.map((city) => {
          const { formatted, isDay } = getCityTime(city.timeZone);

          return (
            <div
              key={city.name}
              className="flex flex-col p-1.5 rounded-xl bg-white/10 dark:bg-black/30 border border-white/10 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <span>{city.flag}</span>
                  <span className="truncate">{city.name}</span>
                </span>
                {isDay ? (
                  <Sun size={11} className="text-amber-400" />
                ) : (
                  <Moon size={11} className="text-indigo-300" />
                )}
              </div>
              <span className="text-xs font-mono font-black text-white/90 mt-0.5 tracking-tight">
                {formatted}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[9px] text-white/50 pt-1 border-t border-white/5">
        <span>Horário sincronizado</span>
        <span className="text-emerald-400 font-semibold">● Ao vivo</span>
      </div>
    </div>
  );
};
