import React, { useEffect } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { HardDrive } from "lucide-react";

interface RamMeterWidgetProps {
  widget: WidgetInstance;
}

export const RamMeterWidget: React.FC<RamMeterWidgetProps> = () => {
  const { systemMetrics, fetchSystemMetrics } = useWidgetsStore();

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 1500);
    return () => clearInterval(interval);
  }, [fetchSystemMetrics]);

  const ram = systemMetrics?.ram;
  const usedPercent = ram?.used_percent ?? 45.0;
  const usedGb = ram ? (ram.used_mb / 1024).toFixed(1) : "7.2";
  const totalGb = ram ? (ram.total_mb / 1024).toFixed(0) : "16";

  const needleAngle = -120 + (usedPercent / 100) * 240;

  return (
    <div className="flex flex-col items-center justify-between w-full h-full select-none py-1">
      {/* Gauge Outer Dial */}
      <div className="relative w-36 h-36 rounded-full border-4 border-white/50 dark:border-white/20 bg-gradient-to-b from-white/30 via-transparent to-black/10 dark:from-slate-800/80 dark:to-slate-900/80 shadow-inner flex items-center justify-center">
        {/* Gauge Tick Arc Marks */}
        {[-120, -90, -60, -30, 0, 30, 60, 90, 120].map((deg, idx) => (
          <div
            key={deg}
            className="absolute w-full h-full flex justify-center items-start pt-1.5"
            style={{ transform: `rotate(${deg}deg)` }}
          >
            <div
              className={`rounded-full ${
                idx >= 7
                  ? "w-1 h-2.5 bg-rose-500"
                  : idx >= 5
                  ? "w-0.5 h-2 bg-amber-400"
                  : "w-0.5 h-2 bg-slate-600 dark:bg-slate-300"
              }`}
            />
          </div>
        ))}

        {/* Speedometer Needle */}
        <div
          className="absolute w-full h-full flex justify-center items-center pointer-events-none transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${needleAngle}deg)` }}
        >
          <div className="w-1 h-14 bg-gradient-to-t from-purple-500 to-indigo-500 rounded-full shadow -translate-y-6" />
        </div>

        {/* Center Cap */}
        <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-200 border-2 border-white dark:border-slate-800 flex items-center justify-center z-20 shadow">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
        </div>

        {/* Value Overlay */}
        <div className="absolute bottom-6 flex flex-col items-center z-20">
          <span className="text-base font-extrabold text-slate-800 dark:text-white font-mono drop-shadow-sm">
            {usedPercent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Label and Info */}
      <div className="flex flex-col items-center mt-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          RAM: {usedGb} GB / {totalGb} GB
        </span>
      </div>
    </div>
  );
};
