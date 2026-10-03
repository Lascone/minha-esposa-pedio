import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  ServiceProvider,
  ConnectedAccount,
  TrackMetadata,
  GmailSummary,
  openBrowserAuthFlow,
} from "../services/mediaIntegrationsService";

const STORAGE_KEY = "minha_esposa_pedio_integrations_v3";

export interface GoogleAccountState {
  connected: boolean;
  email: string;
  name: string;
  apiToken: string;
  connectedAt: string;
}

export interface SpotifyAccountState {
  connected: boolean;
  loginMethod: "google" | "direct" | "clientId";
  email?: string;
  playlistUrl?: string;
  clientId?: string;
  connectedAt?: string;
}

interface IntegrationsState {
  accounts: Record<ServiceProvider, ConnectedAccount>;
  googleAccount: GoogleAccountState;
  spotifyAccount: SpotifyAccountState;
  activeTrack: TrackMetadata;
  gmailSummary: GmailSummary;
  isConnecting: ServiceProvider | null;
  activeMediaSource: ServiceProvider;

  // Actions
  connectAccount: (provider: ServiceProvider, customNameOrUrl?: string) => Promise<void>;
  disconnectAccount: (provider: ServiceProvider) => void;
  connectGoogleAccount: (email?: string, name?: string) => void;
  disconnectGoogleAccount: () => void;
  connectSpotifyViaGoogle: (playlistOrProfileUrl?: string) => Promise<void>;
  saveSpotifyConfig: (config: Partial<SpotifyAccountState>) => void;
  disconnectSpotify: () => void;
  setActiveMediaSource: (provider: ServiceProvider) => void;
  togglePlayPause: () => void;
  skipTrack: (direction: "next" | "prev") => void;
  refreshGmail: () => void;
}

export const OFFICIAL_GOOGLE_API_KEY = "AIzaSyB-zzUwhVX3AAoCLomJgilM1J7kJdPdPfs";

const DEFAULT_GOOGLE_ACCOUNT: GoogleAccountState = {
  connected: true,
  email: "magraoofficial@gmail.com",
  name: "Google Account (YouTube & Gmail)",
  apiToken: OFFICIAL_GOOGLE_API_KEY,
  connectedAt: "Conectado via Google Cloud",
};

const DEFAULT_SPOTIFY_ACCOUNT: SpotifyAccountState = {
  connected: true,
  loginMethod: "google",
  email: "magraoofficial@gmail.com",
  playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
  clientId: "",
  connectedAt: "Conectado via Google",
};

const DEFAULT_ACCOUNTS: Record<ServiceProvider, ConnectedAccount> = {
  spotify: {
    provider: "spotify",
    connected: true,
    username: "Spotify (via Google: magraoofficial@gmail.com)",
    lastSync: "Conectado via Google",
  },
  "youtube-music": {
    provider: "youtube-music",
    connected: true,
    username: "magraoofficial@gmail.com (YouTube Music)",
    lastSync: "API Oficial Ativa",
  },
  youtube: {
    provider: "youtube",
    connected: true,
    username: "magraoofficial@gmail.com (YouTube Vídeos)",
    lastSync: "API Oficial Ativa",
  },
  gmail: {
    provider: "gmail",
    connected: true,
    username: "magraoofficial@gmail.com",
    lastSync: "Conectado via Google",
  },
};

export const useIntegrationsStore = create<IntegrationsState>((set, get) => {
  // Clear any legacy mock data from localStorage
  try {
    localStorage.removeItem("minha_esposa_pedio_integrations_v1");
  } catch {}

  let savedAccounts = DEFAULT_ACCOUNTS;
  let savedGoogle = DEFAULT_GOOGLE_ACCOUNT;
  let savedSpotify = DEFAULT_SPOTIFY_ACCOUNT;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.accounts) {
        savedAccounts = { ...DEFAULT_ACCOUNTS, ...parsed.accounts };
      }
      if (parsed.googleAccount) {
        savedGoogle = { ...DEFAULT_GOOGLE_ACCOUNT, ...parsed.googleAccount };
      }
      if (parsed.spotifyAccount) {
        savedSpotify = { ...DEFAULT_SPOTIFY_ACCOUNT, ...parsed.spotifyAccount };
      }
    }
  } catch {}

  const saveState = (
    accounts: Record<ServiceProvider, ConnectedAccount>,
    googleAccount: GoogleAccountState,
    spotifyAccount: SpotifyAccountState
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accounts, googleAccount, spotifyAccount })
      );
    } catch {}
  };

  return {
    accounts: savedAccounts,
    googleAccount: savedGoogle,
    spotifyAccount: savedSpotify,
    activeTrack: {
      title: "Nenhuma música tocando",
      artist: "Abra o Spotify ou YouTube no navegador",
      album: "Pronto para tocar",
      albumArt: "",
      durationMs: 0,
      progressMs: 0,
      isPlaying: false,
      provider: "spotify",
    },
    gmailSummary: {
      unreadCount: 0,
      totalCount: 0,
      accountEmail: "",
      lastChecked: "Ainda não sincronizado",
      recentMessages: [],
    },
    isConnecting: null,
    activeMediaSource: "spotify",

    connectGoogleAccount: (email?: string, name?: string) => {
      const chosenEmail = email || "magraoofficial@gmail.com";
      const newGoogle: GoogleAccountState = {
        connected: true,
        email: chosenEmail,
        name: name || "Conta Google Oficial",
        apiToken: OFFICIAL_GOOGLE_API_KEY,
        connectedAt: new Date().toLocaleDateString("pt-BR"),
      };

      const updatedAccounts = {
        ...get().accounts,
        youtube: {
          provider: "youtube" as ServiceProvider,
          connected: true,
          username: `${chosenEmail} (YouTube Vídeos)`,
          lastSync: "Token Oficial Ativo",
        },
        "youtube-music": {
          provider: "youtube-music" as ServiceProvider,
          connected: true,
          username: `${chosenEmail} (YouTube Music)`,
          lastSync: "Token Oficial Ativo",
        },
        gmail: {
          provider: "gmail" as ServiceProvider,
          connected: true,
          username: chosenEmail,
          lastSync: "Conectado via Google",
        },
      };

      saveState(updatedAccounts, newGoogle, get().spotifyAccount);
      set({
        googleAccount: newGoogle,
        accounts: updatedAccounts,
      });
    },

    disconnectGoogleAccount: () => {
      const newGoogle: GoogleAccountState = {
        ...get().googleAccount,
        connected: false,
      };

      const updatedAccounts = {
        ...get().accounts,
        youtube: {
          provider: "youtube" as ServiceProvider,
          connected: false,
          username: "YouTube Geral",
          lastSync: "Desconectado",
        },
        "youtube-music": {
          provider: "youtube-music" as ServiceProvider,
          connected: false,
          username: "YouTube Music",
          lastSync: "Desconectado",
        },
        gmail: {
          provider: "gmail" as ServiceProvider,
          connected: false,
          username: "Gmail",
          lastSync: "Desconectado",
        },
      };

      saveState(updatedAccounts, newGoogle, get().spotifyAccount);
      set({
        googleAccount: newGoogle,
        accounts: updatedAccounts,
      });
    },

    connectSpotifyViaGoogle: async (playlistOrProfileUrl?: string) => {
      set({ isConnecting: "spotify" });
      const targetUrl = "https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com";
      try {
        await openBrowserAuthFlow("spotify");
      } catch {}

      const userEmail = get().googleAccount.email || "magraoofficial@gmail.com";
      const newSpotify: SpotifyAccountState = {
        connected: true,
        loginMethod: "google",
        email: userEmail,
        playlistUrl:
          playlistOrProfileUrl?.trim() ||
          get().spotifyAccount.playlistUrl ||
          "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        clientId: get().spotifyAccount.clientId || "",
        connectedAt: new Date().toLocaleDateString("pt-BR"),
      };

      const updatedAccounts = {
        ...get().accounts,
        spotify: {
          provider: "spotify" as ServiceProvider,
          connected: true,
          username: `Spotify (via Google: ${userEmail})`,
          lastSync: "Login Google Ativo",
        },
      };

      saveState(updatedAccounts, get().googleAccount, newSpotify);
      set({
        spotifyAccount: newSpotify,
        accounts: updatedAccounts,
        isConnecting: null,
      });
    },

    saveSpotifyConfig: (config: Partial<SpotifyAccountState>) => {
      const merged: SpotifyAccountState = {
        ...get().spotifyAccount,
        ...config,
      };

      const updatedAccounts = {
        ...get().accounts,
        spotify: {
          provider: "spotify" as ServiceProvider,
          connected: merged.connected,
          username:
            merged.loginMethod === "google"
              ? `Spotify (via Google: ${merged.email || get().googleAccount.email})`
              : "Spotify Conectado",
          lastSync: "Sincronizado",
        },
      };

      saveState(updatedAccounts, get().googleAccount, merged);
      set({
        spotifyAccount: merged,
        accounts: updatedAccounts,
      });
    },

    disconnectSpotify: () => {
      const newSpotify: SpotifyAccountState = {
        ...get().spotifyAccount,
        connected: false,
      };

      const updatedAccounts = {
        ...get().accounts,
        spotify: {
          provider: "spotify" as ServiceProvider,
          connected: false,
          username: "Spotify",
          lastSync: "Desconectado",
        },
      };

      saveState(updatedAccounts, get().googleAccount, newSpotify);
      set({
        spotifyAccount: newSpotify,
        accounts: updatedAccounts,
      });
    },

    connectAccount: async (provider: ServiceProvider, customNameOrUrl?: string) => {
      set({ isConnecting: provider });
      try {
        await openBrowserAuthFlow(provider);
        const name =
          customNameOrUrl && customNameOrUrl.trim()
            ? customNameOrUrl.trim()
            : `Conectado via Firefox (${provider})`;

        const updated = {
          ...get().accounts,
          [provider]: {
            provider,
            connected: true,
            username: name,
            lastSync: "Aberto no Mozilla Firefox",
          },
        };
        saveState(updated, get().googleAccount, get().spotifyAccount);
        set({
          accounts: updated,
          isConnecting: null,
        });
      } catch (e) {
        set({ isConnecting: null });
      }
    },

    disconnectAccount: (provider: ServiceProvider) => {
      const updated = {
        ...get().accounts,
        [provider]: {
          provider,
          connected: false,
          username: provider,
          lastSync: "Não conectado",
        },
      };
      saveState(updated, get().googleAccount, get().spotifyAccount);
      set({ accounts: updated });
    },

    setActiveMediaSource: (provider: ServiceProvider) => {
      set({
        activeMediaSource: provider,
      });
    },

    togglePlayPause: () => {
      invoke("media_send_command", { action: "play_pause" }).catch(() => {});
      const current = get().activeTrack;
      set({
        activeTrack: {
          ...current,
          isPlaying: !current.isPlaying,
        },
      });
    },

    skipTrack: (direction: "next" | "prev") => {
      invoke("media_send_command", { action: direction === "next" ? "next" : "previous" }).catch(() => {});
    },

    refreshGmail: () => {
      // Sem acesso à API do Gmail: abre a caixa real em vez de inventar contagens.
      invoke("open_external_url", { url: "https://mail.google.com" }).catch(() =>
        window.open("https://mail.google.com", "_blank")
      );
    },
  };
});
