import React, { useState, useEffect } from "react";
import { WidgetInstance } from "../types";
import { Calendar, Heart, PartyPopper } from "lucide-react";
import { useWidgetsStore } from "../store/widgetsStore";

interface CountdownWidgetProps {
  widget: WidgetInstance;
}

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();

  const title = widget.settings?.title || "Nosso Aniversário";
  const emoji = widget.settings?.emoji || "💖";
  // Default to 30 days from now if not set
  const defaultTarget = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const targetDateStr = widget.settings?.targetDate || defaultTarget;

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempDate, setTempDate] = useState(targetDateStr);
  const [tempEmoji, setTempEmoji] = useState(emoji);

  useEffect(() => {
    const calculateTime = () => {
      const targetTime = new Date(`${targetDateStr}T00:00:00`).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const handleSave = () => {
    updateWidgetSettings(widget.id, {
      title: tempTitle,
      targetDate: tempDate,
      emoji: tempEmoji,
    });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col justify-between h-full w-full p-2 select-none">
      {/* Title & Emoji */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-lg">{emoji}</span>
          <span className="text-xs font-bold text-white truncate max-w-[150px]">
            {title}
          </span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-[10px] text-pink-300 hover:text-pink-200 px-1.5 py-0.5 rounded bg-white/10"
        >
          {isEditing ? "Fechar" : "Editar"}
        </button>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2 p-1 text-[11px]">
          <div>
            <label className="text-[10px] text-white/60">Título:</label>
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-[11px]"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-white/60">Data:</label>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded px-1.5 py-1 text-white text-[11px]"
              />
            </div>
            <div className="w-14">
              <label className="text-[10px] text-white/60">Emoji:</label>
              <input
                type="text"
                value={tempEmoji}
                onChange={(e) => setTempEmoji(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded px-1.5 py-1 text-white text-center text-[11px]"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="mt-1 py-1 rounded bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow"
          >
            Salvar Data
          </button>
        </div>
      ) : (
        <>
          {/* Main Counter Display */}
          {timeLeft.isPast ? (
            <div className="flex flex-col items-center justify-center my-auto py-2">
              <PartyPopper className="w-8 h-8 text-amber-300 animate-bounce mb-1" />
              <span className="text-sm font-black text-rose-300">Chegou o grande dia! 🎉</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 my-auto">
              <div className="flex flex-col items-center bg-white/10 dark:bg-black/30 rounded-xl p-1.5 border border-white/10 shadow-inner">
                <span className="text-lg font-black text-white font-mono leading-none">
                  {timeLeft.days}
                </span>
                <span className="text-[9px] text-white/60 uppercase font-semibold mt-1">
                  Dias
                </span>
              </div>
              <div className="flex flex-col items-center bg-white/10 dark:bg-black/30 rounded-xl p-1.5 border border-white/10 shadow-inner">
                <span className="text-lg font-black text-white font-mono leading-none">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-[9px] text-white/60 uppercase font-semibold mt-1">
                  Horas
                </span>
              </div>
              <div className="flex flex-col items-center bg-white/10 dark:bg-black/30 rounded-xl p-1.5 border border-white/10 shadow-inner">
                <span className="text-lg font-black text-white font-mono leading-none">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-[9px] text-white/60 uppercase font-semibold mt-1">
                  Min
                </span>
              </div>
              <div className="flex flex-col items-center bg-white/10 dark:bg-black/30 rounded-xl p-1.5 border border-white/10 shadow-inner">
                <span className="text-lg font-black text-rose-300 font-mono leading-none">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-[9px] text-white/60 uppercase font-semibold mt-1">
                  Seg
                </span>
              </div>
            </div>
          )}

          {/* Footer Date badge */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1">
              <Calendar size={11} className="text-pink-400" />
              {targetDateStr.split("-").reverse().join("/")}
            </span>
            <span className="flex items-center gap-0.5 text-rose-300">
              <Heart size={10} className="fill-rose-400 text-rose-400" />
              Contando
            </span>
          </div>
        </>
      )}
    </div>
  );
};
