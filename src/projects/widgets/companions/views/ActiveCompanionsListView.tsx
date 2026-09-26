import React from "react";
import {
  Heart,
  Moon,
  Sun,
  Pause,
  Play,
  Trash2,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useCompanionsStore } from "../store/companionsStore";
import { getCompanionManifest } from "../registry";

export const ActiveCompanionsListView: React.FC = () => {
  const {
    activeCompanions,
    customCompanions,
    settings,
    updateSettings,
    updateCompanionState,
    setCompanionAction,
    removeCompanion,
    removeAllCompanions,
    resetAllPositions,
    launchAllActiveCompanions,
  } = useCompanionsStore();

  return (
    <div className="space-y-6">
      {/* Global Companion Controls & Performance Bar */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              Companheiros Ativos no Desktop ({activeCompanions.length} / {settings.maxCompanions})
            </h3>
            <p className="text-xs text-white/50">
              Economia inteligente de CPU: taxa de quadros e animações leves.
            </p>
          </div>
        </div>

        {/* Global toggles: FPS cap, Sounds, Recolher Todos, Reposicionar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* FPS Cap */}
          <button
            onClick={() =>
              updateSettings({ fpsCap: settings.fpsCap === 30 ? 60 : 30 })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 transition-all"
            title="Alternar limite de taxa de quadros"
          >
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>{settings.fpsCap} FPS</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() =>
              updateSettings({ soundEnabled: !settings.soundEnabled })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 transition-all"
            title="Alternar sonzinhos fofos de clique"
          >
            {settings.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sons ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-white/40" />
                <span>Sons OFF</span>
              </>
            )}
          </button>

          {/* Re-sync / Reposicionar */}
          <button
            onClick={() => {
              resetAllPositions();
              launchAllActiveCompanions();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-pink-300 transition-all"
            title="Reorganizar e reabrir janelas no monitor principal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recuperar na Tela</span>
          </button>

          {/* Remove All */}
          {activeCompanions.length > 0 && (
            <button
              onClick={removeAllCompanions}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs font-bold text-red-300 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Guardar Todos</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Companions Cards List */}
      {activeCompanions.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 text-white/60 space-y-2">
          <p className="text-sm font-semibold">Nenhum companheiro passeando pela área de trabalho no momento.</p>
          <p className="text-xs text-white/40">
            Acesse a aba <strong>Catálogo de Personagens</strong> e adicione waifus e gatinhos fofos! 💕
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCompanions.map((comp) => {
            const manifest = getCompanionManifest(comp.companionId, customCompanions);
            const isSleeping = comp.currentState === "sleep";

            return (
              <div
                key={comp.instanceId}
                className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-4 border border-white/10 flex items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={manifest?.preview || ""}
                      alt={comp.customName}
                      className="w-10 h-10 object-contain drop-shadow"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {comp.customName || manifest?.name}
                    </h4>
                    <p className="text-[11px] text-white/50">
                      Estado:{" "}
                      <span className="text-pink-300 font-semibold capitalize">
                        {comp.isPaused
                          ? "Pausado"
                          : comp.currentState === "idle"
                          ? "Descansando"
                          : comp.currentState === "walk"
                          ? "Passeando"
                          : comp.currentState === "sleep"
                          ? "Dormindo 💤"
                          : comp.currentState === "click"
                          ? "Feliz 💕"
                          : "Segurado"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Pet button */}
                  <button
                    onClick={() => setCompanionAction(comp.instanceId, "click")}
                    className="p-2 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 transition-colors"
                    title="Fazer Carinho"
                  >
                    <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
                  </button>

                  {/* Sleep button */}
                  <button
                    onClick={() =>
                      setCompanionAction(
                        comp.instanceId,
                        isSleeping ? "idle" : "sleep"
                      )
                    }
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    title={isSleeping ? "Acordar" : "Dormir"}
                  >
                    {isSleeping ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>

                  {/* Pause toggle */}
                  <button
                    onClick={() =>
                      updateCompanionState(comp.instanceId, {
                        isPaused: !comp.isPaused,
                      })
                    }
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    title={comp.isPaused ? "Continuar" : "Pausar"}
                  >
                    {comp.isPaused ? (
                      <Play className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Pause className="w-4 h-4 text-amber-400" />
                    )}
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeCompanion(comp.instanceId)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors ml-1"
                    title="Remover da tela"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
