import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useIntegrationsStore } from "@/core/stores/integrationsStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  Sparkles,
  Radio,
  ListMusic,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";

export const YouTubeMusicWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const {
    accounts,
    activeTrack,
    isConnecting,
    connectAccount,
    togglePlayPause,
    skipTrack,
  } = useIntegrationsStore();
  const { addToast } = useToast();

  const ytAccount = accounts["youtube-music"];
  const isConnected = ytAccount?.connected;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const url = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery.trim())}`;
    window.open(url, "_blank");
    addToast(`Buscando "${searchQuery}" no YouTube Music! 🎵`, "sparkle");
    setSearchQuery("");
    setShowSearch(false);
  };

  const handleOpenYtMusic = () => {
    window.open("https://music.youtube.com", "_blank");
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-3.5 select-none overflow-hidden text-theme-text font-sans">
      {/* Header: YouTube Music Branding */}
      <div className="flex items-center justify-between pb-2 border-b border-theme-border/40">
        <div className="flex items-center gap-2">
          {/* YouTube Red Icon */}
          <div className="w-5 h-5 rounded-full bg-[#FF0000] flex items-center justify-center text-white shadow-[0_0_10px_rgba(255,0,0,0.4)]">
            <Radio size={11} className="text-white" />
          </div>
          <span className="text-xs font-bold tracking-tight">YouTube Music</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded-md transition-colors ${
              showSearch ? "bg-red-500/20 text-red-400" : "hover:bg-white/10 text-theme-text-muted"
            }`}
            title="Buscar Música"
          >
            <Search size={12} />
          </button>

          {isConnected ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] text-theme-text-muted font-medium line-clamp-1 max-w-[90px]">
                {ytAccount.username || "Conectado"}
              </span>
              <button
                onClick={handleOpenYtMusic}
                className="p-1 rounded-md hover:bg-white/10 text-theme-text-muted hover:text-theme-text transition-colors"
                title="Abrir no navegador"
              >
                <ExternalLink size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => connectAccount("youtube-music")}
              disabled={isConnecting === "youtube-music"}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-sm transition-all"
            >
              <Sparkles size={10} />
              <span>{isConnecting === "youtube-music" ? "Conectando..." : "Conectar"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Search Overlay Bar */}
      {showSearch && (
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-1 my-1.5 p-1 rounded-xl bg-slate-900/90 border border-red-500/30 backdrop-blur-md animate-in fade-in duration-150"
        >
          <input
            type="text"
            placeholder="Nome da música ou artista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent px-2 py-0.5 text-xs text-white placeholder-white/40 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold"
          >
            Buscar
          </button>
        </form>
      )}

      {/* Middle Track Info */}
      <div className="flex items-center gap-3 my-2">
        <img
          src={
            activeTrack.albumArt ||
            "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&h=120&fit=crop"
          }
          alt={activeTrack.title}
          className="w-13 h-13 rounded-xl object-cover shadow-md border border-white/15"
        />

        <div className="flex flex-col min-w-0 flex-1">
          <h4 className="text-xs font-bold truncate text-theme-text" title={activeTrack.title}>
            {activeTrack.title || "YouTube Music"}
          </h4>
          <span className="text-[11px] text-theme-text-muted truncate">
            {activeTrack.artist || "Artistas em Alta"}
          </span>
          <span className="text-[9px] text-red-400 font-semibold tracking-wide">
            YOUTUBE MUSIC STREAM
          </span>
        </div>
      </div>

      {/* Quick Queue / Recommendation chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 text-[9px]">
        {["Lofi Girl", "Pop Hits", "Rock Clássico", "K-Pop", "Café Chill"].map((genre) => (
          <button
            key={genre}
            onClick={() => {
              window.open(`https://music.youtube.com/search?q=${encodeURIComponent(genre)}`, "_blank");
            }}
            className="px-2 py-0.5 rounded-full bg-theme-surface-card border border-theme-border/50 hover:border-red-400 text-theme-text-muted hover:text-theme-text shrink-0 transition-colors"
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between pt-1.5 border-t border-theme-border/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => skipTrack("prev")}
            className="p-1.5 rounded-full hover:bg-white/15 text-theme-text transition-colors"
            title="Anterior"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
            title={activeTrack.isPlaying ? "Pausar" : "Tocar"}
          >
            {activeTrack.isPlaying ? (
              <Pause size={14} className="fill-white" />
            ) : (
              <Play size={14} className="fill-white translate-x-0.5" />
            )}
          </button>

          <button
            onClick={() => skipTrack("next")}
            className="p-1.5 rounded-full hover:bg-white/15 text-theme-text transition-colors"
            title="Próxima"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 text-theme-text-muted hover:text-theme-text"
          >
            {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-14 h-1 bg-theme-border/60 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>
    </div>
  );
};
