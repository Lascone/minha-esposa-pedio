import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AiChatMessage, CustomWidgetPackage } from "./types";

export interface WidgetChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AiChatMessage[];
  currentPackage?: CustomWidgetPackage;
}

interface WidgetChatsState {
  sessions: WidgetChatSession[];
  activeSessionId: string | null;

  createSession: (initialTitle?: string, initialPackage?: CustomWidgetPackage) => string;
  selectSession: (id: string) => void;
  updateActiveSession: (messages: AiChatMessage[], pkg?: CustomWidgetPackage, title?: string) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
  clearAllSessions: () => void;
}

export const useWidgetChatsStore = create<WidgetChatsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (initialTitle?: string, initialPackage?: CustomWidgetPackage) => {
        const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const title = initialTitle || initialPackage?.manifest.name || "Novo Gadget Fofo 🌸";
        const newSession: WidgetChatSession = {
          id,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: initialPackage?.chatHistory || [
            {
              id: `welcome-${Date.now()}`,
              role: "assistant",
              content: initialPackage
                ? `Oi, amor! ✨ Estou pronta para refinar e modificar o gadget "${initialPackage.manifest.name}". O que você gostaria de mudar hoje? 💖`
                : "Oi, meu amor! 💖 O que você quer que eu crie para você hoje? Pode pedir um relógio fofo, calendário, previsão do tempo, contador de água, bloco de notas ou qualquer ideia fofa! 🌸✨",
              timestamp: Date.now(),
            },
          ],
          currentPackage: initialPackage,
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }));

        return id;
      },

      selectSession: (id: string) => {
        set({ activeSessionId: id });
      },

      updateActiveSession: (messages: AiChatMessage[], pkg?: CustomWidgetPackage, title?: string) => {
        const activeId = get().activeSessionId;
        if (!activeId) return;

        set((state) => {
          const index = state.sessions.findIndex((s) => s.id === activeId);
          if (index < 0) return state;

          const current = state.sessions[index];
          const autoTitle = title || (pkg?.manifest.name && pkg.manifest.name !== "Widget" ? pkg.manifest.name : current.title);

          const updated: WidgetChatSession = {
            ...current,
            title: autoTitle,
            updatedAt: Date.now(),
            messages,
            currentPackage: pkg !== undefined ? pkg : current.currentPackage,
          };

          const newSessions = [...state.sessions];
          newSessions[index] = updated;

          return { sessions: newSessions };
        });
      },

      renameSession: (id: string, newTitle: string) => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, title: trimmed, updatedAt: Date.now() } : s)),
        }));
      },

      deleteSession: (id: string) => {
        set((state) => {
          const filtered = state.sessions.filter((s) => s.id !== id);
          const nextActive = state.activeSessionId === id ? (filtered[0]?.id || null) : state.activeSessionId;
          return {
            sessions: filtered,
            activeSessionId: nextActive,
          };
        });
      },

      clearAllSessions: () => {
        set({ sessions: [], activeSessionId: null });
      },
    }),
    {
      name: "pmm_widget_chat_sessions",
    }
  )
);
