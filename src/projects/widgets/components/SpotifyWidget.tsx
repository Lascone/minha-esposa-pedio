import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { useIntegrationsStore } from "@/core/stores/integrationsStore";
import {
  ExternalLink,
  Radio,
  ListMusic,
  Sparkles,
  X,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const SPOTIFY_PRESETS = [
  {
    name: "Top Brasil 🇧🇷",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX0FOF1IUWK1W",
  },
  {
    name: "Daily Mix 🎵",
    url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
  },
  {
    name: "Lofi Beats ☕",
    url: "https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM",
  },
  {
    name: "Rock Clássico 🎸",
    url: "https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U",
  },
];

export function formatSpotifyEmbedUrl(url: string): string {
  if (!url || !url.includes("spotify.com")) {
    return "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0";
  }
  let clean = url.trim();
  if (!clean.includes("/embed/")) {
    clean = clean.replace("open.spotify.com/", "open.spotify.com/embed/");
  }
  return clean;
}

export const SpotifyWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { updateWidgetSettings, removeWidget } = useWidgetsStore();
  const { spotifyAccount, connectSpotifyViaGoogle } = useIntegrationsStore();
  const settings = widget.settings || {};
  const customPlaylistUrl = settings.customPlaylistUrl || spotifyAccount.playlistUrl || "";
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);
  const [playlistUrlInput, setPlaylistUrlInput] = useState(customPlaylistUrl);

  const { addToast } = useToast();

  const embedUrl = formatSpotifyEmbedUrl(customPlaylistUrl);

  const handleOpenSpotify = () => {
    const target = customPlaylistUrl || "https://open.spotify.com";
    window.open(target, "_blank");
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    removeWidget(widget.id);
    try {
      const win = getCurrentWebviewWindow();
      if (win && win.label && win.label !== "main") {
        win.close().catch(() => win.destroy().catch(() => {}));
      }
    } catch {}
  };

  const handleSelectPreset = (url: string, name: string) => {
    updateWidgetSettings(widget.id, { customPlaylistUrl: url });
    addToast(`Tocando: ${name} 🎵`, "sparkle");
  };

  const handleGoogleLogin = async () => {
    addToast("Abrindo login do Spotify via Google... 🟢", "info");
    await connectSpotifyViaGoogle(customPlaylistUrl);
    addToast("Login do Spotify via Google ativado! ✨", "sparkle");
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-2.5 select-none overflow-hidden text-theme-text font-sans bg-black/50 rounded-2xl border border-white/10 backdrop-blur-md">
      {/* Top Header: Spotify Brand & Direct Actions */}
      <div className="flex items-center justify-between pb-1 px-1 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Spotify Green Brand Dot */}
          <div className="w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center text-black shadow-[0_0_10px_rgba(29,185,84,0.4)]">
            <Radio size={11} className="text-black font-bold" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-tight text-white">Spotify</span>
            {spotifyAccount.connected && (
              <span className="text-[9px] font-semibold text-[#1DB954] bg-[#1DB954]/15 px-1.5 py-0.2 rounded-full border border-[#1DB954]/30 flex items-center gap-0.5">
                <CheckCircle2 size={8} /> Google
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!spotifyAccount.connected && (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-[#1DB954] text-black shadow-xs hover:bg-[#1ed760] transition-colors"
              title="Entrar no Spotify usando sua Conta Google"
            >
              <LogIn size={10} />
              <span>Login Google</span>
            </button>
          )}

          <button
            onClick={() => setShowPlaylistInput(!showPlaylistInput)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
              showPlaylistInput ? "bg-[#1DB954]/20 text-[#1DB954]" : "hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title="Colar link de Playlist ou Álbum pessoal do Spotify"
          >
            <ListMusic size={12} />
            <span>{customPlaylistUrl ? "Trocar" : "Playlist"}</span>
          </button>

          <button
            onClick={handleOpenSpotify}
            className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Abrir no Spotify / Navegador"
          >
            <ExternalLink size={12} />
          </button>

          {/* Close Window [X] Button */}
          <button
            onClick={handleClose}
            className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all shadow-xs"
            title="Fechar widget do Spotify"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Playlist URL popdown form */}
      {showPlaylistInput && (
        <div className="my-1 p-2 rounded-xl bg-slate-900/95 border border-[#1DB954]/40 backdrop-blur-md z-20 text-xs animate-in fade-in duration-150 shrink-0 flex flex-col gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = playlistUrlInput.trim();
              updateWidgetSettings(widget.id, { customPlaylistUrl: trimmed });
              setShowPlaylistInput(false);
              addToast("Playlist pessoal salva no Spotify Player! 🎵", "sparkle");
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              placeholder="Cole o link da sua Playlist do Spotify..."
              value={playlistUrlInput}
              onChange={(e) => setPlaylistUrlInput(e.target.value)}
              className="flex-1 bg-transparent px-2 py-0.5 text-[11px] text-white placeholder-white/40 outline-none font-mono border-b border-white/20"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-0.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black text-[10px] font-bold"
            >
              Salvar
            </button>
          </form>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[9px] text-white/40 shrink-0">Presets:</span>
            {SPOTIFY_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  handleSelectPreset(p.url, p.name);
                  setShowPlaylistInput(false);
                }}
                className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 hover:bg-[#1DB954]/20 hover:text-[#1DB954] text-white/70 whitespace-nowrap transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Real Spotify Official Embed Player */}
      <div className="relative flex-1 w-full min-h-[140px] my-1 rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
        <iframe
          src={embedUrl}
          title="Spotify Web Player"
          width="100%"
          height="100%"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full h-full border-none rounded-xl"
        />
      </div>
    </div>
  );
};
