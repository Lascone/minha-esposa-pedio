import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
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

const FEEDS: { url: string; source: string; category: NewsItem["category"] }[] = [
  { url: "https://g1.globo.com/rss/g1/", source: "g1", category: "general" },
  { url: "https://g1.globo.com/rss/g1/tecnologia/", source: "g1 Tecnologia", category: "tech" },
  { url: "https://canaltech.com.br/rss/", source: "Canaltech", category: "tech" },
  { url: "https://br.ign.com/feed.xml", source: "IGN Brasil", category: "games" },
];

const PER_FEED = 8;

function relativeTime(date: Date): string {
  const min = Math.round((Date.now() - date.getTime()) / 60000);
  if (!Number.isFinite(min) || min < 0) return "";
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function parseFeed(xml: string, feed: (typeof FEEDS)[number]): (NewsItem & { ts: number })[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return Array.from(doc.querySelectorAll("item, entry"))
    .slice(0, PER_FEED)
    .flatMap((el, i) => {
      const title = el.querySelector("title")?.textContent?.trim();
      if (!title) return [];
      const linkEl = el.querySelector("link");
      const url = linkEl?.textContent?.trim() || linkEl?.getAttribute("href") || undefined;
      const dateText = el.querySelector("pubDate, published, updated")?.textContent;
      const date = dateText ? new Date(dateText) : null;
      const ts = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
      return [{ id: `${feed.source}-${i}-${title.slice(0, 24)}`, title, url, source: feed.source, category: feed.category, time: ts ? relativeTime(new Date(ts)) : "", ts }];
    });
}

export const RssNewsWidget: React.FC<RssNewsWidgetProps> = ({ widget }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<"all" | "tech" | "games">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadNews = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => parseFeed(await invoke<string>("widget_fetch_feed", { url: feed.url }), feed))
    );
    const items = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .sort((a, b) => b.ts - a.ts);
    if (items.length > 0) {
      setNews(items);
      setFailed(false);
    } else {
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNews();
    const timer = setInterval(loadNews, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadNews]);

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
      invoke("open_external_url", { url }).catch(() => window.open(url, "_blank"));
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
            <span className="text-[9px] text-white/30">{failed ? "Sem conexão · notícias anteriores" : "Via RSS"}</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-white/50 text-center">
          {loading ? (
            <span className="animate-pulse">Buscando notícias…</span>
          ) : failed ? (
            <>
              <span>Não consegui carregar as notícias agora.</span>
              <button onClick={loadNews} className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white">
                Tentar de novo
              </button>
            </>
          ) : (
            "Nenhuma notícia nesta categoria."
          )}
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
