import React, { useState } from "react";
import {
  Music,
  Youtube,
  Mail,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  Globe,
  Radio,
  Save,
  Trash2,
} from "lucide-react";
import { useIntegrationsStore } from "../stores/integrationsStore";
import { ServiceProvider } from "../services/mediaIntegrationsService";
import { useToast } from "../components/Toast";

export const IntegrationsManagerCard: React.FC = () => {
  const {
    accounts,
    isConnecting,
    connectAccount,
    disconnectAccount,
    setActiveMediaSource,
    activeMediaSource,
  } = useIntegrationsStore();

  const { addToast } = useToast();

  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [customInput, setCustomInput] = useState("");

  const servicesList: {
    id: ServiceProvider;
    name: string;
    category: "Música & Streaming" | "Produtividade & E-mail";
    icon: React.ReactNode;
    color: string;
    description: string;
    placeholder: string;
    webUrl: string;
  }[] = [
    {
      id: "spotify",
      name: "Spotify",
      category: "Música & Streaming",
      icon: <Music size={18} className="text-emerald-400" />,
      color: "emerald",
      description: "Acesse suas playlists e músicas diretamente pelo Firefox ou pelo widget embutido.",
      placeholder: "Cole o link da sua Playlist do Spotify (ex: https://open.spotify.com/playlist/...)",
      webUrl: "https://open.spotify.com",
    },
    {
      id: "youtube-music",
      name: "YouTube Music",
      category: "Música & Streaming",
      icon: <Radio size={18} className="text-rose-400" />,
      color: "rose",
      description: "Ouça suas músicas e rádios favoritas no YouTube Music pelo navegador.",
      placeholder: "Cole o link do YouTube Music ou de uma rádio/playlist",
      webUrl: "https://music.youtube.com",
    },
    {
      id: "youtube",
      name: "YouTube Geral & Vídeos",
      category: "Música & Streaming",
      icon: <Youtube size={18} className="text-red-500" />,
      color: "red",
      description: "Acompanhe vídeos, transmissões ao vivo (como Lofi Girl) ou playlists no player desktop.",
      placeholder: "Cole o link do vídeo ou canal do YouTube",
      webUrl: "https://youtube.com",
    },
    {
      id: "gmail",
      name: "Gmail / Google",
      category: "Produtividade & E-mail",
      icon: <Mail size={18} className="text-amber-400" />,
      color: "amber",
      description: "Acesso rápido e direto à sua caixa de entrada oficial no Firefox.",
      placeholder: "Digite seu e-mail (ex: meuemail@gmail.com)",
      webUrl: "https://mail.google.com",
    },
  ];

  const handleSaveCustom = async (provider: ServiceProvider) => {
    if (!customInput.trim()) {
      addToast("Digite um link ou nome válido.", "warning");
      return;
    }
    await connectAccount(provider, customInput.trim());
    setEditingProvider(null);
    setCustomInput("");
    addToast("Configuração salva com sucesso! ✨", "sparkle");
  };

  const handleOpenBrowser = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-pink-500/10 to-purple-500/15 border border-orange-500/30 flex items-start gap-3">
        <Globe size={22} className="text-orange-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-white flex items-center gap-1.5">
            Integração Real e Segura via Mozilla Firefox & Links Pessoais (Sem Tokens)
          </p>
          <p className="text-white/70 leading-relaxed">
            Nada de contas falsas ou tokens complicados de desenvolvedor. Você pode colar o link direto da sua
            playlist pessoal, rádio ou canal favorito, ou abrir diretamente no <strong>Mozilla Firefox</strong> onde
            você já está conectada.
          </p>
        </div>
      </div>

      {/* Services Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servicesList.map((svc) => {
          const account = accounts[svc.id];
          const isConnected = account?.connected;
          const isEditing = editingProvider === svc.id;

          return (
            <div
              key={svc.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isConnected
                  ? "bg-slate-900/90 border-theme-primary/40 shadow-lg"
                  : "bg-slate-900/40 border-white/10"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {svc.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{svc.name}</h4>
                    <span className="text-[10px] text-white/50">{svc.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 size={11} /> Configurado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      <XCircle size={11} /> Não Configurado
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-white/60 leading-relaxed">
                {svc.description}
              </p>

              {/* Show saved link or account info if connected */}
              {isConnected && !isEditing && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-emerald-300 text-[10px] truncate">
                      {account.username}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnectAccount(svc.id)}
                    className="text-white/40 hover:text-rose-400 p-1 transition-colors"
                    title="Remover configuração"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {/* Inline input to set custom link / playlist */}
              {isEditing ? (
                <div className="flex flex-col gap-2 p-2 rounded-xl bg-black/40 border border-theme-primary/40">
                  <input
                    type="text"
                    placeholder={svc.placeholder}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="w-full bg-transparent px-2 py-1 text-xs text-white placeholder-white/40 outline-none font-mono border-b border-white/10"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingProvider(null)}
                      className="px-2 py-0.5 rounded-lg text-[10px] text-white/60 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveCustom(svc.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-primary text-white text-[10px] font-bold shadow-sm"
                    >
                      <Save size={11} /> Salvar Link
                    </button>
                  </div>
                </div>
              ) : (
                /* Action buttons */
                <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                  <button
                    onClick={() => handleOpenBrowser(svc.webUrl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold transition-colors"
                    title={`Abrir ${svc.name} no Firefox`}
                  >
                    <ExternalLink size={12} />
                    <span>Abrir no Firefox</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingProvider(svc.id);
                      setCustomInput(isConnected ? account.username : "");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary border border-theme-primary/30 text-[11px] font-bold transition-colors"
                  >
                    <Sparkles size={11} />
                    <span>{isConnected ? "Alterar Link" : "Configurar Link"}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
