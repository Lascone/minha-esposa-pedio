import React, { useState, useEffect, useCallback } from "react";
import { WidgetInstance } from "../types";

interface RssNewsWidgetProps {
  widget: WidgetInstance;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: "tech" | "games" | "general";
  url?: string;
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Novos avanços em inteligência artificial e aceleração gráfica no Windows",
    source: "TechPulse",
    time: "há 15 min",
    category: "tech",
    url: "https://g1.globo.com/tecnologia/",
  },
  {
    id: "2",
    title: "Roblox anuncia nova atualização de motor gráfico e ferramentas para criadores",
    source: "GameSpot BR",
    time: "há 42 min",
    category: "games",
    url: "https://www.roblox.com",
  },
  {
    id: "3",
    title: "Mercado de games no Brasil cresce 12% impulsionado por jogos mobile e PC",
    source: "The Enemy",
    time: "há 1 hora",
    category: "games",
    url: "https://www.theenemy.com.br",
  },
  {
    id: "4",
    title: "Exploração espacial: novo telescópio captura imagens inéditas de nebulosa",
    source: "Ciência Hoje",
    time: "há 2 horas",
    category: "general",
    url: "https://g1.globo.com/ciencia/",
  },
  {
    id: "5",
    title: "Lançamento de processadores de última geração com maior eficiência energética",
    source: "Hardware Info",
    time: "há 3 horas",
    category: "tech",
    url: "https://canaltech.com.br",
  },
];

export const RssNewsWidget: React.FC<RssNewsWidgetProps> = ({ widget }) => {
  const [news, setNews] = useState<NewsItem[]>(DEFAULT_NEWS);
  const [filter, setFilter] = useState<"all" | "tech" | "games">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const filteredNews = news.filter((n) => filter === "all" || n.category === filter);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredNews.length));
  }, [filteredNews.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + filteredNews.length) % Math.max(1, filteredNews.length));
  }, [filteredNews.length]);

  // Auto-cycle news every 12 seconds
  useEffect(() => {
    const timer = setInterval(handleNext, 12000);
    return () => clearInterval(timer);
  }, [handleNext]);

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filter]);

  const currentItem = filteredNews[currentIndex] || filteredNews[0];

  const handleOpenUrl = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex flex-col h-full w-full select-none p-1 text-white justify-between">
      {/* Category Tabs */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-[11px]">
        <div className="flex items-center gap-1 font-medium">
          <button
            onClick={() => setFilter("all")}
            className={`px-1.5 py-0.5 rounded transition ${
              filter === "all" ? "bg-pink-500/30 text-pink-200 font-semibold" : "text-white/50 hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("tech")}
            className={`px-1.5 py-0.5 rounded transition ${
              filter === "tech" ? "bg-pink-500/30 text-pink-200 font-semibold" : "text-white/50 hover:text-white"
            }`}
          >
            Tech 💻
          </button>
          <button
            onClick={() => setFilter("games")}
            className={`px-1.5 py-0.5 rounded transition ${
              filter === "games" ? "bg-pink-500/30 text-pink-200 font-semibold" : "text-white/50 hover:text-white"
            }`}
          >
            Games 🎮
          </button>
        </div>

        <div className="text-[10px] text-white/40 font-mono">
          {filteredNews.length > 0 ? `${currentIndex + 1}/${filteredNews.length}` : "0/0"}
        </div>
      </div>

      {/* Main Headline Display */}
      {currentItem ? (
        <div className="flex flex-col justify-between flex-1 p-2 rounded-xl bg-black/25 border border-white/10 my-1 group hover:border-pink-500/30 transition-all">
          <div className="flex items-center justify-between text-[10px] text-pink-300 font-medium mb-1">
            <span className="bg-pink-500/15 px-1.5 py-0.5 rounded-full border border-pink-500/20">
              {currentItem.source}
            </span>
            <span className="text-white/40 font-mono">{currentItem.time}</span>
          </div>

          <h3
            onClick={() => handleOpenUrl(currentItem.url)}
            className="text-xs font-semibold leading-relaxed line-clamp-3 cursor-pointer hover:text-pink-200 transition"
          >
            {currentItem.title}
          </h3>

          <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/5 text-[10px]">
            <button
              onClick={() => handleOpenUrl(currentItem.url)}
              className="text-white/50 hover:text-pink-300 transition flex items-center gap-1"
            >
              Ler notícia completa ↗
            </button>
            <span className="text-[9px] text-white/30">Atualizado via RSS</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-white/40">
          Nenhuma notícia encontrada.
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handlePrev}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-xs active:scale-95 transition"
        >
          ← Anterior
        </button>
        <button
          onClick={handleNext}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-xs active:scale-95 transition"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
};
