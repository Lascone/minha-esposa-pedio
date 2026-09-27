import React, { useState, useEffect, useRef } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  Music,
  Radio,
  Flame,
  X,
  Disc3,
  ListMusic,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";
import {
  searchYouTubeVideos,
  extractYouTubeVideoId,
  YOUTUBE_PRESETS,
  YouTubeSearchResult,
} from "../services/youtubeService";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const YouTubeMusicWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { updateWidgetSettings, removeWidget } = useWidgetsStore();
  const { addToast } = useToast();

  const settings = widget.settings || {};
  const currentTrackId: string = settings.trackId || "jfKfPfyJRdk";
  const currentTitle: string = settings.trackTitle || "Lofi Hip Hop Radio";
  const currentArtist: string = settings.trackArtist || "Lofi Girl";
  const currentThumbnail: string =
    settings.trackThumbnail || `https://i.ytimg.com/vi/${currentTrackId}/mqdefault.jpg`;

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [queue, setQueue] = useState<YouTubeSearchResult[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPlaying(false);
    removeWidget(widget.id);
    try {
      const win = getCurrentWebviewWindow();
      if (win && win.label && win.label !== "main") {
        win.close().catch(() => win.destroy().catch(() => {}));
      }
    } catch {}
  };

  const handlePlayTrack = (track: {
    id: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
  }) => {
    updateWidgetSettings(widget.id, {
      trackId: track.id,
      trackTitle: track.title,
      trackArtist: track.channelTitle,
      trackThumbnail: track.thumbnail,
    });
    setIsPlaying(true);
    setShowSearch(false);
    setSearchQuery("");
    addToast(`Tocando: ${track.title} 🎵`, "sparkle");
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const directId = extractYouTubeVideoId(q);
    if (directId) {
      handlePlayTrack({
        id: directId,
        title: "Música / Vídeo do YouTube",
        channelTitle: "YouTube Music",
        thumbnail: `https://i.ytimg.com/vi/${directId}/mqdefault.jpg`,
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchYouTubeVideos(`${q} audio music`, 8);
      if (results.length > 0) {
        setSearchResults(results);
        setQueue(results);
      }
    } catch {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handleNext = () => {
    if (queue.length > 0) {
      const nextIdx = (queueIndex + 1) % queue.length;
      setQueueIndex(nextIdx);
      const nextTrack = queue[nextIdx];
      handlePlayTrack(nextTrack);
    } else {
      // Cycle preset
      const currentIdx = YOUTUBE_PRESETS.findIndex((p) => p.id === currentTrackId);
      const nextPreset = YOUTUBE_PRESETS[(currentIdx + 1) % YOUTUBE_PRESETS.length];
      handlePlayTrack({
        id: nextPreset.id,
        title: nextPreset.name,
        channelTitle: nextPreset.artist || "YouTube Music",
        thumbnail: nextPreset.thumbnail || `https://i.ytimg.com/vi/${nextPreset.id}/mqdefault.jpg`,
      });
    }
  };

  const handlePrev = () => {
    if (queue.length > 0) {
      const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
      setQueueIndex(prevIdx);
      const prevTrack = queue[prevIdx];
      handlePlayTrack(prevTrack);
    } else {
      const currentIdx = YOUTUBE_PRESETS.findIndex((p) => p.id === currentTrackId);
      const prevPreset =
        YOUTUBE_PRESETS[(currentIdx - 1 + YOUTUBE_PRESETS.length) % YOUTUBE_PRESETS.length];
      handlePlayTrack({
        id: prevPreset.id,
        title: prevPreset.name,
        channelTitle: prevPreset.artist || "YouTube Music",
        thumbnail: prevPreset.thumbnail || `https://i.ytimg.com/vi/${prevPreset.id}/mqdefault.jpg`,
      });
    }
  };

  const handleOpenYouTube = () => {
    window.open(`https://music.youtube.com/watch?v=${currentTrackId}`, "_blank");
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-3 select-none overflow-hidden text-theme-text font-sans">
      {/* Background Album Art Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 blur-2xl scale-125 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url('${currentThumbnail}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slate-950/85 to-black/95 pointer-events-none" />

      {/* Hidden/Offscreen YouTube Embed for Audio Playback */}
      <div className="absolute -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none opacity-0">
        {isPlaying && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentTrackId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
            title="Audio Stream"
            allow="autoplay; encrypted-media"
            className="w-1 h-1"
          />
        )}
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between pb-1.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#FF0000] flex items-center justify-center text-white shadow-[0_0_8px_rgba(255,0,0,0.5)] shrink-0">
            <Radio size={11} className="text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1">
            YouTube Music
            {isPlaying && (
              <span className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 h-1.5 bg-red-500 animate-pulse rounded-full" />
                <span className="w-0.5 h-3 bg-red-400 animate-pulse delay-75 rounded-full" />
                <span className="w-0.5 h-2 bg-red-500 animate-pulse delay-150 rounded-full" />
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) setSearchResults([]);
            }}
            className={`p-1 rounded-md transition-colors ${
              showSearch
                ? "bg-red-600 text-white shadow-sm"
                : "hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title="Buscar músicas ou colar link"
          >
            <Search size={12} />
          </button>

          <button
            onClick={handleOpenYouTube}
            className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Abrir no YouTube Music"
          >
            <ExternalLink size={12} />
          </button>

          {/* Botão de Fechar Dedicado */}
          <button
            onClick={handleClose}
            className="p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white transition-all hover:scale-105 active:scale-95 ml-1"
            title="Fechar Widget"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Search Popdown Bar */}
      {showSearch && (
        <div className="absolute top-11 left-2 right-2 z-40 bg-slate-900/95 border border-red-500/40 rounded-xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Digite o nome da música ou artista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/40 outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shrink-0 disabled:opacity-50"
            >
              {isSearching ? "..." : "Buscar"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    handlePlayTrack({
                      id: item.id,
                      title: item.title,
                      channelTitle: item.channelTitle,
                      thumbnail: item.thumbnail,
                    })
                  }
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-10 h-7 rounded object-cover shrink-0 bg-black/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white truncate group-hover:text-red-400">
                      {item.title}
                    </p>
                    <p className="text-[9px] text-white/50 truncate">{item.channelTitle}</p>
                  </div>
                  <Play size={11} className="text-white/40 group-hover:text-red-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Middle Track Info Section */}
      <div className="relative z-10 flex items-center gap-3 my-auto py-1">
        {/* Vinyl / Album Art with Spin Animation when playing */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-white/20 shrink-0 shadow-lg group">
          <img
            src={currentThumbnail}
            alt={currentTitle}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isPlaying ? "scale-105" : "scale-100 grayscale-30"
            }`}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            {isPlaying ? (
              <Disc3 size={18} className="text-white/80 animate-spin" style={{ animationDuration: "6s" }} />
            ) : (
              <Play size={16} className="text-white/80 fill-white" />
            )}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <h4 className="text-xs font-bold truncate text-white" title={currentTitle}>
            {currentTitle}
          </h4>
          <span className="text-[10px] text-white/60 truncate" title={currentArtist}>
            {currentArtist}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-0.5">
              <Flame size={9} />
              {isPlaying ? "TOCANDO AGORA" : "PAUSADO"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Presets Carousel */}
      <div className="relative z-10 flex items-center gap-1 overflow-x-auto scrollbar-none py-1 shrink-0">
        {YOUTUBE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() =>
              handlePlayTrack({
                id: p.id,
                title: p.name,
                channelTitle: p.artist || "YouTube Music",
                thumbnail: p.thumbnail || `https://i.ytimg.com/vi/${p.id}/mqdefault.jpg`,
              })
            }
            className={`px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0 transition-all border ${
              currentTrackId === p.id
                ? "bg-red-600 text-white border-red-500 shadow-sm"
                : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border-white/10"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/10 shrink-0">
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            title="Faixa Anterior"
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? (
              <Pause size={12} className="fill-white" />
            ) : (
              <Play size={12} className="fill-white translate-x-0.2" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            title="Próxima Faixa"
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 text-white/60 hover:text-white transition-colors"
            title={isMuted ? "Ativar Som" : "Mudo"}
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
            className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
            title={`Volume: ${isMuted ? 0 : volume}%`}
          />
        </div>
      </div>
    </div>
  );
};
