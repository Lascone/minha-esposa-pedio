import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Zap,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Check,
  Copy,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAiStore } from "../stores/aiStore";
import { testAiConnection, fetchGroqModels } from "../services/aiService";
import { useToast } from "../components/Toast";
import { Button } from "../components/Button";

export const AiSettingsView: React.FC = () => {
  const {
    activeProvider,
    groqApiKey,
    groqModel,
    availableGroqModels,
    geminiApiKey,
    geminiModel,
    geminiRequestsToday,
    lastTestLatencyMs,
    lastTestStatus,
    lastTestMessage,
    setActiveProvider,
    setGroqApiKey,
    setGroqModel,
    setGeminiApiKey,
  } = useAiStore();

  const { addToast } = useToast();

  const [inputGroqKey, setInputGroqKey] = useState(groqApiKey);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [inputGeminiKey, setInputGeminiKey] = useState(geminiApiKey);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [showGeminiTutorial, setShowGeminiTutorial] = useState(false);

  const handleFetchModels = async () => {
    if (!groqApiKey) {
      addToast("Salve sua chave Groq primeiro para listar os modelos.", "warning");
      return;
    }
    setIsFetchingModels(true);
    const models = await fetchGroqModels(groqApiKey);
    setIsFetchingModels(false);
    if (models.length > 0) {
      addToast(`${models.length} modelos detectados na sua conta Groq! ⚡`, "sparkle");
    } else {
      addToast("Nenhum modelo retornado. Verifique se sua chave está correta.", "warning");
    }
  };

  const handleSaveGroqKey = async () => {
    setGroqApiKey(inputGroqKey);
    addToast(inputGroqKey.trim() ? "Chave da Groq salva com sucesso! ⚡" : "Chave da Groq removida.", "sparkle");
    if (inputGroqKey.trim()) {
      fetchGroqModels(inputGroqKey.trim());
    }
  };

  const handleSaveGeminiKey = () => {
    setGeminiApiKey(inputGeminiKey);
    addToast(inputGeminiKey.trim() ? "Chave do Gemini salva com sucesso! 🚀" : "Chave do Gemini removida.", "sparkle");
  };

  const handleTestGroq = async () => {
    setIsTestingGroq(true);
    const res = await testAiConnection("groq");
    setIsTestingGroq(false);
    if (res.success) {
      addToast(res.message, "success");
    } else {
      addToast(`Erro ao conectar com Groq: ${res.message}`, "warning");
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    const res = await testAiConnection("gemini");
    setIsTestingGemini(false);
    if (res.success) {
      addToast(res.message, "success");
    } else {
      addToast(`Erro ao conectar com Gemini: ${res.message}`, "warning");
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-cuter p-6 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-pink-500/30 backdrop-blur-md shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-500 text-white flex items-center justify-center text-3xl shadow-soft shrink-0">
              <Bot size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-theme-text tracking-tight">
                  Central de IAs & Modelos
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/30 text-pink-300 border border-pink-500/40">
                  Custo Zero 💸
                </span>
              </div>
              <p className="text-sm text-theme-text-muted mt-1 leading-relaxed max-w-xl">
                Configure os motores de Inteligência Artificial gratuitos. Use a velocidade instantânea do <strong>Groq</strong> ou a precisão do <strong>Gemini</strong> para criar e alterar seus gadgets por chat.
              </p>
            </div>
          </div>

          {/* Quick Active Provider Selector */}
          <div className="bg-theme-surface/70 border border-theme-border/60 p-3 rounded-2xl backdrop-blur-sm shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-theme-text-muted block mb-2">
              IA Padrão Ativa no App
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveProvider("groq");
                  addToast("Groq ativado como IA principal! ⚡", "sparkle");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === "groq"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-soft"
                    : "bg-theme-surface-card hover:bg-theme-surface text-theme-text border border-theme-border"
                }`}
              >
                <Zap size={14} />
                <span>Groq Cloud</span>
                {activeProvider === "groq" && <Check size={12} className="ml-1" />}
              </button>

              <button
                onClick={() => {
                  setActiveProvider("gemini");
                  addToast("Gemini ativado como IA principal! 🚀", "sparkle");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeProvider === "gemini"
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-soft"
                    : "bg-theme-surface-card hover:bg-theme-surface text-theme-text border border-theme-border"
                }`}
              >
                <Sparkles size={14} />
                <span>Gemini 2.0</span>
                {activeProvider === "gemini" && <Check size={12} className="ml-1" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Groq vs Gemini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: GROQ */}
        <div className={`p-6 rounded-cuter border transition-all duration-300 flex flex-col justify-between ${
          activeProvider === "groq"
            ? "bg-theme-surface-card border-orange-500/40 shadow-soft ring-1 ring-orange-500/20"
            : "bg-theme-surface-card/60 border-theme-border"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                    Groq Cloud
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                      ⚡ Ultra Rápido
                    </span>
                  </h3>
                  <p className="text-xs text-theme-text-muted">Processador LPU com respostas em milissegundos</p>
                </div>
              </div>

              {activeProvider === "groq" && (
                <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                  Em Uso
                </span>
              )}
            </div>

            {/* Input Chave Groq */}
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-theme-text flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={14} className="text-orange-400" />
                  Chave de API Groq (gsk_...)
                </span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
                >
                  Criar chave grátis <ExternalLink size={10} />
                </a>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGroqKey ? "text" : "password"}
                    value={inputGroqKey}
                    onChange={(e) => setInputGroqKey(e.target.value)}
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-theme-surface border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none focus:border-orange-500/60 font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors"
                  >
                    {showGroqKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button size="sm" onClick={handleSaveGroqKey} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  Salvar
                </Button>
              </div>
            </div>

            {/* Seletor de Modelo Groq */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                  <Cpu size={14} className="text-orange-400" />
                  Modelo Groq Ativo
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels || !groqApiKey}
                    className="text-[11px] text-orange-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={10} className={isFetchingModels ? "animate-spin" : ""} />
                    {isFetchingModels ? "Buscando..." : "Detectar Modelos da Conta"}
                  </button>
                  <span className="text-theme-border">•</span>
                  <a
                    href="https://console.groq.com/docs/models"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
                  >
                    Docs <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {availableGroqModels.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-text font-mono focus:outline-none focus:border-orange-500"
                  >
                    {availableGroqModels.map((m) => (
                      <option key={m} value={m}>
                        {m} {m.includes("8b-instant") ? "(⚡ Recomendado)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-theme-text-muted">
                    {availableGroqModels.length} modelos detectados na sua conta.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroqModel("openai/gpt-oss-120b")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      groqModel === "openai/gpt-oss-120b"
                        ? "bg-orange-500/15 border-orange-500/40 text-theme-text"
                        : "bg-theme-surface/50 border-theme-border text-theme-text-muted hover:bg-theme-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-theme-text">GPT-OSS 120B</span>
                      {groqModel === "openai/gpt-oss-120b" && <Check size={12} className="text-orange-400" />}
                    </div>
                    <p className="text-[10px] text-theme-text-muted leading-tight">
                      🧠 120B parâmetros. Raciocínio avançado e código impecável.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroqModel("llama-3.1-8b-instant")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      groqModel === "llama-3.1-8b-instant"
                        ? "bg-orange-500/15 border-orange-500/40 text-theme-text"
                        : "bg-theme-surface/50 border-theme-border text-theme-text-muted hover:bg-theme-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-theme-text">Llama 3.1 8B</span>
                      {groqModel === "llama-3.1-8b-instant" && <Check size={12} className="text-orange-400" />}
                    </div>
                    <p className="text-[10px] text-theme-text-muted leading-tight">
                      ⚡ Ultra rápido (&gt;1.000 tokens/s) para ajustes imediatos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroqModel("llama-3.3-70b-versatile")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      groqModel === "llama-3.3-70b-versatile"
                        ? "bg-orange-500/15 border-orange-500/40 text-theme-text"
                        : "bg-theme-surface/50 border-theme-border text-theme-text-muted hover:bg-theme-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-theme-text">Llama 3.3 70B</span>
                      {groqModel === "llama-3.3-70b-versatile" && <Check size={12} className="text-orange-400" />}
                    </div>
                    <p className="text-[10px] text-theme-text-muted leading-tight">
                      Versátil e criativo para design.
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Links e Métricas Groq */}
            <div className="p-3 rounded-xl bg-theme-surface/60 border border-theme-border/50 text-xs space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-theme-text-muted">Métricas & Dashboard do Groq:</span>
                <a
                  href="https://console.groq.com/dashboard/metrics"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 hover:underline font-semibold flex items-center gap-1"
                >
                  Ver no Console Groq <ExternalLink size={11} />
                </a>
              </div>
              <p className="text-[11px] text-theme-text-muted">
                A camada gratuita da Groq oferece milhares de tokens por minuto sem exigir cartão de crédito.
              </p>
            </div>
          </div>

          {/* Teste de Conexão Groq */}
          <div className="pt-3 border-t border-theme-border/60 flex items-center justify-between">
            <button
              onClick={handleTestGroq}
              disabled={isTestingGroq || !groqApiKey}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={isTestingGroq ? "animate-spin" : ""} />
              {isTestingGroq ? "Testando..." : "Testar Conexão Groq"}
            </button>

            {activeProvider === "groq" && lastTestStatus === "success" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 size={13} />
                {lastTestLatencyMs ? `${lastTestLatencyMs}ms` : "Conectado"}
              </span>
            )}
            {activeProvider === "groq" && lastTestStatus === "error" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                <AlertCircle size={13} />
                Falha
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: GEMINI */}
        <div className={`p-6 rounded-cuter border transition-all duration-300 flex flex-col justify-between ${
          activeProvider === "gemini"
            ? "bg-theme-surface-card border-blue-500/40 shadow-soft ring-1 ring-blue-500/20"
            : "bg-theme-surface-card/60 border-theme-border"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                    Google Gemini 3.8 Flash
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      ☁️ Visão & Código
                    </span>
                  </h3>
                  <p className="text-xs text-theme-text-muted">Modelo mais recente com cota gratuita do Google AI Studio</p>
                </div>
              </div>

              {activeProvider === "gemini" && (
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                  Em Uso
                </span>
              )}
            </div>

            {/* Input Chave Gemini */}
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-theme-text flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={14} className="text-blue-400" />
                  Chave de API Gemini (AIzaSy...)
                </span>
                <button
                  type="button"
                  onClick={() => setShowGeminiTutorial(true)}
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <HelpCircle size={11} /> Como pegar grátis
                </button>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={inputGeminiKey}
                    onChange={(e) => setInputGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-theme-surface border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none focus:border-blue-500/60 font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors"
                  >
                    {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button size="sm" onClick={handleSaveGeminiKey} className="bg-blue-500 hover:bg-blue-600 text-white font-bold">
                  Salvar
                </Button>
              </div>
            </div>

            {/* Quota Diária Gemini */}
            <div className="p-4 rounded-xl bg-theme-surface/70 border border-theme-border/60 space-y-3 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-theme-text flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Consumo Diário: {geminiRequestsToday} / 1.500
                </span>
                <span className="text-emerald-400 font-bold">100% Gratuito</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-theme-border/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (geminiRequestsToday / 1500) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-theme-text-muted">
                Limite de 1.500 requisições diárias sem custo no Google AI Studio. Reseta automaticamente à meia-noite.
              </p>
            </div>
          </div>

          {/* Teste de Conexão Gemini */}
          <div className="pt-3 border-t border-theme-border/60 flex items-center justify-between">
            <button
              onClick={handleTestGemini}
              disabled={isTestingGemini || !geminiApiKey}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={isTestingGemini ? "animate-spin" : ""} />
              {isTestingGemini ? "Testando..." : "Testar Conexão Gemini"}
            </button>

            {activeProvider === "gemini" && lastTestStatus === "success" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 size={13} />
                {lastTestLatencyMs ? `${lastTestLatencyMs}ms` : "Conectado"}
              </span>
            )}
            {activeProvider === "gemini" && lastTestStatus === "error" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                <AlertCircle size={13} />
                Falha
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banner de atalho para criar gadgets */}
      <div className="p-6 rounded-cuter bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 border border-pink-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center text-2xl shadow-soft">
            ✨
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-theme-text">Tudo pronto para criar gadgets com IA?</h4>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Abra a Galeria de Gadgets e use o novo botão <strong>Criar com IA Gratuita</strong> para criar ou modificar o que sua esposa pedir!
            </p>
          </div>
        </div>

        <a
          href="#/widgets"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-soft shrink-0"
        >
          <span>Ir para Galeria de Gadgets</span>
          <ChevronRight size={14} />
        </a>
      </div>

      {/* Tutorial Modal do Gemini */}
      {showGeminiTutorial && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-surface-card border border-theme-border rounded-cuter p-6 max-w-lg w-full space-y-4 shadow-soft">
            <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
              <Sparkles className="text-blue-400" size={18} />
              Como Obter a API Key Gratuita do Gemini
            </h3>
            <ol className="text-xs text-theme-text-muted space-y-2 list-decimal list-inside leading-relaxed">
              <li>Acesse o <strong>Google AI Studio</strong> (aistudio.google.com).</li>
              <li>Faça login com sua conta do Google.</li>
              <li>Clique no botão azul <strong>"Get API key"</strong> no menu lateral.</li>
              <li>Clique em <strong>"Create API key"</strong> em um novo projeto.</li>
              <li>Copie a chave que começa com <code className="bg-theme-surface px-1.5 py-0.5 rounded text-theme-text">AIzaSy...</code> e cole aqui.</li>
            </ol>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
              💡 A cota gratuita oferece até 1.500 requisições por dia sem custo.
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setShowGeminiTutorial(false)}>
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
