import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Sparkles,
  Copy,
  Check,
  Filter,
  Image as ImageIcon,
  Camera,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { useToast } from "@/core/components/Toast";
import { invoke } from "@tauri-apps/api/core";

interface CuteImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImageAsPrompt: (url: string, description: string, mode?: "background" | "sticker" | "chat") => void;
  onSelectImageAsReference: (url: string) => void;
}

export interface WebImageItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  domain: string;
  isTransparent?: boolean;
  isGif?: boolean;
  aspect?: "square" | "landscape" | "portrait";
  width?: number;
  height?: number;
}

const PRESET_SUGGESTIONS = [
  { term: "gato anime fofo", label: "🐱 Gato Anime", icon: "🐾" },
  { term: "anime girl chibi", label: "🌸 Chibi Kawaii", icon: "🎀" },
  { term: "lofi room aesthetic", label: "☕ Lo-Fi Relax", icon: "🎧" },
  { term: "pixel art sticker", label: "👾 Pixel Art", icon: "🕹️" },
  { term: "dragon ball z", label: "🔥 Dragon Ball", icon: "⚡" },
  { term: "pastel sky clouds", label: "☁️ Nuvens Pastel", icon: "✨" },
  { term: "cute kitten gif", label: "🎬 Gatinho GIF", icon: "🐱" },
];

const INITIAL_SHOWCASE: WebImageItem[] = [
  {
    id: "init-1",
    title: "Gatinho Anime Estiloso com Fone",
    url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop",
    domain: "unsplash.com",
    aspect: "landscape",
    width: 1920,
    height: 1080,
  },
  {
    id: "init-2",
    title: "Garota Anime e Sakura em Flor",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop",
    domain: "unsplash.com",
    aspect: "landscape",
    width: 1920,
    height: 1200,
  },
  {
    id: "init-3",
    title: "Gatinho Fofo Animado",
    url: "https://cataas.com/cat/cute/gif",
    thumbnail: "https://cataas.com/cat/cute/gif",
    domain: "cataas.com",
    isGif: true,
    aspect: "square",
    width: 500,
    height: 500,
  },
  {
    id: "init-4",
    title: "Coração Rosa Kawaii Transparente",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Pink_heart_icon.svg",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Pink_heart_icon.svg",
    domain: "wikimedia.org",
    isTransparent: true,
    aspect: "square",
    width: 512,
    height: 512,
  },
  {
    id: "init-5",
    title: "Aura Pastel Suave e Degradê",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop",
    domain: "unsplash.com",
    aspect: "landscape",
    width: 1920,
    height: 1080,
  },
  {
    id: "init-6",
    title: "Café e Mesa de Estudos Lo-Fi",
    url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop",
    domain: "unsplash.com",
    aspect: "landscape",
    width: 1920,
    height: 1080,
  },
];

export const CuteImagePickerModal: React.FC<CuteImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImageAsPrompt,
  onSelectImageAsReference,
}) => {
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [images, setImages] = useState<WebImageItem[]>(INITIAL_SHOWCASE);
  const [selectedImage, setSelectedImage] = useState<WebImageItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Abas estilo Google
  const [activeTab, setActiveTab] = useState<"all" | "images" | "gifs" | "png" | "wallpapers" | "anime">("images");

  // Barra de ferramentas clássica do Google
  const [showTools, setShowTools] = useState(false);
  const [filterSize, setFilterSize] = useState<"all" | "large" | "medium">("all");
  const [filterColor, setFilterColor] = useState<"all" | "transparent" | "blackAndWhite">("all");
  const [filterAspect, setFilterAspect] = useState<"all" | "square" | "landscape" | "portrait">("all");

  useEffect(() => {
    if (isOpen) {
      if (!searchQuery && images.length === 0) {
        setImages(INITIAL_SHOWCASE);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Realiza a busca no motor de imagens web real sem CORS
  const handlePerformSearch = async (overrideTerm?: string, overrideTab?: string) => {
    const rawTerm = overrideTerm !== undefined ? overrideTerm : searchQuery;
    const term = rawTerm.trim();
    if (!term) return;

    setIsSearching(true);
    const tabToUse = overrideTab || activeTab;

    // Determinar filtros para o backend nativo
    let filterTypeParam: string | undefined = undefined;
    if (tabToUse === "png" || filterColor === "transparent") {
      filterTypeParam = "transparent";
    } else if (tabToUse === "gifs") {
      filterTypeParam = "animated";
    } else if (tabToUse === "wallpapers" || filterSize === "large") {
      filterTypeParam = "wallpaper";
    }

    let filterAspectParam: string | undefined = undefined;
    if (filterAspect !== "all") {
      filterAspectParam = filterAspect;
    }

    try {
      // 1. Tentar busca nativa via Tauri (sem bloqueio de CORS, imagens reais de alta resolução)
      let results: any[] = [];
      try {
        results = await invoke<any[]>("search_web_images", {
          query: term,
          filterType: filterTypeParam || null,
          filterAspect: filterAspectParam || null,
          first: 0,
          count: 36,
        });
      } catch (nativeErr) {
        console.warn("Tauri search_web_images não disponível ou em dev web:", nativeErr);
      }

      if (results && results.length > 0) {
        const mapped: WebImageItem[] = results.map((r, i) => ({
          id: `img-${i}-${Date.now()}`,
          title: r.title || term,
          url: r.url,
          thumbnail: r.thumbnail || r.url,
          domain: r.domain || "web",
          isTransparent: r.is_transparent,
          isGif: r.is_gif,
          aspect: r.aspect as any,
          width: r.width,
          height: r.height,
        }));
        setImages(mapped);
        setSelectedImage(mapped[0] || null);
        setIsSearching(false);
        return;
      }

      // 2. Fallback inteligente com Safebooru / Nekos / Unsplash se o Tauri nativo não retornar
      const fallbackList: WebImageItem[] = [];

      // Safebooru para anime/desenho
      if (tabToUse === "anime" || term.toLowerCase().includes("anime") || term.toLowerCase().includes("dragon") || term.toLowerCase().includes("gato")) {
        try {
          const safeTag = term.toLowerCase().includes("dragon") ? "dragon_ball" : (term.toLowerCase().includes("gato") ? "cat_ears" : "safe");
          const safeRes = await fetch(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=rating:safe+${encodeURIComponent(safeTag)}&limit=15`);
          if (safeRes.ok) {
            const safeData = await safeRes.json();
            for (const s of safeData) {
              if (s.image && s.directory) {
                fallbackList.push({
                  id: `safe-${s.id}`,
                  title: `${term} Anime Art`,
                  url: `https://safebooru.org/images/${s.directory}/${s.image}`,
                  thumbnail: `https://safebooru.org/thumbnails/${s.directory}/thumbnail_${s.image.replace(/\.[^/.]+$/, ".jpg")}`,
                  domain: "safebooru.org",
                  aspect: s.width && s.height && s.width > s.height ? "landscape" : "portrait",
                  width: s.width,
                  height: s.height,
                });
              }
            }
          }
        } catch {}
      }

      // Nekos.best para Waifus e Nekos
      try {
        const nekoRes = await fetch("https://nekos.best/api/v2/neko?amount=10");
        if (nekoRes.ok) {
          const nekoData = await nekoRes.json();
          for (const n of nekoData.results || []) {
            fallbackList.push({
              id: `neko-${n.url}`,
              title: `${term} Anime Fofo - ${n.artist_name || "Artista"}`,
              url: n.url,
              thumbnail: n.url,
              domain: "nekos.best",
              aspect: "portrait",
              isTransparent: true,
            });
          }
        }
      } catch {}

      if (fallbackList.length > 0) {
        setImages(fallbackList);
        setSelectedImage(fallbackList[0] || null);
      } else {
        // Fallback garantido Unsplash
        const unsplashList: WebImageItem[] = Array.from({ length: 12 }).map((_, i) => ({
          id: `unsp-${i}`,
          title: `${term} Wallpaper HD ${i + 1}`,
          url: `https://picsum.photos/seed/${encodeURIComponent(term)}-${i}/800/600`,
          thumbnail: `https://picsum.photos/seed/${encodeURIComponent(term)}-${i}/400/300`,
          domain: "unsplash.com",
          aspect: "landscape",
        }));
        setImages(unsplashList);
        setSelectedImage(unsplashList[0] || null);
      }
    } catch (e: any) {
      addToast("Erro ao buscar imagens na rede.", "warning");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    addToast("Link da imagem copiado! ✨", "success");
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-6xl bg-[#202124] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh] text-slate-100">
        
        {/* CABEÇALHO AUTÊNTICO GOOGLE IMAGENS */}
        <div className="px-5 py-3.5 bg-[#202124] border-b border-slate-700/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Logo do Google com cores fiéis */}
            <div className="flex items-baseline text-2xl font-extrabold tracking-tight select-none">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
              <span className="text-xs font-semibold text-slate-400 ml-1.5 self-end pb-0.5">
                Imagens
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 ml-2">
              Pro Gadgets
            </span>
          </div>

          {/* Barra de Pesquisa Clássica do Google (Arredondada com Ícones) */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative flex items-center bg-[#303134] hover:bg-[#3c4043] focus-within:bg-[#303134] border border-transparent focus-within:border-[#8ab4f8] focus-within:shadow-[0_1px_6px_rgba(32,33,36,0.28)] rounded-full px-4 py-2 transition-all">
              <Search size={16} className="text-slate-400 mr-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePerformSearch()}
                placeholder="Pesquise imagens... (ex: dragon ball z, gato anime, lofi, waifu, wallpaper)"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-1 hover:text-white text-slate-400 mr-2"
                >
                  <X size={15} />
                </button>
              )}
              <button
                onClick={() => handlePerformSearch()}
                disabled={isSearching}
                className="p-1.5 rounded-full hover:bg-slate-700/60 text-[#8ab4f8] transition-colors"
                title="Buscar no Google"
              >
                {isSearching ? <RefreshCw size={16} className="animate-spin text-pink-400" /> : <Search size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Fechar busca"
          >
            <X size={20} />
          </button>
        </div>

        {/* ABAS CLÁSSICAS DO GOOGLE & FERRAMENTAS */}
        <div className="px-6 bg-[#202124] border-b border-slate-700/80 flex items-center justify-between text-xs font-medium text-slate-400 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setActiveTab("images");
                handlePerformSearch(undefined, "images");
              }}
              className={`py-3 flex items-center gap-1.5 border-b-2 font-bold transition-all ${
                activeTab === "images"
                  ? "border-[#8ab4f8] text-[#8ab4f8]"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <ImageIcon size={14} />
              <span>Imagens</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("png");
                handlePerformSearch(undefined, "png");
              }}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "png"
                  ? "border-[#8ab4f8] text-[#8ab4f8] font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <span>✂️ PNG Transparente</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("gifs");
                handlePerformSearch(undefined, "gifs");
              }}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "gifs"
                  ? "border-[#8ab4f8] text-[#8ab4f8] font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <span>🎬 GIFs Animados</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("wallpapers");
                handlePerformSearch(undefined, "wallpapers");
              }}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "wallpapers"
                  ? "border-[#8ab4f8] text-[#8ab4f8] font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <span>🖼️ Wallpapers HD</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("anime");
                handlePerformSearch(undefined, "anime");
              }}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "anime"
                  ? "border-[#8ab4f8] text-[#8ab4f8] font-bold"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              <span>🌸 Anime & Manhwa</span>
            </button>
          </div>

          {/* Botão Ferramentas do Google */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition-all ${
              showTools
                ? "bg-[#303134] border-[#8ab4f8] text-[#8ab4f8]"
                : "border-slate-700 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Ferramentas</span>
          </button>
        </div>

        {/* BARRA DE FERRAMENTAS EXPANSÍVEL (FILTROS DO GOOGLE) */}
        {showTools && (
          <div className="px-6 py-2.5 bg-[#303134]/90 border-b border-slate-700 flex items-center gap-4 text-xs text-slate-300 animate-in slide-in-from-top duration-150 shrink-0 flex-wrap">
            {/* Tamanho */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Tamanho:</span>
              <select
                value={filterSize}
                onChange={(e) => {
                  setFilterSize(e.target.value as any);
                  handlePerformSearch();
                }}
                className="bg-[#202124] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="all">Qualquer tamanho</option>
                <option value="large">Grande (HD / Wallpaper)</option>
                <option value="medium">Médio</option>
              </select>
            </div>

            {/* Cor */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Cor:</span>
              <select
                value={filterColor}
                onChange={(e) => {
                  setFilterColor(e.target.value as any);
                  handlePerformSearch();
                }}
                className="bg-[#202124] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="all">Qualquer cor</option>
                <option value="transparent">Transparente (PNG)</option>
                <option value="blackAndWhite">Preto e branco</option>
              </select>
            </div>

            {/* Proporção */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Proporção:</span>
              <select
                value={filterAspect}
                onChange={(e) => {
                  setFilterAspect(e.target.value as any);
                  handlePerformSearch();
                }}
                className="bg-[#202124] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="all">Qualquer proporção</option>
                <option value="square">🔲 Quadrado (1:1)</option>
                <option value="landscape">🖼️ Paisagem / Panorâmico</option>
                <option value="portrait">📱 Retrato / Alto</option>
              </select>
            </div>

            <button
              onClick={() => {
                setFilterSize("all");
                setFilterColor("all");
                setFilterAspect("all");
                handlePerformSearch();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline ml-auto"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* CHIPS DE SUGESTÕES VISUAIS DO GOOGLE */}
        <div className="px-6 py-2 bg-[#202124] border-b border-slate-700/60 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          {PRESET_SUGGESTIONS.map((item) => (
            <button
              key={item.term}
              onClick={() => {
                setSearchQuery(item.term);
                handlePerformSearch(item.term);
              }}
              className="px-3 py-1 rounded-full bg-[#303134] hover:bg-[#3c4043] border border-slate-700 hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* ÁREA PRINCIPAL: GRADE GOOGLE IMAGENS + PAINEL DE DETALHES LATERAL */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#171717]">
          {/* GRADE DE IMAGENS LIMPA (SEM BOTÕES POLUINDO A FOTO) */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 content-start">
            {images.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm">
                Nenhuma imagem encontrada. Tente buscar outro termo ou clique nas sugestões acima! 🌸
              </div>
            ) : (
              images.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col bg-[#202124] border ${
                    selectedImage?.id === img.id
                      ? "border-[#8ab4f8] ring-2 ring-[#8ab4f8]/50 shadow-xl"
                      : "border-slate-800 hover:border-slate-600 hover:shadow-lg"
                  }`}
                >
                  {/* Container da Imagem Grande e Fácil de Enxergar */}
                  <div className="relative w-full h-44 sm:h-52 bg-slate-900/60 flex items-center justify-center overflow-hidden">
                    <img
                      src={img.thumbnail || img.url}
                      alt={img.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${img.id}/400/300`;
                      }}
                    />

                    {/* Badges sutis */}
                    <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                      {img.isGif && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-600/90 text-white font-extrabold text-[9px] shadow">
                          GIF
                        </span>
                      )}
                      {img.isTransparent && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white font-extrabold text-[9px] shadow">
                          PNG
                        </span>
                      )}
                    </div>

                    {/* Ações Rápidas no Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectImageAsPrompt(img.url, img.title, "background");
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold transition-all shadow flex items-center gap-1"
                        title="Usar como fundo do gadget"
                      >
                        <Sparkles size={11} />
                        <span>Fundo</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectImageAsPrompt(img.url, img.title, "sticker");
                          onClose();
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 text-[11px] font-bold transition-all shadow"
                        title="Usar como sticker"
                      >
                        <span>Sticker</span>
                      </button>
                    </div>
                  </div>

                  {/* Informações de Título e Domínio (Estilo Google) */}
                  <div className="p-2.5 bg-[#202124]">
                    <p className="text-xs text-slate-200 font-medium truncate" title={img.title}>
                      {img.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                      {img.domain}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAINEL LATERAL DE DETALHES DO GOOGLE IMAGENS */}
          {selectedImage && (
            <div className="w-80 md:w-96 bg-[#202124] border-l border-slate-700 flex flex-col h-full shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="p-3.5 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#8ab4f8]" />
                  Visualização da Imagem
                </span>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Prévia Grande e Nítida */}
              <div className="p-4 flex-1 flex flex-col overflow-y-auto">
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center min-h-[220px] max-h-[340px]">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.title}
                    className="max-h-[320px] max-w-full object-contain"
                  />
                  {selectedImage.isGif && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-600 text-white font-bold text-[10px]">
                      GIF Animado
                    </span>
                  )}
                  {selectedImage.isTransparent && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                      Transparente PNG
                    </span>
                  )}
                </div>

                {/* Metadados */}
                <div className="mt-3.5 space-y-1">
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {selectedImage.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-[#8ab4f8]">
                      <ExternalLink size={12} />
                      {selectedImage.domain}
                    </span>
                    {selectedImage.width && selectedImage.height && (
                      <span className="text-[11px] text-slate-400">
                        {selectedImage.width} × {selectedImage.height}
                      </span>
                    )}
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO PRINCIPAIS PARA O GADGET */}
                <div className="mt-5 space-y-2 pt-4 border-t border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectImageAsPrompt(selectedImage.url, selectedImage.title, "background");
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <Sparkles size={14} />
                    <span>Usar como Fundo do Gadget</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectImageAsPrompt(selectedImage.url, selectedImage.title, "sticker");
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-pink-300 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-95"
                  >
                    <span>✨ Inserir como Sticker no Gadget</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectImageAsReference(selectedImage.url);
                      onClose();
                    }}
                    className="w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera size={13} />
                    <span>Puxar para o Chat do Maridão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(selectedImage.url)}
                    className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedUrl === selectedImage.url ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>{copiedUrl === selectedImage.url ? "Link Copiado!" : "Copiar Link da Imagem"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ CARINHOSO */}
        <div className="px-5 py-2.5 bg-[#202124] border-t border-slate-700 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <span className="text-pink-300 flex items-center gap-1.5 text-[11px]">
            💕 <em>Dica do Maridão: Clique em qualquer imagem para abrir a visualização em alta definição e aplicar no gadget!</em>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#303134] hover:bg-[#3c4043] text-white text-xs font-semibold"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
