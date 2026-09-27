import React, { useState, useEffect, useCallback } from "react";
import { WidgetInstance } from "../types";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
  Flame,
  Globe,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";

interface MediaStatus {
  has_media: boolean;
  source_app: string;
  title: string;
  artist: string;
  album_title: string;
  is_playing: boolean;
  playback_status: string;
}

export const YouTubeMusicWidget: React.FC<{ widget: WidgetInstance }> = () => {
  const { addToast } = useToast();

  const [mediaStatus, setMediaStatus] = useState<MediaStatus>({
    has_media: false,
    source_app: "",
    title: "",
    artist: "",
    album_title: "",
    is_playing: false,
    playback_status: "Stopped",
  });

  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [showPlaylistInput, setShowPlaylistInput] = useState<boolean>(false);

  // Poll system media status (Firefox SMTC)
  const fetchMediaStatus = useCallback(async () => {
    try {
      const res = await invoke<MediaStatus>("media_get_status");
      if (res) {
        setMediaStatus(res);
      }
    } catch {
      // Standalone browser / test mock fallback
    }
  }, []);

  useEffect(() => {
    fetchMediaStatus();
    const interval = setInterval(fetchMediaStatus, 2500);
    return () => clearInterval(interval);
  }, [fetchMediaStatus]);

  // Send native media control key
  const handleMediaControl = async (action: string) => {
    try {
      await invoke("media_send_command", { action });
      // Quick local update
      if (action === "play_pause") {
        setMediaStatus((prev) => ({
          ...prev,
          is_playing: !prev.is_playing,
          playback_status: prev.is_playing ? "Paused" : "Playing",
        }));
      }
      setTimeout(fetchMediaStatus, 300);
    } catch {
      // Fallback
      if (action === "play_pause") {
        setMediaStatus((prev) => ({
          ...prev,
          is_playing: !prev.is_playing,
        }));
      }
    }
  };

  // Open Mozilla Firefox directly with YouTube Music
  const handleOpenFirefox = async (customUrl?: string) => {
    const url = customUrl || "https://music.youtube.com";
    try {
      await invoke("media_open_firefox", { url });
      addToast("Abrindo YouTube Music no seu Mozilla Firefox! 🦊🎵", "sparkle");
    } catch {
      window.open(url, "_blank");
    }
  };

  const handlePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;
    let url = playlistUrl.trim();
    if (!url.startsWith("http")) {
      url = `https://music.youtube.com/search?q=${encodeURIComponent(url)}`;
    }
    handleOpenFirefox(url);
    setShowPlaylistInput(false);
  };

  const currentTitle = mediaStatus.title || "YouTube Music (Mozilla)";
  const currentArtist = mediaStatus.artist || "Conta conectada no Firefox";

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-3.5 select-none overflow-hidden text-theme-text font-sans">
      {/* Sutil capa pequena ao fundo (sem capa gigante, sem vídeo pesado) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 blur-xl scale-110 pointer-events-none transition-all duration-700"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-theme-surface/70 via-theme-surface/90 to-theme-surface/95 pointer-events-none" />

      {/* Header: YouTube Music & Mozilla badge */}
      <div className="relative z-10 flex items-center justify-between pb-1.5 border-b border-theme-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#FF0000] flex items-center justify-center text-white shadow-[0_0_8px_rgba(255,0,0,0.5)]">
            <Radio size={11} className="text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-tight">YouTube Music</span>
          <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-0.5">
            🦊 Mozilla
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPlaylistInput(!showPlaylistInput)}
            className="px-1.5 py-0.5 rounded text-[9px] font-medium hover:bg-white/10 text-theme-text-muted hover:text-theme-text transition-colors"
            title="Inserir Playlist ou Link"
          >
            Playlist
          </button>
          <button
            onClick={() => handleOpenFirefox()}
            className="p-1 rounded hover:bg-white/10 text-theme-text-muted hover:text-red-400 transition-colors"
            title="Abrir no Mozilla Firefox"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Playlist URL Input Bar */}
      {showPlaylistInput && (
        <form
          onSubmit={handlePlaylistSubmit}
          className="relative z-10 flex items-center gap-1 my-1 p-1 rounded-lg bg-theme-surface-card border border-red-500/30 backdrop-blur-md"
        >
          <input
            type="text"
            placeholder="Cole o link da playlist do YouTube Music..."
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            className="flex-1 bg-transparent px-1.5 py-0.5 text-[10px] text-white placeholder-white/40 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold"
          >
            Tocar
          </button>
        </form>
      )}

      {/* Middle Track Info: Capa pequena e sutil */}
      <div className="relative z-10 flex items-center gap-2.5 my-auto py-1">
        {/* Capinha pequena atrás/ao lado de 36x36 */}
        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop"
            alt="Capa"
            className="w-full h-full object-cover"
          />
          {mediaStatus.is_playing && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <h4
            className="text-xs font-bold truncate text-theme-text"
            title={currentTitle}
          >
            {currentTitle}
          </h4>
          <span
            className="text-[10px] text-theme-text-muted truncate"
            title={currentArtist}
          >
            {currentArtist}
          </span>
          <span className="text-[8px] text-red-400 font-semibold tracking-wider flex items-center gap-1 mt-0.5">
            <Flame size={9} />
            {mediaStatus.is_playing ? "TOCANDO NO MOZILLA" : "CONTROLADOR PRONTO"}
          </span>
        </div>
      </div>

      {/* Bottom Controls Bar: Simples Anterior / Play / Próxima / Volume */}
      <div className="relative z-10 flex items-center justify-between pt-1 border-t border-theme-border/30">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleMediaControl("previous")}
            className="p-1 rounded-full hover:bg-white/15 text-theme-text transition-colors"
            title="Faixa Anterior"
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={() => handleMediaControl("play_pause")}
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
            title={mediaStatus.is_playing ? "Pausar" : "Tocar"}
          >
            {mediaStatus.is_playing ? (
              <Pause size={12} className="fill-white" />
            ) : (
              <Play size={12} className="fill-white translate-x-0.2" />
            )}
          </button>

          <button
            onClick={() => handleMediaControl("next")}
            className="p-1 rounded-full hover:bg-white/15 text-theme-text transition-colors"
            title="Próxima Faixa"
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Volume Controller */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              handleMediaControl("volume_mute");
              setIsMuted(!isMuted);
            }}
            className="p-1 text-theme-text-muted hover:text-theme-text"
            title="Mudo"
          >
            {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = Number(e.target.value);
              setVolume(val);
              if (isMuted) setIsMuted(false);
              if (val > volume) handleMediaControl("volume_up");
              else handleMediaControl("volume_down");
            }}
            className="w-14 h-1 bg-theme-border/60 rounded-lg appearance-none cursor-pointer accent-red-500"
            title={`Volume: ${isMuted ? 0 : volume}%`}
          />
        </div>
      </div>
    </div>
  );
};
