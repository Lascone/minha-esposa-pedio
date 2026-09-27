import { invoke } from "@tauri-apps/api/core";

export type ServiceProvider = "spotify" | "youtube-music" | "youtube" | "gmail";

export interface ConnectedAccount {
  provider: ServiceProvider;
  connected: boolean;
  username: string;
  email?: string;
  avatarUrl?: string;
  lastSync: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  provider: ServiceProvider;
  url?: string;
}

export interface GmailSummary {
  unreadCount: number;
  totalCount: number;
  accountEmail: string;
  lastChecked: string;
  recentMessages: {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    timestamp: string;
    isUnread: boolean;
  }[];
}

const PROVIDER_URLS: Record<ServiceProvider, string> = {
  spotify: "https://open.spotify.com",
  "youtube-music": "https://music.youtube.com",
  youtube: "https://youtube.com",
  gmail: "https://mail.google.com",
};

/**
 * Opens the real official service URL directly in the user's default browser (Mozilla Firefox)
 */
export async function openBrowserAuthFlow(provider: ServiceProvider): Promise<string> {
  const targetUrl = PROVIDER_URLS[provider] || "https://google.com";

  try {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      await invoke("open_external_url", { url: targetUrl }).catch(() => {
        window.open(targetUrl, "_blank");
      });
    } else if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank");
    }
  } catch (err) {
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank");
    }
  }

  return targetUrl;
}

/**
 * Fallback template for initial tests / mock suites
 */
export function getSimulatedTrack(provider: ServiceProvider): TrackMetadata {
  return {
    title: provider === "spotify" ? "Spotify Player" : provider === "youtube-music" ? "YouTube Music" : "YouTube Vídeos",
    artist: "Pronto para tocar",
    album: "Cole sua playlist ou toque no Firefox",
    albumArt: "",
    durationMs: 180000,
    progressMs: 0,
    isPlaying: false,
    provider,
    url: PROVIDER_URLS[provider],
  };
}

/**
 * Fallback template for initial tests
 */
export function getSimulatedGmail(): GmailSummary {
  return {
    unreadCount: 1,
    totalCount: 1,
    accountEmail: "mail.google.com",
    lastChecked: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    recentMessages: [
      {
        id: "msg-1",
        sender: "Google",
        subject: "Caixa de Entrada Oficial",
        snippet: "Abra o Firefox para ver seus e-mails em tempo real.",
        timestamp: "Hoje",
        isUnread: true,
      },
    ],
  };
}
