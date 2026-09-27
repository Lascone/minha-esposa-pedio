import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import {
  Search,
  ExternalLink,
  Sparkles,
  Maximize2,
  Tv,
  Radio,
  Play,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";

const PRESET_STREAMS = [
  { name: "Lofi Girl 🎧", id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio" },
  { name: "Chillhop ☕", id: "5yx6BWlEVcY", title: "Chillhop Radio - Jazzy Beats" },
  { name: "Ghibli Relax 🌿", id: "womg0k_0Ea8", title: "Ghibli Lofi Anime Vibes" },
  { name: "Synthwave 🌆", id: "4xDzrJKXOOY", title: "Synthwave Radio Chill Synth" },
];

export const YouTubePlayerWidget: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();
  const { addToast } = useToast();

  const settings = widget.settings || {};
  const currentVideoId: string = settings.videoId || "jfKfPfyJRdk"; // Lofi Girl default
  const isAutoPlay: boolean = settings.autoPlay ?? true;

  const [inputUrl, setInputUrl] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Extract YouTube Video ID from standard YouTube URL or ID string
  const extractVideoId = (input: string): string => {
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : trimmed;
  };

  const handleApplyVideo = (videoIdToSet: string) => {
    const validId = extractVideoId(videoIdToSet);
    if (!validId) return;

    updateWidgetSettings(widget.id, { videoId: validId });
    setShowInput(false);
    setInputUrl("");
    addToast("Vídeo do YouTube atualizado! 📺", "sparkle");
  };

  const handleOpenBrowser = () => {
    window.open(`https://www.youtube.com/watch?v=${currentVideoId}`, "_blank");
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full p-2.5 select-none overflow-hidden text-theme-text font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-1.5 px-1 border-b border-theme-border/40">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#FF0000] flex items-center justify-center text-white shadow-[0_0_8px_rgba(255,0,0,0.4)]">
            <Tv size={11} className="text-white" />
          </div>
          <span className="text-xs font-bold tracking-tight">YouTube Vídeos</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInput(!showInput)}
            className={`p-1 rounded-md transition-colors ${
              showInput ? "bg-red-500/20 text-red-400" : "hover:bg-white/10 text-theme-text-muted"
            }`}
            title="Trocar Vídeo ou Colar Link"
          >
            <Search size={12} />
          </button>
          <button
            onClick={handleOpenBrowser}
            className="p-1 rounded-md hover:bg-white/10 text-theme-text-muted hover:text-theme-text transition-colors"
            title="Abrir no Firefox / Navegador"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* URL or Search Input Popdown */}
      {showInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplyVideo(inputUrl);
          }}
          className="flex items-center gap-1 my-1 p-1 rounded-xl bg-slate-900/95 border border-red-500/30 backdrop-blur-md animate-in fade-in duration-150 z-20"
        >
          <input
            type="text"
            placeholder="Cole o link do YouTube (URL ou ID)..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-transparent px-2 py-0.5 text-xs text-white placeholder-white/40 outline-none font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold"
          >
            Tocar
          </button>
        </form>
      )}

      {/* Responsive Embedded YouTube Player */}
      <div className="relative flex-1 w-full min-h-[120px] my-1 rounded-xl overflow-hidden bg-black border border-theme-border/50 shadow-inner group">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=${
            isAutoPlay ? "1" : "0"
          }&controls=1&modestbranding=1&rel=0`}
          title="YouTube Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-none rounded-xl"
        />
      </div>

      {/* Preset Stream Quick Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1">
        {PRESET_STREAMS.map((st) => (
          <button
            key={st.id}
            onClick={() => handleApplyVideo(st.id)}
            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 transition-all border ${
              currentVideoId === st.id
                ? "bg-red-600 text-white border-red-500 shadow-sm"
                : "bg-theme-surface-card text-theme-text-muted hover:text-theme-text border-theme-border/50 hover:border-red-400"
            }`}
          >
            {st.name}
          </button>
        ))}
      </div>
    </div>
  );
};
