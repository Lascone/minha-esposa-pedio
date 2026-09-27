// Service de Integração com YouTube & YouTube Data API v3
// Gerado para a aplicação 'Minha Esposa Pediu' com chave de API nativa

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description?: string;
  publishTime?: string;
}

export interface YouTubePreset {
  id: string;
  name: string;
  title: string;
  artist?: string;
  category: "lofi" | "relax" | "hits" | "brasil" | "rock";
  thumbnail?: string;
}

// Chave oficial do projeto Google Cloud do usuário com YouTube Data API v3 habilitada
export const DEFAULT_YOUTUBE_API_KEY = "AIzaSyB-zzUwhVX3AAoCLomJgilM1J7kJdPdPfs";

export const YOUTUBE_PRESETS: YouTubePreset[] = [
  {
    id: "jfKfPfyJRdk",
    name: "Lofi Girl 🎧",
    title: "Lofi Hip Hop Radio - Beats to relax/study to",
    artist: "Lofi Girl",
    category: "lofi",
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg",
  },
  {
    id: "5yx6BWlEVcY",
    name: "Chillhop ☕",
    title: "Chillhop Radio - Jazzy & Lofi Hip Hop Beats",
    artist: "Chillhop Music",
    category: "lofi",
    thumbnail: "https://i.ytimg.com/vi/5yx6BWlEVcY/mqdefault.jpg",
  },
  {
    id: "womg0k_0Ea8",
    name: "Ghibli Relax 🌿",
    title: "Studio Ghibli Piano / Lofi Anime Relaxing",
    artist: "Anime Vibes",
    category: "relax",
    thumbnail: "https://i.ytimg.com/vi/womg0k_0Ea8/mqdefault.jpg",
  },
  {
    id: "4xDzrJKXOOY",
    name: "Synthwave 🌆",
    title: "Synthwave Radio - Chill Synth & Retro Beats",
    artist: "Lofi Girl Synthwave",
    category: "relax",
    thumbnail: "https://i.ytimg.com/vi/4xDzrJKXOOY/mqdefault.jpg",
  },
  {
    id: "n61ULEU7CO0",
    name: "Lofi Best 2024 ✨",
    title: "Best of Lofi Beats - Peaceful & Calm Music",
    artist: "Lofi Girl",
    category: "lofi",
    thumbnail: "https://i.ytimg.com/vi/n61ULEU7CO0/mqdefault.jpg",
  },
  {
    id: "kJQP7kiw5Fk",
    name: "Despacito 🌴",
    title: "Luis Fonsi - Despacito ft. Daddy Yankee",
    artist: "Luis Fonsi",
    category: "hits",
    thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg",
  },
  {
    id: "kXYiU_JCYtU",
    name: "Numb - Linkin Park 🎸",
    title: "Numb (Official Music Video) - Linkin Park",
    artist: "Linkin Park",
    category: "rock",
    thumbnail: "https://i.ytimg.com/vi/kXYiU_JCYtU/mqdefault.jpg",
  },
];

/**
 * Extrai o ID do vídeo a partir de URLs do YouTube (watch, embed, youtu.be, shorts, music)
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Se já for um ID de 11 caracteres válido (alfanumérico, hífen, underline)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex para capturar IDs em diversas URLs do YouTube
  const patterns = [
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})/,
    /youtube\.com\/shorts\/([^#&?]{11})/,
    /music\.youtube\.com\/watch\?v=([^#&?]{11})/,
    /youtube\.com\/live\/([^#&?]{11})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Busca vídeos no YouTube utilizando a API oficial (YouTube Data API v3)
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults = 8,
  apiKey: string = DEFAULT_YOUTUBE_API_KEY
): Promise<YouTubeSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Se o usuário digitou ou colou um link direto, retorna o item correspondente
  const directId = extractYouTubeVideoId(trimmed);
  if (directId) {
    return [
      {
        id: directId,
        title: "Vídeo selecionado por link direto",
        channelTitle: "YouTube",
        thumbnail: `https://i.ytimg.com/vi/${directId}/mqdefault.jpg`,
      },
    ];
  }

  try {
    const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
      trimmed
    )}&key=${apiKey}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      console.warn("[YouTube API] Falha na busca por API:", res.statusText);
      return filterPresetFallback(trimmed);
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) {
      return filterPresetFallback(trimmed);
    }

    return data.items.map((item: any) => ({
      id: item.id?.videoId || "",
      title: item.snippet?.title || "Sem título",
      channelTitle: item.snippet?.channelTitle || "YouTube",
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${item.id?.videoId}/mqdefault.jpg`,
      description: item.snippet?.description,
      publishTime: item.snippet?.publishTime,
    }));
  } catch (error) {
    console.error("[YouTube API] Erro ao buscar vídeos:", error);
    return filterPresetFallback(trimmed);
  }
}

/**
 * Fallback caso esteja sem internet ou quota excedida
 */
function filterPresetFallback(query: string): YouTubeSearchResult[] {
  const lower = query.toLowerCase();
  const matched = YOUTUBE_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.title.toLowerCase().includes(lower) ||
      (p.artist && p.artist.toLowerCase().includes(lower))
  );

  const list = matched.length > 0 ? matched : YOUTUBE_PRESETS;
  return list.map((p) => ({
    id: p.id,
    title: p.title,
    channelTitle: p.artist || "YouTube",
    thumbnail: p.thumbnail || `https://i.ytimg.com/vi/${p.id}/mqdefault.jpg`,
  }));
}
