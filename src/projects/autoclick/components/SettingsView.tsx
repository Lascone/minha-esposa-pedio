import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Cpu,
  Activity,
  Zap,
  CheckCircle2,
  Sparkles,
  Keyboard,
  ExternalLink,
} from "lucide-react";
import { useAutoClickStore } from "../store/autoclickStore";

export const SettingsView: React.FC = () => {
  const {
    hotkeyStartStop,
    hotkeyEmergencyStop,
    hotkeyPickPosition,
    cornerFailsafe,
    setCornerFailsafe,
    simulationMode,
    setSimulationMode,
    diagnostics,
    realCps,
    cps,
    timerDriftMs,
  } = useAutoClickStore();

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border/60 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center text-2xl shadow-soft">
            <Settings size={24} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-theme-text">Configurações & Failsafes de Segurança</h2>
            <span className="text-xs text-theme-text-muted">
              Ajuste atalhos globais de teclado, proteções de emergência e diagnóstico técnico
            </span>
          </div>
        </div>
      </div>

      {/* Central de Atalhos Link Card */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border/60 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-500 flex-shrink-0">
            <Keyboard size={22} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-theme-text">Atalhos Unificados do Auto Click</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary font-bold">Central</span>
            </div>
            <span className="text-xs text-theme-text-muted">
              Início: <strong className="text-theme-text font-mono">{hotkeyStartStop || "Insert"}</strong> • Pânico: <strong className="text-red-500 font-mono">{hotkeyEmergencyStop || "Shift+Escape"}</strong> • Coordenada: <strong className="text-theme-text font-mono">{hotkeyPickPosition || "F7"}</strong>
            </span>
          </div>
        </div>

        <button
          onClick={() => { window.location.hash = "/shortcuts"; }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-surface-card hover:bg-theme-surface border border-theme-border/70 hover:border-theme-primary text-theme-text text-xs font-bold transition-all shadow-sm flex-shrink-0 self-end sm:self-center"
        >
          <span>Gerenciar na Central de Atalhos</span>
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Safety & Failsafes */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border/60 shadow-soft flex flex-col gap-4">
        <span className="text-xs font-black text-theme-text uppercase">Failsafes & Proteções Automáticas</span>

        <div className="flex flex-col gap-3 text-xs">
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-theme-surface-card border border-theme-border/50 cursor-pointer hover:border-pink-300">
            <input
              type="checkbox"
              checked={cornerFailsafe}
              onChange={(e) => setCornerFailsafe(e.target.checked)}
              className="mt-0.5 rounded accent-pink-500 w-4 h-4"
            />
            <div className="flex flex-col">
              <span className="font-bold text-theme-text">Canto da Tela (Corner Failsafe)</span>
              <span className="text-[11px] text-theme-text-muted">
                Se você empurrar o mouse rapidamente para o canto superior esquerdo da tela (0, 0), o auto clicker é imediatamente interrompido e todas as teclas são soltas.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-theme-surface-card border border-theme-border/50 cursor-pointer hover:border-pink-300">
            <input
              type="checkbox"
              checked={simulationMode}
              onChange={(e) => setSimulationMode(e.target.checked)}
              className="mt-0.5 rounded accent-pink-500 w-4 h-4"
            />
            <div className="flex flex-col">
              <span className="font-bold text-theme-text">Modo de Simulação / Teste (Test Mode)</span>
              <span className="text-[11px] text-theme-text-muted">
                Executa o timer e gera telemetria sem disparar cliques físicos ou teclas no Windows. Ideal para testar sequências complexas sem clicar acidentalmente.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Advanced Diagnostics Card */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border/60 shadow-soft flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/40 pb-3">
          <Cpu size={18} className="text-purple-500" />
          <h3 className="text-sm font-extrabold text-theme-text">Diagnóstico Técnico (Developer Mode)</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-theme-surface-card border border-theme-border/40 flex flex-col">
            <span className="text-[10px] text-theme-text-muted font-bold">CPS Alvo vs Real</span>
            <span className="text-base font-black text-theme-text font-mono mt-0.5">
              {realCps} / {cps} CPS
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-theme-surface-card border border-theme-border/40 flex flex-col">
            <span className="text-[10px] text-theme-text-muted font-bold">Drift de Temporizador</span>
            <span className="text-base font-black text-emerald-500 font-mono mt-0.5">
              {timerDriftMs} ms
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-theme-surface-card border border-theme-border/40 flex flex-col">
            <span className="text-[10px] text-theme-text-muted font-bold">Intervalo Médio Real</span>
            <span className="text-base font-black text-theme-text font-mono mt-0.5">
              {diagnostics.realCps > 0 ? `${diagnostics.averageIntervalMs.toFixed(1)} ms` : "—"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-theme-surface-card border border-theme-border/40 flex flex-col">
            <span className="text-[10px] text-theme-text-muted font-bold">Motor Nativo</span>
            <span className="text-xs font-bold text-pink-500 mt-1">
              Win32 SendInput (Rust)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
