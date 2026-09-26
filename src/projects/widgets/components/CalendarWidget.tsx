import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarWidgetProps {
  widget: WidgetInstance;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleResetToToday = () => {
    setCurrentDate(new Date());
  };

  const weekHeaders = ["D", "S", "T", "Q", "Q", "S", "S"];

  // Days array with leading empty slots
  const daysGrid = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="flex flex-col w-full h-full select-none justify-between pt-1">
      {/* Month/Year Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
          title="Mês anterior"
        >
          <ChevronLeft size={14} />
        </button>

        <button
          onClick={handleResetToToday}
          className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
          title="Voltar para hoje"
        >
          {monthName} {year}
        </button>

        <button
          onClick={handleNextMonth}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
          title="Próximo mês"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Week Day Letters */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekHeaders.map((day, idx) => (
          <span
            key={idx}
            className={`text-[10px] font-bold ${
              idx === 0 ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center flex-1 items-center">
        {daysGrid.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const isToday = isCurrentMonth && day === today.getDate();

          return (
            <div
              key={`day-${day}`}
              className={`h-6 flex items-center justify-center text-xs font-semibold rounded-lg transition-all ${
                isToday
                  ? "bg-gradient-to-tr from-pink-500 to-rose-500 text-white font-extrabold shadow-sm scale-110"
                  : "text-slate-700 dark:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/50"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Bottom status bar */}
      <div className="text-[10px] text-center text-slate-500 dark:text-slate-400 pt-1 border-t border-black/5 dark:border-white/10 mt-1">
        Hoje: {today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
      </div>
    </div>
  );
};
