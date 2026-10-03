import React, { useState, useEffect } from "react";
import { useThemeStore, AVAILABLE_THEMES, ThemeId } from "../theme/themeManager";
import { useCrosshairStore } from "@/projects/crosshair/store/crosshairStore";
import { Toggle } from "@/core/components/Toggle";
import { Slider } from "@/core/components/Slider";
import { Button } from "@/core/components/Button";
import { Card } from "@/core/components/Card";
import { useToast } from "@/core/components/Toast";
import {
  Monitor,
  Keyboard,
  Palette,
  Power,
  Info,
  Trash2,
  Check,
  Sparkles,
  Layers,
  Key,
  ExternalLink,
  HelpCircle,
  X,
  ShieldCheck,
  RefreshCw,
  Gamepad2,
} from "lucide-react";
import { checkForUpdates, getCurrentVersion, UpdateInfo } from "@/core/services/updateService";
import { UpdateModal } from "@/core/components/UpdateModal";
import { IntegrationsManagerCard } from "@/core/components/IntegrationsManagerCard";
import { useAiStore } from "@/core/stores/aiStore";
import { invoke } from "@tauri-apps/api/core";
import {
  enable as enableAutostart,
  disable as disableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";

interface MonitorOption {
  name: string;
  width: number;
  height: number;
  is_primary: boolean;
}

export const SettingsView: React.FC = () => {
  const { currentTheme, setTheme } = useThemeStore();
  const {
    selectedMonitorIndex,
    setMonitorIndex,
    overlayOffsetX,
    overlayOffsetY,
    setOverlayOffset,
  } = useCrosshairStore();

  const { addToast } = useToast();

  const [autostart, setAutostart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);

  const [monitors, setMonitors] = useState<MonitorOption[]>([]);
  const [monitorsError, setMonitorsError] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState("");
  const geminiRequestsToday = useAiStore((s) => s.geminiRequestsToday);
  const [showGeminiTutorial, setShowGeminiTutorial] = useState(false);

  const [currentVersion, setCurrentVersion] = useState("1.0.0");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Load Tauri settings if available
  useEffect(() => {
    try {
      getCurrentVersion().then(setCurrentVersion);
      const savedTray = localStorage.getItem("pmm_minimize_tray") !== "false";
      const savedKey = localStorage.getItem("pmm_gemini_api_key") || "";
      setMinimizeToTray(savedTray);
      setGeminiApiKey(savedKey);
    } catch {}
    isAutostartEnabled()
      .then(setAutostart)
      .catch(() => setAutostart(localStorage.getItem("pmm_autostart") === "true"));
    invoke<MonitorOption[]>("get_monitors")
      .then((list) => {
        setMonitors(list);
        setMonitorsError(list.length === 0);
      })
      .catch(() => setMonitorsError(true));
  }, []);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const res = await checkForUpdates(true);
      setCurrentVersion(res.currentVersion);
      if (res.hasUpdate && res.updateInfo) {
        setUpdateInfo(res.updateInfo);
        setUpdateModalOpen(true);
      } else if (res.error) {
        addToast(res.error, "warning");
      } else {
        addToast("Você já está na versão mais recente cheia de amor! 🥰✨", "sparkle");
      }
    } catch {
      addToast("Não foi possível verificar atualizações no momento.", "warning");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleSaveGeminiKey = () => {
    const trimmed = geminiApiKey.trim();
    localStorage.setItem("pmm_gemini_api_key", trimmed);
    useAiStore.getState().setGeminiApiKey(trimmed);
    addToast(trimmed ? "Chave do Gemini salva! 🚀" : "Chave removida.", "sparkle");
  };

  const handleToggleAutostart = async (val: boolean) => {
    try {
      if (val) await enableAutostart();
      else await disableAutostart();
      setAutostart(val);
      localStorage.setItem("pmm_autostart", String(val));
      addToast(
        val
          ? "Inicialização automática ativada! 🚀"
          : "Inicialização automática desativada.",
        "sparkle"
      );
    } catch (e: any) {
      addToast(`Não consegui mudar a inicialização com o Windows: ${e?.message || e}`, "warning");
    }
  };

  const handleToggleTray = (val: boolean) => {
    setMinimizeToTray(val);
    localStorage.setItem("pmm_minimize_tray", String(val));
    invoke("set_minimize_to_tray", { enabled: val }).catch(() => {});
    addToast(
      val
        ? "O aplicativo agora continuará na bandeja ao fechar ✨"
        : "O aplicativo encerrará completamente ao fechar.",
      "info"
    );
  };

  const handleClearCache = () => {
    localStorage.removeItem("pmm_crosshair_history");
    addToast("Cache e histórico limpos com sucesso! 🧹", "success");
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-2">
      <div>
        <h2 className="text-2xl font-bold text-theme-text">Configurações</h2>
        <p className="text-xs text-theme-text-muted mt-1">
          Ajustes gerais do aplicativo, comportamento em segundo plano e preferências.
        </p>
      </div>

      {/* 1. Aparência e Temas */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
          <Palette size={18} className="text-theme-primary" />
          <h3 className="text-base font-bold text-theme-text">Temas & Aparência</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AVAILABLE_THEMES.map((th) => {
            const isSelected = currentTheme === th.id;
            return (
              <button
                key={th.id}
                onClick={() => {
                  setTheme(th.id);
                  addToast(`Tema "${th.name}" aplicado! 💕`, "love");
                }}
                className={`flex flex-col p-3 rounded-cute border text-left transition-all ${
                  isSelected
                    ? "border-theme-primary ring-2 ring-theme-primary/20 bg-theme-surface-card shadow-soft"
                    : "border-theme-border/60 hover:border-theme-primary/40 bg-theme-surface"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{th.emoji}</span>
                  {isSelected && <Check size={16} className="text-theme-primary" />}
                </div>
                <span className="text-xs font-bold text-theme-text">{th.name}</span>
                <span className="text-[10px] text-theme-text-muted line-clamp-1 mt-0.5">
                  {th.description}
                </span>
                <div className="flex gap-1 mt-2">
                  <span
                    className="w-3 h-3 rounded-full border border-black/10"
                    style={{ backgroundColor: th.primaryColor }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-black/10"
                    style={{ backgroundColor: th.bgColor }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2. Personalizações & Contas Conectadas (Spotify, YouTube Music, YouTube, Gmail via Mozilla Firefox) */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
          <Sparkles size={18} className="text-pink-500" />
          <div>
            <h3 className="text-base font-bold text-theme-text">Contas & Integrações de Mídia</h3>
            <p className="text-[11px] text-theme-text-muted">
              Conecte Spotify, YouTube Music, YouTube e Gmail via seu navegador padrão (Mozilla Firefox) para alimentar seus gadgets e widgets.
            </p>
          </div>
        </div>

        <IntegrationsManagerCard />
      </Card>

      {/* 3. Sistema & Segundo Plano */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
          <Power size={18} className="text-purple-500" />
          <h3 className="text-base font-bold text-theme-text">Sistema & Segundo Plano</h3>
        </div>

        <div className="flex flex-col gap-3 divide-y divide-theme-border/40">
          <Toggle
            label="Iniciar junto com o Windows"
            description="Abre o aplicativo discretamente em segundo plano na inicialização do sistema."
            checked={autostart}
            onChange={handleToggleAutostart}
          />

          <div className="pt-3">
            <Toggle
              label="Minimizar para a bandeja (System Tray) ao fechar"
              description="Quando você clica no 'X', a janela se esconde ao lado do relógio do Windows sem encerrar o overlay."
              checked={minimizeToTray}
              onChange={handleToggleTray}
            />
          </div>

        </div>
      </Card>

      {/* 3. Monitores & Overlay */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
          <Monitor size={18} className="text-cyan-500" />
          <h3 className="text-base font-bold text-theme-text">Monitores & Overlay</h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-text">
              Monitor de Exibição da Mira
            </label>
            {monitorsError && (
              <p className="text-[11px] text-theme-text-muted">
                Não consegui ler a lista de monitores do Windows agora.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monitors.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMonitorIndex(idx);
                    addToast(`Monitor ${idx + 1} selecionado`, "info");
                  }}
                  className={`p-3 rounded-cute border text-left transition-all ${
                    selectedMonitorIndex === idx
                      ? "border-theme-primary bg-theme-primary/10 text-theme-text"
                      : "border-theme-border/60 bg-theme-surface-card text-theme-text-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{m.name}</span>
                    {m.is_primary && (
                      <span className="text-[10px] bg-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] opacity-75">
                    {m.width} x {m.height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders de Offset Ampliados */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-theme-text">
                Deslocamento de Centro (Offset de Jogos):
              </span>
              <button
                onClick={() => {
                  setOverlayOffset(0, 0);
                  addToast("Mira centralizada no centro exato (0, 0)", "info");
                }}
                className="text-[11px] text-theme-primary hover:underline font-bold"
              >
                Resetar para o Centro (0, 0)
              </button>
            </div>

            {/* Presets Rápidos de Jogos */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "🎯 Centro Padrão (0, 0)", x: 0, y: 0 },
                { label: "🌲 Mira Rebaixada (Y: +75px) - Hunt / DayZ / Rust", x: 0, y: 75 },
                { label: "👤 3ª Pessoa Ombro Dir. (X: +140px, Y: +30px)", x: 140, y: 30 },
                { label: "👤 3ª Pessoa Ombro Esq. (X: -140px, Y: +30px)", x: -140, y: 30 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setOverlayOffset(p.x, p.y);
                    addToast(`Offset aplicado: ${p.label}`, "sparkle");
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    overlayOffsetX === p.x && overlayOffsetY === p.y
                      ? "bg-theme-primary text-white border-theme-primary font-bold shadow-soft"
                      : "bg-theme-surface-card border-theme-border/60 text-theme-text-muted hover:text-theme-text"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-theme-text">Offset X (Horizontal)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={overlayOffsetX}
                      onChange={(e) => setOverlayOffset(parseInt(e.target.value, 10) || 0, overlayOffsetY)}
                      className="w-16 h-7 px-1.5 text-center text-xs font-mono bg-theme-surface-card border border-theme-border rounded-lg text-theme-text"
                    />
                    <span className="text-xs text-theme-text-muted">px</span>
                  </div>
                </div>
                <Slider
                  label=""
                  value={overlayOffsetX}
                  min={-800}
                  max={800}
                  step={1}
                  unit="px"
                  onChange={(x) => setOverlayOffset(x, overlayOffsetY)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-theme-text">Offset Y (Vertical)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={overlayOffsetY}
                      onChange={(e) => setOverlayOffset(overlayOffsetX, parseInt(e.target.value, 10) || 0)}
                      className="w-16 h-7 px-1.5 text-center text-xs font-mono bg-theme-surface-card border border-theme-border rounded-lg text-theme-text"
                    />
                    <span className="text-xs text-theme-text-muted">px</span>
                  </div>
                </div>
                <Slider
                  label=""
                  value={overlayOffsetY}
                  min={-800}
                  max={800}
                  step={1}
                  unit="px"
                  onChange={(y) => setOverlayOffset(overlayOffsetX, y)}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>


      {/* 4. Central de Atalhos Rápida */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-theme-primary/10 via-theme-surface to-purple-500/10 border-theme-primary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-theme-primary/20 text-theme-primary flex items-center justify-center">
            <Keyboard size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-theme-text flex items-center gap-2">
              Central Unificada de Atalhos
            </h3>
            <p className="text-xs text-theme-text-muted">
              Todos os atalhos globais, miras, menus e widgets agora ficam organizados em uma aba exclusiva.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            window.location.hash = "/shortcuts";
          }}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <span>Abrir Central de Atalhos</span>
          <ExternalLink size={14} />
        </Button>
      </Card>

      {/* Mini Console: jogos do dono */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-500/10 via-theme-surface to-pink-500/10 border-indigo-400/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Gamepad2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-theme-text">Mini Console · Gerenciar jogos</h3>
            <p className="text-xs text-theme-text-muted">
              Adicione, edite, troque a capa ou remova os jogos que aparecem como widgets na galeria.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            window.location.hash = "/settings/console";
          }}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <span>Gerenciar jogos</span>
          <ExternalLink size={14} />
        </Button>
      </Card>

      {/* 5. IA em Nuvem & Visão (Google Gemini 2.0 Flash) */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            <h3 className="text-base font-bold text-theme-text">IA em Nuvem & Visão (Google Gemini 2.0 Flash)</h3>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#/ai"
              className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 hover:underline"
            >
              <span>Gerenciar na Central de IAs (Groq + Gemini)</span>
              <span>&rarr;</span>
            </a>
            <button
              onClick={() => setShowGeminiTutorial(true)}
              className="flex items-center gap-1.5 text-xs text-theme-primary hover:underline font-bold"
            >
              <HelpCircle size={14} />
              <span>Tutorial</span>
            </button>
          </div>
        </div>

        {/* Input da Chave */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-theme-text flex items-center gap-1.5">
            <Key size={13} className="text-theme-primary" />
            <span>Chave da API Gemini (Google AI Studio)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Cole sua chave AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-theme-surface-card border border-theme-border/60 text-xs font-mono text-theme-text focus:outline-none focus:border-theme-primary"
            />
            <Button size="sm" onClick={handleSaveGeminiKey}>
              Salvar
            </Button>
          </div>
        </div>

        {/* Monitoramento de Cota Diária e Gasto */}
        <div className="p-4 rounded-xl bg-theme-surface-card border border-theme-border/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className="font-bold text-theme-text">Pedidos ao Gemini hoje: {geminiRequestsToday}</span>
            </div>
          </div>

          <p className="text-[11px] text-theme-text-muted leading-relaxed">
            Contados por este aplicativo. Sem cartão cadastrado no Google AI Studio a chave usa só a cota gratuita:
            quando ela acaba, o Google recusa os pedidos até o dia seguinte, sem cobrar nada. Os limites exatos
            dependem do modelo e aparecem no painel do Google AI Studio.
          </p>
        </div>
      </Card>

      {/* 6. Atualizações do Programa */}
      <Card className="flex flex-col gap-4 border-pink-500/20 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
        <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-pink-500" />
            <h3 className="text-base font-bold text-theme-text">Atualizações do Programa</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 font-bold text-xs">
            v{currentVersion}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-theme-text">Central de Releases & Novidades</span>
            <span className="text-theme-text-muted">
              O maridão prepara atualizações constantes com melhorias e carinho para você.
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCheckUpdates}
            disabled={checkingUpdate}
            className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md shadow-pink-500/20"
          >
            <RefreshCw size={13} className={checkingUpdate ? "animate-spin" : ""} />
            <span>{checkingUpdate ? "Verificando..." : "Buscar Atualizações 💕"}</span>
          </Button>
        </div>
      </Card>

      {/* 7. Limpeza de Dados */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
          <Trash2 size={18} className="text-rose-500" />
          <h3 className="text-base font-bold text-theme-text">Dados Locais & Cache</h3>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-theme-text">
              Limpar histórico de miras recentes
            </span>
            <span className="text-xs text-theme-text-muted">
              Não remove seus favoritos nem suas miras salvas.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            Limpar Cache
          </Button>
        </div>
      </Card>

      {/* Modal de Tutorial do Gemini */}
      {showGeminiTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-theme-surface border border-theme-border shadow-2xl p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-theme-primary" />
                <h3 className="text-base font-bold text-theme-text">Como Obter a API Key Gratuita do Gemini</h3>
              </div>
              <button
                onClick={() => setShowGeminiTutorial(false)}
                className="p-1 rounded-lg hover:bg-theme-surface-card text-theme-text-muted hover:text-theme-text"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-theme-text leading-relaxed">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-theme-surface-card border border-theme-border/50">
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <div>
                  <strong>Acesse o Google AI Studio</strong>: abra o link abaixo no seu navegador e faça login com seu Gmail (não pede cartão de crédito).
                  <div className="mt-1">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-theme-primary font-bold hover:underline"
                    >
                      <span>aistudio.google.com/app/apikey</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-theme-surface-card border border-theme-border/50">
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <div>
                  <strong>Clique em &quot;Create API key&quot;</strong>: selecione &quot;Create API key in new project&quot;. A chave será gerada instantaneamente.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-theme-surface-card border border-theme-border/50">
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </span>
                <div>
                  <strong>Copie e cole aqui</strong>: copie o código gerado (começa com <code>AIzaSy...</code>) e cole no campo de texto acima.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                ✨ <strong>Grátis:</strong> sem cartão cadastrado no Google AI Studio, a chave usa só a cota gratuita e nunca gera cobrança. Quando a cota do dia acaba, os pedidos são recusados até o dia seguinte.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setShowGeminiTutorial(false)}>
                Entendi, fechar tutorial
              </Button>
            </div>
          </div>
        </div>
      )}

      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
        currentVersion={currentVersion}
      />
    </div>
  );
};
