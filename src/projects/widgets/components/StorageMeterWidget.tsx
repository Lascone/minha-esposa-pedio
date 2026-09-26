import React, { useEffect } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { HardDrive } from "lucide-react";

interface StorageMeterWidgetProps {
  widget: WidgetInstance;
}

export const StorageMeterWidget: React.FC<StorageMeterWidgetProps> = () => {
  const { systemMetrics, fetchSystemMetrics, metricsUnavailable } = useWidgetsStore();

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 4000);
    return () => clearInterval(interval);
  }, [fetchSystemMetrics]);

  const disks = systemMetrics?.disks ?? [];

  return (
    <div className="flex flex-col w-full h-full select-none justify-between py-1">
      {/* Header */}
      <div className="flex items-center gap-1.5 pb-1 border-b border-black/10 dark:border-white/10">
        <HardDrive size={14} className="text-pink-500" />
        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100">
          Armazenamento & Discos
        </span>
      </div>

      {/* Disks List */}
      <div className="flex flex-col gap-2.5 my-auto overflow-y-auto pr-1">
        {disks.length === 0 && (
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            {metricsUnavailable ? "Não foi possível ler os discos agora." : "Lendo discos…"}
          </p>
        )}
        {disks.map((d) => {
          const isWarning = d.used_percent >= 85;
          const isCritical = d.used_percent >= 92;

          return (
            <div key={d.drive} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1">
                  <span>💿</span> Disco Local ({d.drive})
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {d.free_gb.toFixed(0)} GB livres de {d.total_gb.toFixed(0)} GB
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 rounded-full bg-black/10 dark:bg-slate-800 overflow-hidden border border-black/5 dark:border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCritical
                      ? "bg-rose-500"
                      : isWarning
                      ? "bg-amber-400"
                      : "bg-gradient-to-r from-pink-500 to-rose-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, d.used_percent))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-center text-slate-500 dark:text-slate-400 pt-1 border-t border-black/5 dark:border-white/10">
        Monitoramento de espaço em tempo real
      </div>
    </div>
  );
};
