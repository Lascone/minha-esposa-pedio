import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Check,
  RefreshCw,
  Sliders,
  ExternalLink,
  Laptop,
  Code,
  Save,
  Zap,
  Info,
  Copy,
  Lightbulb,
  Image as ImageIcon,
  Paperclip,
  Trash2,
} from "lucide-react";
import { CustomWidgetPackage, AiChatMessage } from "./types";
import { useCustomWidgetsStore } from "./customWidgetsStore";
import { useWidgetsStore } from "../store/widgetsStore";
import { useAiStore, GEMINI_AVAILABLE_MODELS } from "@/core/stores/aiStore";
import { generateOrModifyCustomWidget } from "@/core/services/aiService";
import { WidgetSandbox } from "./WidgetSandbox";
import { WidgetTheme } from "../types";
import { useToast } from "@/core/components/Toast";

interface CustomWidgetAiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: CustomWidgetPackage;
  onSavedAndAdded?: (pkg: CustomWidgetPackage) => void;
  onOpenCodeEditor?: (pkg: CustomWidgetPackage) => void;
}

export interface BrainIdea {
  id: string;
  icon: string;
  title: string;
  desc: string;
  prompt: string;
}

export const BRAIN_IDEAS: BrainIdea[] = [
  {
    id: "analog-clock-kawaii",
    icon: "🌸",
    title: "Relógio Analógico Kawaii",
    desc: "Mostrador circular pastel, ponteiros suaves e partículas fofas",
    prompt: "Crie um Relógio Analógico Kawaii super fofo com mostrador circular em vidro fosco pastel (lilás e rosa), ponteiros de horas e minutos bem definidos com cantos arredondados, segundos correndo suavemente e data por extenso em português. Código JS defensivo esperando o DOM carregar.",
  },
  {
    id: "digital-clock-quote",
    icon: "⏰",
    title: "Relógio Digital & Frase",
    desc: "Horário grande, segundos e frase de amor do dia",
    prompt: "Crie um Relógio Digital Fofo em rosa pastel com hora e minutos em fonte bem legível, segundos discretos, dia da semana em português e um espaço com frases carinhosas de amor que mudam a cada clique.",
  },
  {
    id: "pet-virtual",
    icon: "🐱",
    title: "Gatinho / Pet Virtual",
    desc: "Mascote fofo animado que dá carinho ao clicar",
    prompt: "Crie um Pet Virtual Fofo com um gatinho animado na tela, efeito de corações e confetes ao receber carinho (clique) e balõezinhos de falas carinhosas e motivacionais para alegrar o dia.",
  },
  {
    id: "water-tracker",
    icon: "💧",
    title: "Lembrete de Água",
    desc: "8 copinhos clicáveis para marcar a hidratação diária",
    prompt: "Crie um Contador de Hidratação Fofo com 8 copinhos de água clicáveis para marcar a meta diária, barra de progresso colorida e salvamento automático usando WidgetAPI.setConfig.",
  },
  {
    id: "sticky-notes-love",
    icon: "📝",
    title: "Post-it com Corações",
    desc: "Bloco de recados fofo com salvamento instantâneo",
    prompt: "Crie um Bloco de Notas (Post-it) super charmoso estilo papel pastel com coraçõezinhos decorativos, textarea para recados rápidos e salvamento automático instantâneo com WidgetAPI.setConfig.",
  },
  {
    id: "photo-gif-frame",
    icon: "🖼️",
    title: "Porta-Retrato Polaroid",
    desc: "Moldura fofa para fotos ou GIFs animados",
    prompt: "Crie um Porta-Retrato Polaroid Fofo com moldura branca texturizada, fita adesiva washi tape rosa no topo, legenda delicada e espaço central perfeito para exibir GIFs ou imagens com ajuste cover.",
  },
];

const QUICK_SUGGESTIONS = [
  "🌸 Relógio digital rosa com data por extenso e emojis fofos",
  "💧 Contador diário de copos de água com botões de + e -",
  "📝 Lista de afazeres mini com caixas de seleção e confetes",
  "💖 Contador de dias juntos com corações flutuantes e frase carinhosa",
  "🐾 Frases motivacionais fofas que mudam com um clique",
  "☕ Mini temporizador de pausa para café de 15 minutos",
];

export const CustomWidgetAiChatModal: React.FC<CustomWidgetAiChatModalProps> = ({
  isOpen,
  onClose,
  initialPackage,
  onSavedAndAdded,
  onOpenCodeEditor,
}) => {
  const {
    activeProvider,
    groqApiKey,
    groqModel,
    setGroqModel,
    geminiApiKey,
    geminiModel,
    setGeminiModel,
  } = useAiStore();
  const savePackage = useCustomWidgetsStore((s) => s.savePackage);
  const addWidget = useWidgetsStore((s) => s.addWidget);
  const { addToast } = useToast();

  const [currentPackage, setCurrentPackage] = useState<CustomWidgetPackage | null>(initialPackage || null);
  const [previewWallpaper, setPreviewWallpaper] = useState<"grid" | "pink" | "aero" | "dark">("grid");
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    if (initialPackage?.chatHistory && initialPackage.chatHistory.length > 0) {
      return initialPackage.chatHistory;
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: initialPackage
          ? `Olá! Estou pronta para aprimorar o gadget "${initialPackage.manifest.name}". O que você gostaria de mudar ou adicionar nele? 💖`
          : "Oi! Sou seu assistente de criação de gadgets. Me diga como você quer o seu novo gadget (ex: 'Um relógio lilás com cantos arredondados e frase do dia') e eu crio para você na hora! ✨",
        timestamp: Date.now(),
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<WidgetTheme>("cute-pastel");
  const [previewKey, setPreviewKey] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showBrainModal, setShowBrainModal] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [currentLiveError, setCurrentLiveError] = useState<string | null>(null);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Se mudar o initialPackage externo, recarrega
  useEffect(() => {
    if (initialPackage) {
      setCurrentPackage(initialPackage);
      if (initialPackage.chatHistory && initialPackage.chatHistory.length > 0) {
        setMessages(initialPackage.chatHistory);
      }
    }
  }, [initialPackage]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("A imagem deve ter menos de 5MB.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAttachedImage(dataUrl);
      addToast("Imagem anexada! A IA analisará o visual para gerar seu gadget 📸✨", "sparkle");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            setAttachedImage(loadEvent.target?.result as string);
            addToast("Imagem colada! A IA observará os detalhes visuais 📸✨", "sparkle");
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  if (!isOpen) return null;

  const hasApiKey = activeProvider === "groq" ? !!groqApiKey : !!geminiApiKey;

  const handleSendMessage = async (textToSend?: string, errorContext?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && !attachedImage) || isGenerating) return;

    if (!hasApiKey) {
      addToast(
        `Configure sua chave do ${activeProvider === "groq" ? "Groq" : "Gemini"} na aba IAs para continuar!`,
        "warning"
      );
      return;
    }

    const imageToSend = attachedImage;
    const errToSend = errorContext || currentLiveError;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text || "Crie um gadget inspirado na imagem anexada!",
      imageUrl: imageToSend || undefined,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setAttachedImage(null);
    setCurrentLiveError(null);
    setIsGenerating(true);

    try {
      const result = await generateOrModifyCustomWidget({
        userMessage: text || "Crie um gadget inspirado na imagem anexada",
        currentPackage: currentPackage || undefined,
        chatHistory: newMessages,
        options: {
          attachedImageBase64: imageToSend || undefined,
          currentError: errToSend || undefined,
          currentWidgetPreview: currentPackage
            ? {
                html: currentPackage.html,
                css: currentPackage.css,
                js: currentPackage.js,
                name: currentPackage.manifest.name,
              }
            : undefined,
        },
      });

      const updatedPkg: CustomWidgetPackage = {
        manifest: result.package.manifest,
        html: result.package.html,
        css: result.package.css,
        js: result.package.js,
        createdAt: currentPackage?.createdAt || Date.now(),
        updatedAt: Date.now(),
        chatHistory: [
          ...newMessages,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: result.assistantReply,
            timestamp: Date.now(),
          },
        ],
      };

      setCurrentPackage(updatedPkg);
      setMessages(updatedPkg.chatHistory || []);
      setHasUnsavedChanges(true);
      setPreviewKey((k) => k + 1);
      addToast("Gadget atualizado no preview ao vivo! ✨", "sparkle");
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Ops, tive um problema ao criar: ${err.message || "Tente novamente ou verifique sua conexão."} 🥺`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndAdd = () => {
    if (!currentPackage) return;

    const pkgToSave: CustomWidgetPackage = {
      ...currentPackage,
      chatHistory: messages,
      updatedAt: Date.now(),
    };

    savePackage(pkgToSave);
    addWidget(pkgToSave.manifest.id as any);
    addToast(`"${pkgToSave.manifest.name}" adicionado à Área de Trabalho! 🚀`, "success");
    setHasUnsavedChanges(false);

    if (onSavedAndAdded) {
      onSavedAndAdded(pkgToSave);
    }
    onClose();
  };

  const handleOnlySave = () => {
    if (!currentPackage) return;
    const pkgToSave: CustomWidgetPackage = {
      ...currentPackage,
      chatHistory: messages,
      updatedAt: Date.now(),
    };
    savePackage(pkgToSave);
    setHasUnsavedChanges(false);
    addToast(`"${pkgToSave.manifest.name}" salvo com sucesso!`, "sparkle");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-theme-bg border border-theme-border rounded-cuter shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border/80 flex items-center justify-between bg-theme-surface/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center text-xl shadow-soft">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-theme-text">
                  {currentPackage ? `Modificando: ${currentPackage.manifest.name}` : "Estúdio de Gadgets com IA"}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                  {currentPackage ? "Modo Refinamento" : "Novo Gadget"}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted mt-0.5">
                Peça o que quiser no chat à esquerda e veja a mágica acontecer ao vivo na direita.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Model Selector */}
            {activeProvider === "groq" ? (
              <div className="flex items-center gap-1.5 bg-theme-surface-card border border-theme-border rounded-xl px-2.5 py-1 text-xs">
                <Zap size={13} className="text-orange-400" />
                <select
                  value={groqModel}
                  onChange={(e) => {
                    setGroqModel(e.target.value);
                    addToast(`Modelo alterado para ${e.target.value}! ⚡`, "sparkle");
                  }}
                  className="bg-transparent text-xs text-theme-text font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="openai/gpt-oss-120b">GPT-OSS 120B 🧠</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B ⚡</option>
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B ✨</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-theme-surface-card border border-theme-border rounded-xl px-2.5 py-1 text-xs">
                <Sparkles size={13} className="text-blue-400" />
                <select
                  value={geminiModel}
                  onChange={(e) => {
                    setGeminiModel(e.target.value);
                    addToast(`Modelo Gemini alterado para ${e.target.value}! 🌟`, "sparkle");
                  }}
                  className="bg-transparent text-xs text-theme-text font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="gemini-flash-latest">Gemini Flash Latest ⚡</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro 👑 (Pro)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash 🚀</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash 🌟</option>
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text flex items-center justify-center transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alerta se não houver chave */}
        {!hasApiKey && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
            <span className="flex items-center gap-2 font-medium">
              <Info size={15} className="text-amber-400 shrink-0" />
              Você ainda não configurou uma chave gratuita de IA ({activeProvider === "groq" ? "Groq" : "Gemini"}).
            </span>
            <a
              href="#/ai"
              onClick={onClose}
              className="font-bold underline hover:text-white flex items-center gap-1"
            >
              Configurar na aba IAs <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Body Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* LADO ESQUERDO: CHAT INTERATIVO (5 Colunas em telas grandes) */}
          <div className="lg:col-span-5 border-r border-theme-border/80 flex flex-col h-full bg-theme-surface/30 min-h-0">
            {/* Top Toolbar do Chat: Brain Ideas & Ações */}
            <div className="px-4 py-2 border-b border-theme-border/60 bg-theme-surface/40 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowBrainModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 border border-amber-500/35 text-amber-200 text-[11px] font-bold transition-all shadow-soft active:scale-95"
              >
                <Lightbulb size={13} className="text-amber-400 animate-pulse" />
                <span>💡 Ideias Fofas (Brain de Gadgets)</span>
              </button>

              <span className="text-[10px] text-theme-text-muted">
                {currentPackage ? `Versão ${currentPackage.manifest.version || "1.0.0"}` : "Novo Projeto"}
              </span>
            </div>

            {/* Mensagens do Chat */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[92%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.role === "user"
                        ? "bg-gradient-to-tr from-pink-500 to-rose-400 text-white"
                        : "bg-theme-surface-card border border-theme-border text-pink-400"
                    }`}
                  >
                    {msg.role === "user" ? <User size={13} /> : <Bot size={14} />}
                  </div>

                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-theme-primary text-white rounded-tr-none shadow-soft"
                        : "bg-theme-surface-card border border-theme-border text-theme-text rounded-tl-none shadow-soft"
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={msg.imageUrl}
                          alt="Referência visual enviada"
                          className="max-w-[200px] max-h-[160px] object-cover rounded-xl border border-white/20 shadow-sm"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] opacity-60 mt-1 block text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}

              {isGenerating && (
                <div className="flex gap-2.5 max-w-[85%] mr-auto animate-pulse">
                  <div className="w-7 h-7 rounded-xl bg-theme-surface-card border border-theme-border text-pink-400 flex items-center justify-center text-xs">
                    <Sparkles size={14} className="animate-spin text-pink-400" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none bg-theme-surface-card border border-pink-500/30 text-xs text-theme-text flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-bounce" />
                    <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-bounce delay-150" />
                    <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-bounce delay-300" />
                    <span className="text-theme-text-muted ml-1">Criando seu gadget com carinho...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sugestões Rápidas (Chips) */}
            {messages.length <= 2 && (
              <div className="p-3 border-t border-theme-border/60 bg-theme-surface/50">
                <span className="text-[11px] font-bold text-theme-text-muted block mb-2">
                  Ideias rápidas para começar:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {QUICK_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleSendMessage(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text transition-all text-left truncate max-w-full hover:border-pink-500/40"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Área com suporte a Anexo e Colar Imagem */}
            <div className="p-3.5 border-t border-theme-border/80 bg-theme-surface/60 shrink-0">
              {attachedImage && (
                <div className="flex items-center gap-2 mb-2 p-1.5 rounded-xl bg-pink-500/10 border border-pink-500/30 w-fit animate-in fade-in">
                  <img
                    src={attachedImage}
                    alt="Prévia do anexo"
                    className="w-12 h-12 object-cover rounded-lg border border-pink-500/40 shadow-soft"
                  />
                  <div className="text-[11px] text-pink-300 pr-1">
                    <span className="font-bold block">Foto / Print Anexado 🖼️</span>
                    <span className="text-[10px] text-theme-text-muted">A IA analisará o visual para o widget</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Remover anexo"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="relative flex items-end gap-2 bg-theme-surface border border-theme-border rounded-2xl p-2 focus-within:border-pink-500/60 shadow-soft">
                {/* Input de arquivo invisível */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="p-2 rounded-xl bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text-muted hover:text-pink-400 transition-all shadow-soft shrink-0"
                  title="Anexar print ou foto de referência (ou cole com Ctrl+V)"
                >
                  <ImageIcon size={15} />
                </button>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  disabled={isGenerating}
                  placeholder="Peça o que quiser ou cole uma foto de referência com Ctrl+V..."
                  rows={2}
                  className="w-full bg-transparent text-xs text-theme-text placeholder:text-theme-text-muted/60 focus:outline-none resize-none p-1 scrollbar-none"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={(!inputText.trim() && !attachedImage) || isGenerating}
                  className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-soft shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-theme-text-muted px-1 mt-2">
                <span>Enter para enviar • Shift+Enter para quebra de linha</span>
                {currentPackage && (
                  <button
                    onClick={() => {
                      if (confirm("Deseja reiniciar a conversa com a IA para este gadget?")) {
                        setMessages([
                          {
                            id: `init-${Date.now()}`,
                            role: "assistant",
                            content: `Histórico reiniciado. O que você gostaria de modificar em "${currentPackage.manifest.name}"? 💖`,
                            timestamp: Date.now(),
                          },
                        ]);
                      }
                    }}
                    className="hover:text-rose-400 underline"
                  >
                    Limpar chat
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LADO DIREITO: LIVE PREVIEW EM TEMPO REAL (7 Colunas em telas grandes) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-gradient-to-b from-theme-bg to-theme-surface/40 min-h-0">
            {/* Toolbar do Preview */}
            <div className="p-3.5 border-b border-theme-border/80 flex items-center justify-between bg-theme-surface/40 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-theme-text">
                  <Laptop size={14} className="text-pink-400" />
                  Live do Desktop
                </span>
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ao Vivo
                </span>
              </div>

              {/* Theme & Wallpaper Switcher no Preview */}
              <div className="flex items-center gap-2">
                <select
                  value={previewWallpaper}
                  onChange={(e) => setPreviewWallpaper(e.target.value as any)}
                  className="bg-theme-surface border border-theme-border rounded-xl px-2.5 py-1 text-xs text-theme-text focus:outline-none"
                  title="Fundo do Desktop simulado"
                >
                  <option value="grid">Grid Minimalista</option>
                  <option value="pink">Wallpaper Pastel 🌸</option>
                  <option value="aero">Wallpaper Aero 🪟</option>
                  <option value="dark">Desktop Dark 🌙</option>
                </select>

                <select
                  value={previewTheme}
                  onChange={(e) => setPreviewTheme(e.target.value as WidgetTheme)}
                  className="bg-theme-surface border border-theme-border rounded-xl px-2.5 py-1 text-xs text-theme-text focus:outline-none"
                >
                  <option value="cute-pastel">Cute Pastel 🌸</option>
                  <option value="aero-glass">Aero Glass 🪟</option>
                  <option value="dark-modern">Dark Modern 🌙</option>
                  <option value="cyber-neon">Cyber Neon ⚡</option>
                </select>

                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1.5 rounded-xl bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text transition-all"
                  title="Recarregar Preview"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Container Central com Fundo de Simulação do Desktop */}
            <div className={`flex-1 p-6 flex items-center justify-center overflow-auto relative transition-all duration-300 ${
              previewWallpaper === "pink"
                ? "bg-gradient-to-br from-pink-950/60 via-purple-950/50 to-rose-950/60"
                : previewWallpaper === "aero"
                ? "bg-gradient-to-br from-sky-950/60 via-blue-950/50 to-indigo-950/60"
                : previewWallpaper === "dark"
                ? "bg-zinc-950"
                : "bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"
            }`}>
              {currentPackage ? (
                <div
                  key={previewKey}
                  className="relative transition-all duration-300 shadow-2xl rounded-cuter p-1 bg-white/5 border border-white/10 backdrop-blur-sm"
                  style={{
                    width: currentPackage.manifest.defaultWidth || 280,
                    height: currentPackage.manifest.defaultHeight || 180,
                  }}
                >
                  <WidgetSandbox
                    pkg={currentPackage}
                    theme={previewTheme}
                    onFixWithAi={(errMsg) => {
                      setCurrentLiveError(errMsg);
                      handleSendMessage(
                        `O widget gerou o seguinte erro no navegador: "${errMsg}". Por favor, reescreva o código JavaScript com segurança defensiva: espere o DOM carregar (DOMContentLoaded), verifique se todos os elementos e canvas existem antes de acessar (.style, .getContext, etc.) e garanta que o widget funcione perfeitamente sem erros!`,
                        errMsg
                      );
                    }}
                    className="w-full h-full rounded-2xl overflow-hidden"
                  />
                </div>
              ) : (
                <div className="text-center max-w-sm p-8 rounded-cuter border border-dashed border-theme-border/80 bg-theme-surface/20 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-2xl">
                    ✨
                  </div>
                  <h3 className="text-sm font-extrabold text-theme-text">Nenhum gadget gerado ainda</h3>
                  <p className="text-xs text-theme-text-muted leading-relaxed">
                    Envie uma mensagem no chat ao lado pedindo o gadget dos seus sonhos. Ele aparecerá aqui em tempo real!
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé de Ações do Preview */}
            <div className="p-4 border-t border-theme-border/80 bg-theme-surface/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {currentPackage && onOpenCodeEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCodeEditor(currentPackage);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-cute bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text text-xs font-semibold transition-all"
                  >
                    <Code size={13} />
                    <span>Ver Código Puro</span>
                  </button>
                )}

                {currentPackage && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(currentPackage, null, 2));
                      addToast("Pacote JSON copiado para a área de transferência! 📋", "sparkle");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-cute bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text text-xs font-semibold transition-all"
                    title="Copiar pacote completo em JSON"
                  >
                    <Copy size={13} />
                    <span>Copiar JSON</span>
                  </button>
                )}

                {currentPackage && (
                  <button
                    type="button"
                    onClick={handleOnlySave}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-cute bg-theme-surface-card hover:bg-theme-surface border border-theme-border text-theme-text text-xs font-semibold transition-all"
                  >
                    <Save size={13} />
                    <span>Apenas Salvar</span>
                  </button>
                )}
              </div>

              {/* Botão de Salvar & Adicionar ao Desktop */}
              <button
                type="button"
                onClick={handleSaveAndAdd}
                disabled={!currentPackage || isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-cute bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs shadow-soft transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={15} />
                <span>Salvar & Adicionar à Área de Trabalho</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Ideias & Inspirações do Brain */}
      {showBrainModal && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-theme-surface-card border border-theme-border rounded-cuter p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 text-white flex items-center justify-center text-xl shadow-soft">
                  💡
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-theme-text flex items-center gap-2">
                    Ideias Fofas & Brain de Gadgets
                  </h3>
                  <p className="text-xs text-theme-text-muted">
                    Selecione qualquer uma das ideias testadas para a IA gerar de primeira sem erros!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBrainModal(false)}
                className="w-8 h-8 rounded-xl bg-theme-surface hover:bg-theme-surface-card border border-theme-border text-theme-text-muted hover:text-theme-text flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BRAIN_IDEAS.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => {
                    setShowBrainModal(false);
                    handleSendMessage(idea.prompt);
                  }}
                  className="p-4 rounded-2xl bg-theme-surface/70 hover:bg-theme-surface border border-theme-border/80 hover:border-pink-500/50 cursor-pointer transition-all duration-200 group flex flex-col justify-between shadow-soft hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                      {idea.icon}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-theme-text group-hover:text-pink-400 transition-colors">
                        {idea.title}
                      </h4>
                      <p className="text-[11px] text-theme-text-muted mt-1 leading-snug">
                        {idea.desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-theme-border/40 flex items-center justify-between text-[11px] font-bold text-pink-400 group-hover:text-pink-300">
                    <span>Criar este gadget</span>
                    <Sparkles size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-xs text-theme-text-muted text-center">
              💕 <em>Dica: Você pode pedir para a IA alterar qualquer cor, adicionar seu nome, fotos ou GIFs depois que o gadget for gerado!</em>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
