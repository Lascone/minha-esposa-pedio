import React, { useState } from "react";
import { X, BookOpen, Code, Copy, Check, ShieldCheck, Cpu, Sparkles } from "lucide-react";

interface CustomWidgetDocsModalProps {
  onClose: () => void;
}

export const CustomWidgetDocsModal: React.FC<CustomWidgetDocsModalProps> = ({ onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sampleManifest = `{
  "id": "meu-relogio-personalizado",
  "name": "Meu Relógio Elegante",
  "version": "1.0.0",
  "author": "Seu Nome",
  "description": "Um relógio minimalista e elegante criado por você.",
  "category": "time",
  "icon": "⏰",
  "entry": "index.html",
  "defaultWidth": 260,
  "defaultHeight": 160,
  "minWidth": 200,
  "minHeight": 120,
  "resizable": true,
  "permissions": ["storage", "theme"],
  "tags": ["relógio", "tempo", "meu-widget"]
}`;

  const sampleHtml = `<div class="card">
  <div id="relogio" class="relogio">00:00:00</div>
  <div id="data" class="data">Carregando...</div>
</div>`;

  const sampleCss = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  user-select: none;
}
.card {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.relogio {
  font-size: 32px;
  font-weight: 900;
  font-family: monospace;
  color: #38bdf8;
  text-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
}
.data {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}`;

  const sampleJs = `function atualizar() {
  const agora = new Date();
  document.getElementById("relogio").textContent = agora.toLocaleTimeString("pt-BR");
  document.getElementById("data").textContent = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short"
  });
}

// Inicializa e agenda a cada 1 segundo
atualizar();
setInterval(atualizar, 1000);

// Notifica o aplicativo que o widget carregou perfeitamente
WidgetAPI.emitReady();`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-pink-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Como Criar Seu Widget Personalizado <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-xs text-white/60">
                Guia completo de arquitetura, ciclo de vida e formato de pacote.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-6 text-xs custom-scrollbar">
          {/* Section: Overview */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <h3 className="text-sm font-bold text-pink-300 flex items-center gap-1.5">
              <Cpu size={16} /> 1. Arquitetura e Isolamento Seguro
            </h3>
            <p className="text-white/80 leading-relaxed">
              Todos os widgets personalizados rodam em um <strong>sandbox isolado (iframe seguro)</strong> sem acesso ao Node.js, comandos do Windows ou IPC genérico. A comunicação com o aplicativo é realizada exclusivamente através da ponte oficial e segura <code>WidgetAPI</code>.
            </p>
          </div>

          {/* Section: Package Structure */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-1.5">
              <Code size={16} /> 2. Estrutura de Arquivos do Pacote
            </h3>
            <p className="text-white/80 leading-relaxed">
              Um pacote de widget é composto por arquivos web padronizados:
            </p>
            <div className="bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-pink-200 space-y-1">
              <div>📦 meu-widget/</div>
              <div className="pl-4">├── 📄 <strong>manifest.json</strong> <span className="text-white/50">(Identificação, permissões e dimensões)</span></div>
              <div className="pl-4">├── 🌐 <strong>index.html</strong> <span className="text-white/50">(Estrutura do widget)</span></div>
              <div className="pl-4">├── 🎨 <strong>style.css</strong> <span className="text-white/50">(Estilos, temas e animações)</span></div>
              <div className="pl-4">├── ⚡ <strong>widget.js</strong> <span className="text-white/50">(Lógica e atualização periódica)</span></div>
              <div className="pl-4">└── 📁 <strong>assets/</strong> <span className="text-white/50">(Imagens e ícones opcionais)</span></div>
            </div>
          </div>

          {/* Section: Manifest Spec */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300">
                3. Manifesto (manifest.json)
              </h3>
              <button
                onClick={() => handleCopy(sampleManifest, "manifest")}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/80 text-[10px]"
              >
                {copiedSection === "manifest" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>Copiar Manifesto</span>
              </button>
            </div>
            <pre className="bg-black/50 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-300 overflow-x-auto">
              {sampleManifest}
            </pre>
          </div>

          {/* Section: Safe WidgetAPI */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck size={16} /> 4. Métodos da WidgetAPI Disponíveis
            </h3>
            <div className="space-y-2 text-white/80">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <code className="text-pink-300 font-bold">WidgetAPI.getConfig(key, defaultValue)</code>
                <p className="text-[11px] text-white/60 mt-0.5">Lê uma configuração ou preferência salva pelo usuário.</p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <code className="text-pink-300 font-bold">WidgetAPI.setConfig(key, value)</code>
                <p className="text-[11px] text-white/60 mt-0.5">Persiste uma preferência de forma segura no armazenamento local.</p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <code className="text-pink-300 font-bold">WidgetAPI.requestResize(width, height)</code>
                <p className="text-[11px] text-white/60 mt-0.5">Solicita ao aplicativo redimensionar a janela do gadget.</p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <code className="text-pink-300 font-bold">WidgetAPI.getTheme()</code>
                <p className="text-[11px] text-white/60 mt-0.5">Retorna o tema atual (ex: 'aero-glass', 'cute-pastel', 'cyber-neon').</p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <code className="text-pink-300 font-bold">WidgetAPI.onThemeChange((newTheme) =&gt; &#123; ... &#125;)</code>
                <p className="text-[11px] text-white/60 mt-0.5">Ouve alterações de tema feitas pelo usuário nas configurações.</p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <code className="text-pink-300 font-bold">WidgetAPI.emitReady()</code>
                <p className="text-[11px] text-white/60 mt-0.5">Informa que o widget terminou de carregar e está pronto.</p>
              </div>
            </div>
          </div>

          {/* Section: Complete Relógio Example */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-rose-300">
              5. Exemplo Completo de Relógio Personalizado
            </h3>
            <p className="text-white/80">
              Copie este exemplo ou use o modelo pronto no editor para criar seu primeiro widget em menos de 1 minuto!
            </p>

            <div className="space-y-2">
              <span className="font-bold text-white/70">JavaScript (widget.js):</span>
              <pre className="bg-black/50 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-sky-300 overflow-x-auto">
                {sampleJs}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md transition-colors"
          >
            Entendi, quero criar meu widget!
          </button>
        </div>
      </div>
    </div>
  );
};
