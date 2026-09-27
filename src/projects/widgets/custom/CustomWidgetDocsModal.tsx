import React, { useState } from "react";
import { X, BookOpen, Code, Copy, Check, ShieldCheck, Cpu, Sparkles, Wand2, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { buildCustomWidgetAiPrompt } from "./aiPrompt";

interface CustomWidgetDocsModalProps {
  onClose: () => void;
  onOpenEditor?: () => void;
}

export const CustomWidgetDocsModal: React.FC<CustomWidgetDocsModalProps> = ({ onClose, onOpenEditor }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiWish, setAiWish] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyError(null);
      setCopiedSection(id);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      setCopyError("Não consegui copiar automaticamente. Tente de novo ou selecione o texto manualmente.");
    }
  };

  const handleCopyAiPrompt = () => {
    if (!aiWish.trim()) return;
    handleCopy(
      buildCustomWidgetAiPrompt({ description: aiWish, backgroundImageUrl: aiImageUrl }),
      "ai-prompt"
    );
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
          {/* Section: Create with AI (no code) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-sky-500/10 border border-pink-400/40 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-pink-200 flex items-center gap-1.5">
                <Wand2 size={16} /> Não sabe programar? Crie com uma IA!
              </h3>
              {!aiPanelOpen && (
                <button
                  onClick={() => setAiPanelOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-[11px] shadow-md shadow-pink-500/25 active:scale-95 transition-all"
                >
                  <Copy size={13} />
                  <span>Copiar prompt para IA</span>
                </button>
              )}
            </div>

            {aiPanelOpen ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="font-bold text-white/90 text-[12px]">💭 O que eu quero</label>
                  <textarea
                    value={aiWish}
                    onChange={(e) => setAiWish(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="Ex.: Quero um relógio estilo mangá, com letras grandes brancas e contorno preto, mostrando o dia da semana e uma frase fofa embaixo."
                    className="w-full p-3 rounded-xl bg-black/40 border border-white/15 focus:border-pink-400/70 text-white placeholder:text-white/35 text-[12px] leading-relaxed resize-y outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white/90 text-[12px] flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-sky-300" /> Link da imagem de fundo <span className="font-normal text-white/50">(opcional)</span>
                  </label>
                  <input
                    value={aiImageUrl}
                    onChange={(e) => setAiImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/minha-imagem.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 focus:border-sky-400/70 text-white placeholder:text-white/35 text-[12px] outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => setAiPanelOpen(false)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-[11px] transition-colors"
                  >
                    <ChevronLeft size={13} /> Voltar
                  </button>
                  <button
                    onClick={handleCopyAiPrompt}
                    disabled={!aiWish.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] shadow-md shadow-pink-500/25 active:scale-95 transition-all"
                  >
                    {copiedSection === "ai-prompt" ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedSection === "ai-prompt" ? "Prompt copiado! Agora cole na IA 💕" : "Copiar prompt completo"}</span>
                  </button>
                </div>
                {copyError && <p className="text-[11px] text-red-300">{copyError}</p>}
              </div>
            ) : (
              <p className="text-white/80 leading-relaxed">
                Você não precisa entender nada de código. Escreva o que quer, copie o prompt pronto e peça para qualquer IA fazer o widget por você.
              </p>
            )}

            <ol className="space-y-1.5 text-white/80 leading-relaxed list-none">
              <li><strong className="text-pink-300">1.</strong> Clique em <strong>Copiar prompt para IA</strong> e escreva em <strong>“O que eu quero”</strong> como você imagina o widget (cores, estilo, o que ele mostra). Se quiser, cole o link de uma imagem de fundo.</li>
              <li><strong className="text-pink-300">2.</strong> Clique em <strong>Copiar prompt completo</strong>. Já vai tudo junto: seu pedido e as regras técnicas que a IA precisa seguir.</li>
              <li><strong className="text-pink-300">3.</strong> Abra a IA que você usa (ChatGPT, Gemini, Claude, Copilot…), cole com <kbd className="px-1 rounded bg-white/15">Ctrl</kbd>+<kbd className="px-1 rounded bg-white/15">V</kbd> e envie.</li>
              <li><strong className="text-pink-300">4.</strong> Copie a resposta inteira da IA (um bloco que começa com <code>{"{"}</code> e termina com <code>{"}"}</code>).</li>
              <li><strong className="text-pink-300">5.</strong> Aqui no app, vá em <strong>Criar com Modelo</strong>, clique em <strong>Colar resposta da IA</strong>, cole e confira a prévia. Gostou? <strong>Salvar no Catálogo</strong>!</li>
            </ol>
            <p className="text-[11px] text-white/50">
              Deu erro ao colar? Peça para a IA: “responda só com o JSON válido, sem texto extra”.
            </p>

            {onOpenEditor && (
              <button
                onClick={onOpenEditor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors"
              >
                <Code size={13} /> Já tenho a resposta, abrir o criador
              </button>
            )}
          </div>

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
              {/* Media Integrations (Spotify, YouTube Music, YouTube) */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-500/20">
                <code className="text-emerald-300 font-bold">WidgetAPI.media.getCurrentTrack()</code>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Retorna a faixa atual tocando no Spotify ou YouTube Music: &#123; title, artist, albumArt, isPlaying, provider &#125;.
                </p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-500/20">
                <code className="text-emerald-300 font-bold">WidgetAPI.media.togglePlay() / nextTrack() / prevTrack()</code>
                <p className="text-[11px] text-white/60 mt-0.5">Controla a reprodução de mídia conectada.</p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-500/20">
                <code className="text-emerald-300 font-bold">WidgetAPI.media.onTrackChange((track) =&gt; &#123; ... &#125;)</code>
                <p className="text-[11px] text-white/60 mt-0.5">Ouve mudanças de música em tempo real.</p>
              </div>
              {/* Gmail Integration */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-amber-500/20">
                <code className="text-amber-300 font-bold">WidgetAPI.gmail.getSummary() / onSummaryChange(cb)</code>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Acessa o contador de e-mails não lidos e as mensagens mais recentes sincronizadas com o Gmail no Firefox.
                </p>
              </div>
              {/* SNES Console Skin API */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-purple-500/20">
                <code className="text-purple-300 font-bold">WidgetAPI.snes.getSkin() / onSkinChange(cb)</code>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Retorna ou ouve alterações na carcaça ativa do Mini Console SNES (ex.: Classic US, Super Famicom, Cute Pastel Sakura, Atomic Purple ou Dark Cyber).
                </p>
              </div>
            </div>
          </div>

          {/* Section: Prateleira de Atalhos e Firefox */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-amber-400/30 space-y-2">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              ⭐ Prateleira da Área de Trabalho & Login com Mozilla Firefox
            </h3>
            <p className="text-white/80 leading-relaxed">
              <strong>Como usar a Prateleira 3D:</strong> Adicione o widget <em>Prateleira da Área de Trabalho</em> na galeria. Arraste qualquer arquivo ou atalho (<code>.lnk</code>, <code>.url</code>, jogos ou pastas) do seu desktop diretamente para a madeira da prateleira. Ela suporta estéticas de Madeira Rústica, Carvalho Claro, Aero Glass e Cyber Neon, com decorações (gatinho dormindo, vasinho de planta, xícara de café) e redimensionamento livre!
            </p>
            <p className="text-white/70 leading-relaxed text-[11px]">
              <strong>Como conectar Spotify, YouTube e Gmail:</strong> Vá na aba de <em>Configurações → Contas & Integrações</em>. Ao clicar em conectar, o aplicativo abrirá seu navegador padrão (<strong>Mozilla Firefox</strong>). Autorize com sua conta normalmente no Firefox e o aplicativo capturará o login com segurança local.
            </p>
          </div>

          {/* Section: Widgets Específicos Personalizados (Spotify & YouTube) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-pink-500/10 border border-emerald-400/30 space-y-2.5">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              🎵 Widgets Específicos Personalizados (Spotify & YouTube)
            </h3>
            <p className="text-white/80 leading-relaxed text-xs">
              <strong>Zero Tokens ou Chaves de API complicadas:</strong> Os widgets de Spotify e YouTube foram feitos para você simplesmente usar! Você não precisa criar conta de desenvolvedor, pegar tokens ou mexer em códigos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-white/70">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <strong className="text-emerald-400 block mb-0.5">🟢 Spotify Desktop:</strong>
                Basta clicar no botão para abrir o navegador (Mozilla Firefox) e fazer login na sua conta normal do Spotify, ou colar o link de qualquer playlist sua. O widget sincroniza faixas, capa de álbum e controles de reprodução automaticamente.
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <strong className="text-red-400 block mb-0.5">🔴 YouTube & YouTube Music:</strong>
                Pesquise músicas ou cole o link de qualquer vídeo/live do YouTube. Toca diretamente na janelinha compacta na sua área de trabalho sem necessidade de login obrigatório.
              </div>
            </div>
            <p className="text-white/60 text-[10px] italic">
              💡 No catálogo de widgets, escolha Spotify, YouTube, YouTube Music ou a Prateleira 3D e altere as opções ao seu gosto! Vamos adicionar mais opções com o tempo.
            </p>
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
