import React, { useEffect } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { BatteryCharging, Battery, Zap, Monitor } from "lucide-react";

interface BatteryMeterWidgetProps {
  widget: WidgetInstance;
}

export const BatteryMeterWidget: React.FC<BatteryMeterWidgetProps> = () => {
  const { systemMetrics, fetchSystemMetrics, metricsUnavailable } = useWidgetsStore();

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 4000);
    return () => clearInterval(interval);
  }, [fetchSystemMetrics]);

  const battery = systemMetrics?.battery;
  const hasBattery = battery?.has_battery ?? true;
  const percentage = battery?.percentage ?? 100;
  const isCharging = battery?.is_charging ?? false;
  const isOnBattery = battery?.is_on_battery ?? false;

  return (
    <div className="flex flex-col items-center justify-between w-full h-full select-none py-1 text-center">
      {/* Title */}
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        Status de Energia
      </span>

      {!battery ? (
        <div className="flex flex-col items-center my-auto text-xs text-slate-500 dark:text-slate-400">
          <Battery size={40} className="opacity-40 mb-1" />
          {metricsUnavailable ? "Status de energia indisponível" : "Lendo energia…"}
        </div>
      ) : hasBattery ? (
        <div className="flex flex-col items-center my-auto">
          {/* Battery Icon & Percentage */}
          <div className="relative flex items-center justify-center">
            {isCharging ? (
              <BatteryCharging size={48} className="text-emerald-500 animate-pulse" />
            ) : (
              <Battery size={48} className={percentage <= 20 ? "text-rose-500" : "text-slate-700 dark:text-slate-200"} />
            )}
            {isCharging && (
              <Zap size={14} className="absolute text-amber-300 fill-amber-300" />
            )}
          </div>

          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white font-mono">
              {percentage}
            </span>
            <span className="text-sm font-bold text-pink-500">%</span>
          </div>

          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
            {isCharging
              ? "Carregando na tomada ⚡"
              : isOnBattery
              ? "Em uso na bateria"
              : "Conectado à energia CA"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center my-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 to-purple-500 text-white flex items-center justify-center text-2xl shadow-soft mb-2">
            <Monitor size={24} />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Computador Desktop
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Alimentação direta na tomada ⚡
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="text-[10px] text-slate-400 border-t border-black/5 dark:border-white/10 w-full pt-1">
        {!battery ? "—" : hasBattery ? (isOnBattery ? "Modo econômico disponível" : "Desempenho máximo") : "Energia estável"}
      </div>
    </div>
  );
};
