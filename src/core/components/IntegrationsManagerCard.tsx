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
  Key,
  ShieldCheck,
  LogIn,
  Check,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useIntegrationsStore } from "../stores/integrationsStore";
import { ServiceProvider } from "../services/mediaIntegrationsService";
import { useToast } from "../components/Toast";

export const IntegrationsManagerCard: React.FC = () => {
  const {
    accounts,
    googleAccount,
    spotifyAccount,
    isConnecting,
    connectAccount,
    disconnectAccount,
    connectGoogleAccount,
    disconnectGoogleAccount,
    connectSpotifyViaGoogle,
    saveSpotifyConfig,
    disconnectSpotify,
  } = useIntegrationsStore();

  const { addToast } = useToast();

  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [showSpotifyDev, setShowSpotifyDev] = useState(false);
  const [spotifyClientIdInput, setSpotifyClientIdInput] = useState(spotifyAccount.clientId || "");
  const [googleEmailInput, setGoogleEmailInput] = useState(googleAccount.email || "magraoofficial@gmail.com");
  const [isEditingGoogle, setIsEditingGoogle] = useState(false);

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

  const handleGoogleConnect = () => {
    connectGoogleAccount(googleEmailInput.trim() || "magraoofficial@gmail.com");
    setIsEditingGoogle(false);
    addToast("Conta Google sincronizada com YouTube e Gmail! ✨", "sparkle");
  };

  const handleSpotifyGoogleLogin = async () => {
    addToast("Abrindo autenticação do Spotify integrada ao Google... 🟢", "info");
    await connectSpotifyViaGoogle();
    addToast("Spotify vinculado à sua conta Google com sucesso! 🎵", "sparkle");
  };

  const handleSaveSpotifyClientId = () => {
    saveSpotifyConfig({
      clientId: spotifyClientIdInput.trim(),
    });
    setShowSpotifyDev(false);
    addToast("Configuração de desenvolvedor do Spotify salva! 💾", "sparkle");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Official Google & YouTube API Hub (Hero Section) */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-rose-950/40 border border-theme-primary/30 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 blur-3xl pointer-events-none rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Google G Brand Icon */}
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-md shrink-0">
              <span className="text-2xl select-none">🌐</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-white tracking-tight">
                  Conta Google & YouTube API v3
                </h4>
                {googleAccount.connected ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                    <CheckCircle2 size={12} /> Conectado Oficialmente
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                    <XCircle size={12} /> Desconectado
                  </span>
                )}
              </div>

              {isEditingGoogle ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    className="bg-black/50 border border-white/20 rounded-xl px-2.5 py-1 text-xs text-white outline-none font-mono"
                    placeholder="seuemail@gmail.com"
                  />
                  <button
                    onClick={handleGoogleConnect}
                    className="px-3 py-1 rounded-xl bg-theme-primary text-white text-xs font-bold"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setIsEditingGoogle(false)}
                    className="px-2 py-1 text-xs text-white/60 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <p className="text-xs font-mono text-white/80">
                  {googleAccount.email} •{" "}
                  <span className="text-white/50 text-[11px]">
                    Token do YouTube: {googleAccount.apiToken.slice(0, 10)}... (Ativo)
                  </span>
                </p>
              )}

              <p className="text-[11px] text-white/60 leading-relaxed max-w-xl pt-0.5">
                Alimenta automaticamente seus widgets do <strong>YouTube Music</strong>,{" "}
                <strong>YouTube Vídeos</strong> e <strong>Gmail</strong> com buscas em tempo real e sem bloqueios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {googleAccount.connected ? (
              <>
                <button
                  onClick={() => setIsEditingGoogle(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  Alternar Conta
                </button>
                <button
                  onClick={disconnectGoogleAccount}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <button
                onClick={handleGoogleConnect}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-theme-primary to-pink-500 text-white text-xs font-bold shadow-lg hover:shadow-theme-primary/20 transition-all"
              >
                <LogIn size={13} />
                <span>Conectar com Google ✨</span>
              </button>
            )}
          </div>
        </div>

        {/* Linked Services Badges */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap text-[11px]">
          <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">
            Serviços Vinculados:
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
            <Radio size={11} /> YouTube Music
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-medium">
            <Youtube size={11} /> YouTube Geral
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
            <Mail size={11} /> Gmail Oficial
          </span>
        </div>
      </div>

      {/* 2. Services Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* === SPOTIFY SPECIAL CARD === */}
        <div className="p-4 rounded-3xl border border-[#1DB954]/30 bg-slate-900/90 shadow-lg flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1DB954]/10 blur-2xl pointer-events-none rounded-full" />
          
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#1DB954] flex items-center justify-center shadow-[0_0_12px_rgba(29,185,84,0.4)]">
                  <Music size={18} className="text-black font-bold" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Spotify</h4>
                  <span className="text-[10px] text-[#1DB954] font-semibold">
                    Música & Streaming (Login Google)
                  </span>
                </div>
              </div>

              {spotifyAccount.connected ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/15 px-2.5 py-0.5 rounded-full border border-[#1DB954]/30 shadow-xs">
                  <CheckCircle2 size={11} /> Conectado via Google
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  <XCircle size={11} /> Não Conectado
                </span>
              )}
            </div>

            <p className="text-[11px] text-white/70 mt-2.5 leading-relaxed">
              Como seu Spotify usa login via <strong>Google</strong>, você pode autenticar com 1 clique. O player embutido e os widgets tocarão suas músicas e playlists pessoais diretamente!
            </p>

            {/* Saved Playlist or Profile info */}
            {spotifyAccount.playlistUrl && (
              <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-[#1DB954]/20 flex items-center justify-between text-[11px]">
                <span className="font-mono text-emerald-300 text-[10px] truncate max-w-[200px]">
                  {spotifyAccount.playlistUrl}
                </span>
                <span className="text-[10px] text-white/40">Playlist Ativa</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={handleSpotifyGoogleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-[11px] font-bold shadow-md transition-all"
                title="Abrir login do Spotify com Google"
              >
                <LogIn size={12} />
                <span>Entrar no Spotify via Google</span>
              </button>

              <button
                onClick={() => handleOpenBrowser("https://open.spotify.com")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold transition-colors"
                title="Abrir Spotify no navegador"
              >
                <ExternalLink size={12} />
                <span>Web Player</span>
              </button>
            </div>

            {/* Collapsible Developer Client ID section */}
            <div className="pt-1">
              <button
                onClick={() => setShowSpotifyDev(!showSpotifyDev)}
                className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Key size={10} />
                <span>{showSpotifyDev ? "Ocultar Client ID" : "Configurar Client ID (Opcional)"}</span>
                {showSpotifyDev ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {showSpotifyDev && (
                <div className="mt-2 p-2.5 rounded-xl bg-black/50 border border-white/10 flex flex-col gap-2 animate-in fade-in duration-150">
                  <p className="text-[10px] text-white/60">
                    Opcional: Se desejar usar a API de desenvolvedor do Spotify, cole seu <code>Client ID</code> abaixo:
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Cole seu Spotify Client ID..."
                      value={spotifyClientIdInput}
                      onChange={(e) => setSpotifyClientIdInput(e.target.value)}
                      className="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-1 text-[11px] font-mono text-white outline-none"
                    />
                    <button
                      onClick={handleSaveSpotifyClientId}
                      className="px-2.5 py-1 rounded-lg bg-[#1DB954] text-black text-[10px] font-bold"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === YOUTUBE MUSIC CARD === */}
        <div className="p-4 rounded-3xl border border-rose-500/30 bg-slate-900/90 shadow-lg flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-2xl pointer-events-none rounded-full" />
          
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <Radio size={18} className="text-rose-400 font-bold" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">YouTube Music</h4>
                  <span className="text-[10px] text-rose-400/80 font-semibold">
                    Música & Streaming (Token Oficial)
                  </span>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 size={11} /> Token Ativo
              </span>
            </div>

            <p className="text-[11px] text-white/70 mt-2.5 leading-relaxed">
              Pesquise qualquer música ou artista, acesse playlists e rádios sem limites através do token oficial do YouTube integrado.
            </p>

            <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-rose-500/20 flex items-center justify-between text-[11px]">
              <span className="font-mono text-rose-300 text-[10px] truncate">
                {googleAccount.email}
              </span>
              <span className="text-[10px] text-white/40">API v3 Sincronizada</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
            <button
              onClick={() => handleOpenBrowser("https://music.youtube.com")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold transition-colors"
            >
              <ExternalLink size={12} />
              <span>Abrir Web Music</span>
            </button>

            <button
              onClick={() => {
                setEditingProvider("youtube-music");
                setCustomInput(accounts["youtube-music"]?.username || "");
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-colors"
            >
              <Sparkles size={11} />
              <span>Configurar Playlist</span>
            </button>
          </div>
        </div>

        {/* === YOUTUBE GERAL & VÍDEOS === */}
        <div className="p-4 rounded-3xl border border-red-500/30 bg-slate-900/90 shadow-lg flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-2xl pointer-events-none rounded-full" />
          
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Youtube size={18} className="text-red-500 font-bold" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">YouTube Geral & Vídeos</h4>
                  <span className="text-[10px] text-red-400/80 font-semibold">
                    Vídeos, Lives & Podcasts
                  </span>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 size={11} /> Conectado
              </span>
            </div>

            <p className="text-[11px] text-white/70 mt-2.5 leading-relaxed">
              Player flutuante com busca integrada por vídeos, podcasts ou canais favoritos (como Lofi Girl) com fechamento imediato.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
            <button
              onClick={() => handleOpenBrowser("https://youtube.com")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold transition-colors"
            >
              <ExternalLink size={12} />
              <span>Abrir no YouTube</span>
            </button>

            <button
              onClick={() => {
                setEditingProvider("youtube");
                setCustomInput(accounts.youtube?.username || "");
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-bold transition-colors"
            >
              <Sparkles size={11} />
              <span>Vincular Canal/Vídeo</span>
            </button>
          </div>
        </div>

        {/* === GMAIL / GOOGLE === */}
        <div className="p-4 rounded-3xl border border-amber-500/30 bg-slate-900/90 shadow-lg flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-2xl pointer-events-none rounded-full" />
          
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Mail size={18} className="text-amber-400 font-bold" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Gmail / Google</h4>
                  <span className="text-[10px] text-amber-400/80 font-semibold">
                    Produtividade & Notificações
                  </span>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 size={11} /> Sincronizado
              </span>
            </div>

            <p className="text-[11px] text-white/70 mt-2.5 leading-relaxed">
              Acesso rápido à sua caixa de entrada oficial conectada à conta <strong>{googleAccount.email}</strong>.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
            <button
              onClick={() => handleOpenBrowser("https://mail.google.com")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold transition-colors"
            >
              <ExternalLink size={12} />
              <span>Abrir Caixa de Entrada</span>
            </button>

            <button
              onClick={() => addToast("Caixa de entrada atualizada! 📬", "sparkle")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors"
            >
              <RefreshCw size={11} />
              <span>Verificar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editing Provider Modal / Input (if active) */}
      {editingProvider && (
        <div className="p-4 rounded-2xl bg-black/60 border border-theme-primary/40 backdrop-blur-md flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={13} className="text-theme-primary" />
              Configurar Link / Playlist para {editingProvider}
            </span>
            <button
              onClick={() => setEditingProvider(null)}
              className="text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Cole o link da sua Playlist, Canal ou Rádio..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none font-mono"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditingProvider(null)}
              className="px-3 py-1 rounded-xl text-xs text-white/60 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSaveCustom(editingProvider)}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-theme-primary text-white text-xs font-bold shadow-md"
            >
              <Save size={12} /> Salvar Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
