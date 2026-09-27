import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import {
  ExternalLink,
  Radio,
  ListMusic,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";

export function formatSpotifyEmbedUrl(url: string): string {
  if (!url || !url.includes("spotify.com")) {
    // Default: Top Hits Brasil / Today's Top Hits playlist embed
    return "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0";
  }
  let clean = url.trim();
  if (!clean.includes("/embed/")) {
    clean = clean.replace("open.spotify.com/", "open.spotify.com/embed/");
  }
  return clean;
}

export const SpotifyWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();
  const settings = widget.settings || {};
  const customPlaylistUrl = settings.customPlaylistUrl || "";
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);
  const [playlistUrlInput, setPlaylistUrlInput] = useState(customPlaylistUrl);

  const { addToast } = useToast();

  const embedUrl = formatSpotifyEmbedUrl(customPlaylistUrl);

  const handleOpenSpotify = () => {
    const target = customPlaylistUrl || "https://open.spotify.com";
    window.open(target, "_blank");
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-2.5 select-none overflow-hidden text-theme-text font-sans bg-black/40 rounded-2xl">
      {/* Top Header: Spotify Brand & Direct Actions */}
      <div className="flex items-center justify-between pb-1 px-1 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Spotify Green Brand Dot */}
          <div className="w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center text-black shadow-[0_0_10px_rgba(29,185,84,0.4)]">
            <Radio size={11} className="text-black font-bold" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white">Spotify Player</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPlaylistInput(!showPlaylistInput)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
              showPlaylistInput ? "bg-[#1DB954]/20 text-[#1DB954]" : "hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title="Colar link de Playlist ou Álbum pessoal do Spotify"
          >
            <ListMusic size={12} />
            <span>{customPlaylistUrl ? "Trocar Playlist" : "Minha Playlist"}</span>
          </button>

          <button
            onClick={handleOpenSpotify}
            className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Abrir no Spotify / Mozilla Firefox"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Playlist URL popdown form (zero tokens required) */}
      {showPlaylistInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = playlistUrlInput.trim();
            updateWidgetSettings(widget.id, { customPlaylistUrl: trimmed });
            setShowPlaylistInput(false);
            addToast("Playlist pessoal salva no Spotify Player! 🎵", "sparkle");
          }}
          className="flex items-center gap-1 my-1 p-1 rounded-xl bg-slate-900/95 border border-[#1DB954]/40 backdrop-blur-md z-20 text-xs animate-in fade-in duration-150 shrink-0"
        >
          <input
            type="text"
            placeholder="Cole o link da sua Playlist do Spotify..."
            value={playlistUrlInput}
            onChange={(e) => setPlaylistUrlInput(e.target.value)}
            className="flex-1 bg-transparent px-2 py-0.5 text-[11px] text-white placeholder-white/40 outline-none font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="px-2.5 py-0.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black text-[10px] font-bold"
          >
            Salvar
          </button>
        </form>
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
