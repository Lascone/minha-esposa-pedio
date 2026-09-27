import { create } from "zustand";
import {
  ServiceProvider,
  ConnectedAccount,
  TrackMetadata,
  GmailSummary,
  openBrowserAuthFlow,
  getSimulatedTrack,
  getSimulatedGmail,
} from "../services/mediaIntegrationsService";

const STORAGE_KEY = "minha_esposa_pedio_integrations_v2";

interface IntegrationsState {
  accounts: Record<ServiceProvider, ConnectedAccount>;
  activeTrack: TrackMetadata;
  gmailSummary: GmailSummary;
  isConnecting: ServiceProvider | null;
  activeMediaSource: ServiceProvider;

  // Actions
  connectAccount: (provider: ServiceProvider, customNameOrUrl?: string) => Promise<void>;
  disconnectAccount: (provider: ServiceProvider) => void;
  setActiveMediaSource: (provider: ServiceProvider) => void;
  togglePlayPause: () => void;
  skipTrack: (direction: "next" | "prev") => void;
  refreshGmail: () => void;
}

const DEFAULT_ACCOUNTS: Record<ServiceProvider, ConnectedAccount> = {
  spotify: {
    provider: "spotify",
    connected: false,
    username: "Spotify",
    lastSync: "Não conectado",
  },
  "youtube-music": {
    provider: "youtube-music",
    connected: false,
    username: "YouTube Music",
    lastSync: "Não conectado",
  },
  youtube: {
    provider: "youtube",
    connected: false,
    username: "YouTube Geral",
    lastSync: "Não conectado",
  },
  gmail: {
    provider: "gmail",
    connected: false,
    username: "Gmail",
    lastSync: "Não conectado",
  },
};

export const useIntegrationsStore = create<IntegrationsState>((set, get) => {
  // Clear any legacy mock data from localStorage
  try {
    localStorage.removeItem("minha_esposa_pedio_integrations_v1");
  } catch {}

  let savedAccounts = DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure no fake mock names remain
      const isFake = Object.values(parsed).some(
        (a: any) =>
          a?.username?.includes("Conta Spotify Principal") ||
          a?.username?.includes("Meu Canal YouTube") ||
          a?.username?.includes("Meu Gmail Oficial")
      );
      if (!isFake) {
        savedAccounts = { ...DEFAULT_ACCOUNTS, ...parsed };
      }
    }
  } catch {}

  const save = (accounts: Record<ServiceProvider, ConnectedAccount>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {}
    return accounts;
  };

  return {
    accounts: savedAccounts,
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

    connectAccount: async (provider: ServiceProvider, customNameOrUrl?: string) => {
      set({ isConnecting: provider });
      try {
        await openBrowserAuthFlow(provider);
        const name = customNameOrUrl && customNameOrUrl.trim()
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
        save(updated);
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
      save(updated);
      set({ accounts: updated });
    },

    setActiveMediaSource: (provider: ServiceProvider) => {
      set({
        activeMediaSource: provider,
      });
    },

    togglePlayPause: () => {
      const current = get().activeTrack;
      set({
        activeTrack: {
          ...current,
          isPlaying: !current.isPlaying,
        },
      });
    },

    skipTrack: (direction: "next" | "prev") => {
      const providers: ServiceProvider[] = ["spotify", "youtube-music", "youtube"];
      const current = get().activeMediaSource;
      const nextIndex =
        direction === "next"
          ? (providers.indexOf(current) + 1) % providers.length
          : (providers.indexOf(current) - 1 + providers.length) % providers.length;
      const nextProvider = providers[nextIndex];
      set({
        activeMediaSource: nextProvider,
        activeTrack: {
          ...get().activeTrack,
          provider: nextProvider,
        },
      });
    },

    refreshGmail: () => {
      // Abre o Gmail real diretamente no navegador do usuário
      window.open("https://mail.google.com", "_blank");
      set({
        gmailSummary: {
          unreadCount: 0,
          totalCount: 0,
          accountEmail: get().accounts.gmail.username || "Caixa de Entrada",
          lastChecked: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          recentMessages: [],
        },
      });
    },
  };
});
