import React, { useState, useEffect, useRef } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import {
  Search,
  ExternalLink,
  Tv,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";
import {
  searchYouTubeVideos,
  extractYouTubeVideoId,
  YOUTUBE_PRESETS,
  YouTubeSearchResult,
} from "../services/youtubeService";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const YouTubePlayerWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { updateWidgetSettings, removeWidget } = useWidgetsStore();
  const { addToast } = useToast();

  const settings = widget.settings || {};
  const currentVideoId: string = settings.videoId || "jfKfPfyJRdk"; // Lofi Girl default
  const isAutoPlay: boolean = settings.autoPlay ?? true;

  const [inputUrl, setInputUrl] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

  const handleApplyVideo = (videoId: string, title?: string) => {
    const validId = extractYouTubeVideoId(videoId) || videoId;
    if (!validId) return;

    updateWidgetSettings(widget.id, {
      videoId: validId,
      videoTitle: title || settings.videoTitle,
    });
    setShowSearch(false);
    setInputUrl("");
    setSearchResults([]);
    addToast(title ? `Tocando: ${title} 📺` : "Vídeo do YouTube atualizado! 📺", "sparkle");
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputUrl.trim();
    if (!query) return;

    // Se for URL ou ID direto, toca imediatamente
    const directId = extractYouTubeVideoId(query);
    if (directId) {
      handleApplyVideo(directId);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchYouTubeVideos(query, 6);
      if (results.length > 0) {
        setSearchResults(results);
      } else {
        setSearchError("Nenhum vídeo encontrado para essa busca.");
      }
    } catch (err) {
      setSearchError("Erro na busca do YouTube. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenBrowser = () => {
    window.open(`https://www.youtube.com/watch?v=${currentVideoId}`, "_blank");
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-2 select-none overflow-hidden text-theme-text font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-1.5 px-1 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#FF0000] flex items-center justify-center text-white shadow-[0_0_8px_rgba(255,0,0,0.5)] shrink-0">
            <Tv size={11} className="text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1">
            YouTube Vídeos
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </div>

        {/* Action Controls + Explicit Close Button */}
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
            title="Pesquisar vídeos ou colar link"
          >
            <Search size={12} />
          </button>

          <button
            onClick={handleOpenBrowser}
            className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Abrir no navegador"
          >
            <ExternalLink size={12} />
          </button>

          {/* Botão de Fechar Dedicado e 100% Funcional */}
          <button
            onClick={handleClose}
            className="p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white transition-all hover:scale-105 active:scale-95 ml-1"
            title="Fechar Widget"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* URL or Search Input Popdown */}
      {showSearch && (
        <div className="absolute top-10 left-2 right-2 z-40 bg-slate-900/95 border border-red-500/40 rounded-xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar música, vídeo ou colar link..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/40 outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shrink-0 disabled:opacity-50"
            >
              {isSearching ? "..." : "Buscar"}
            </button>
          </form>

          {searchError && (
            <p className="text-[10px] text-red-400 mt-1.5 px-1">{searchError}</p>
          )}

          {/* Search Results Dropdown List */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleApplyVideo(item.id, item.title)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-12 h-8 rounded object-cover shrink-0 bg-black/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white truncate group-hover:text-red-400">
                      {item.title}
                    </p>
                    <p className="text-[9px] text-white/50 truncate">{item.channelTitle}</p>
                  </div>
                  <Play size={12} className="text-white/40 group-hover:text-red-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Responsive Embedded YouTube Player */}
      <div className="relative flex-1 w-full min-h-[110px] my-1 rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner group">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=${
            isAutoPlay ? "1" : "0"
          }&controls=1&modestbranding=1&rel=0`}
          title="YouTube Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-none rounded-xl"
        />
      </div>

      {/* Preset Stream Quick Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1 shrink-0">
        {YOUTUBE_PRESETS.map((st) => (
          <button
            key={st.id}
            onClick={() => handleApplyVideo(st.id, st.name)}
            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 transition-all border ${
              currentVideoId === st.id
                ? "bg-red-600 text-white border-red-500 shadow-sm"
                : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/10 hover:border-red-400/50"
            }`}
          >
            {st.name}
          </button>
        ))}
      </div>
    </div>
  );
};
