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
