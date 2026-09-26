import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { useAutoClickStore } from "@/projects/autoclick/store/autoclickStore";
import { InputService } from "@/core/services/automation/InputService";

export type ShortcutCategory = "all" | "system" | "crosshair" | "autoclick" | "widgets";

export interface ShortcutDefinition {
  id: string;
  category: "system" | "crosshair" | "autoclick" | "widgets";
  label: string;
  description: string;
  defaultKey: string;
  currentKey: string;
  isGlobal: boolean; // Se registra no sistema operacional mesmo fora do app
  isDanger?: boolean; // Se é parada de emergência
}

const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Sistema
  {
    id: "system_toggle_window",
    category: "system",
    label: "Mostrar / Ocultar Janela",
    description: "Alterna a visibilidade da janela principal do aplicativo em qualquer momento.",
    defaultKey: "Control+H",
    currentKey: "Control+H",
    isGlobal: true,
  },
  {
    id: "system_toggle_fullscreen",
    category: "system",
    label: "Tela Cheia / Janela",
    description: "Alterna o modo tela cheia para visualização ampla.",
    defaultKey: "F11",
    currentKey: "F11",
    isGlobal: false,
  },

  // Crosshair
  {
    id: "crosshair_toggle_overlay",
    category: "crosshair",
    label: "Ligar / Desligar Mira",
    description: "Ativa ou esconde a mira fixa (crosshair) sobreposta aos seus jogos.",
    defaultKey: "F10",
    currentKey: "F10",
    isGlobal: true,
  },
  {
    id: "crosshair_recenter",
    category: "crosshair",
    label: "Recentralizar Mira",
    description: "Redefine os deslocamentos (offsets) da mira para o centro exato da tela.",
    defaultKey: "Control+Alt+X",
    currentKey: "Control+Alt+X",
    isGlobal: true,
  },

  // Auto Click
  {
    id: "autoclick_start_stop",
    category: "autoclick",
    label: "Iniciar / Parar Auto Click",
    description: "Liga ou desliga a repetição contínua de cliques no jogo ou aplicativo ativo.",
    defaultKey: "Insert",
    currentKey: "Insert",
    isGlobal: true,
  },
  {
    id: "autoclick_emergency_stop",
    category: "autoclick",
    label: "Parada de Emergência (Pânico)",
    description: "Cancela instantaneamente qualquer automação, solta cliques e libera teclas.",
    defaultKey: "Shift+Escape",
    currentKey: "Shift+Escape",
    isGlobal: true,
    isDanger: true,
  },
  {
    id: "autoclick_pick_coordinate",
    category: "autoclick",
    label: "Capturar Coordenada do Mouse",
    description: "Salva a posição exata (X, Y) atual do cursor para uso no clique multi-ponto.",
    defaultKey: "F7",
    currentKey: "F7",
    isGlobal: false,
  },

  // Widgets da Área de Trabalho
  {
    id: "widgets_toggle_all",
    category: "widgets",
    label: "Mostrar / Ocultar Gadgets",
    description: "Alterna a visibilidade de todos os gadgets da área de trabalho de uma vez.",
    defaultKey: "F8",
    currentKey: "F8",
    isGlobal: true,
  },
  {
    id: "widgets_reset_positions",
    category: "widgets",
    label: "Recuperar Gadgets Fora da Tela",
    description: "Traz de volta todos os gadgets para a tela principal caso fiquem perdidos.",
    defaultKey: "Control+Shift+W",
    currentKey: "Control+Shift+W",
    isGlobal: true,
  },
];

interface ShortcutsState {
  shortcuts: ShortcutDefinition[];
  selectedCategory: ShortcutCategory;
  searchQuery: string;

  setSelectedCategory: (category: ShortcutCategory) => void;
  setSearchQuery: (query: string) => void;
  updateShortcut: (id: string, newKey: string) => Promise<{ success: boolean; message?: string }>;
  resetShortcut: (id: string) => Promise<void>;
  resetAll: () => Promise<void>;
  findConflict: (key: string, excludeId?: string) => ShortcutDefinition | undefined;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      selectedCategory: "all",
      searchQuery: "",

      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      findConflict: (key: string, excludeId?: string) => {
        const normalized = key.trim().toUpperCase();
        return get().shortcuts.find(
          (s) => s.id !== excludeId && s.currentKey.trim().toUpperCase() === normalized
        );
      },

      updateShortcut: async (id: string, newKey: string) => {
        const cleanKey = newKey.trim();
        const upper = cleanKey.toUpperCase();

        // 1. Proibição estrita de teclas perigosas isoladas
        if (upper === "ESC" || upper === "ESCAPE") {
          return {
            success: false,
            message: "A tecla ESC isolada não pode ser atalho global para não bloquear seus jogos! Use Shift+ESC ou outra combinação.",
          };
        }

        if (upper === "ENTER" || upper === "SPACE" || upper === "BACKSPACE" || upper === "TAB") {
          return {
            success: false,
            message: `A tecla ${cleanKey} isolada não pode ser usada como atalho global. Combine com Ctrl, Alt ou Shift.`,
          };
        }

        // 2. Atualizar no estado local
        set((state) => ({
          shortcuts: state.shortcuts.map((item) =>
            item.id === id ? { ...item, currentKey: cleanKey } : item
          ),
        }));

        // 3. Sincronizar com os módulos específicos através do despachante central Rust
        try {
          const actionMap: Record<string, string> = {
            system_toggle_window: "window_toggle",
            crosshair_toggle_overlay: "crosshair_toggle",
            autoclick_start_stop: "autoclick_start_stop",
            autoclick_emergency_stop: "emergency_stop_all",
            widgets_toggle_all: "widgets_toggle_all",
          };

          const action = actionMap[id];
          if (action) {
            await invoke("register_action_shortcut", { action, key: cleanKey }).catch((err) => {
              console.warn(`[ShortcutsStore] Erro ao registrar ação ${action}:`, err);
            });
          }

          if (id === "system_toggle_window") {
            localStorage.setItem("pmm_hotkey_app", cleanKey);
          } else if (id === "crosshair_toggle_overlay") {
            localStorage.setItem("pmm_hotkey_overlay", cleanKey);
          } else if (id === "autoclick_start_stop") {
            useAutoClickStore.getState().setHotkeys({ startStop: cleanKey });
          } else if (id === "autoclick_emergency_stop") {
            useAutoClickStore.getState().setHotkeys({ emergency: cleanKey });
          } else if (id === "autoclick_pick_coordinate") {
            useAutoClickStore.getState().setHotkeys({ pick: cleanKey });
          }
        } catch (err) {
          console.warn("[ShortcutsStore] Erro ao sincronizar atalho nativo:", err);
        }

        return { success: true };
      },

      resetShortcut: async (id: string) => {
        const target = get().shortcuts.find((s) => s.id === id);
        if (!target) return;
        await get().updateShortcut(id, target.defaultKey);
      },

      resetAll: async () => {
        for (const def of DEFAULT_SHORTCUTS) {
          await get().updateShortcut(def.id, def.defaultKey);
        }
      },
    }),
    {
      name: "pmm_shortcuts_store_v1",
      version: 1,
      migrate: (persistedState: any) => {
        if (persistedState?.shortcuts) {
          persistedState.shortcuts = persistedState.shortcuts.map((s: ShortcutDefinition) => {
            const up = s.currentKey?.trim().toUpperCase();
            if (up === "ESC" || up === "ESCAPE") {
              return { ...s, currentKey: s.defaultKey || "Shift+Escape" };
            }
            return s;
          });
        }
        return persistedState;
      },
    }
  )
);

export const syncAllSavedShortcutsToBackend = async () => {
  const state = useShortcutsStore.getState();
  const actionMap: Record<string, string> = {
    system_toggle_window: "window_toggle",
    crosshair_toggle_overlay: "crosshair_toggle",
    autoclick_start_stop: "autoclick_start_stop",
    autoclick_emergency_stop: "emergency_stop_all",
    widgets_toggle_all: "widgets_toggle_all",
  };

  for (const shortcut of state.shortcuts) {
    const action = actionMap[shortcut.id];
    if (action && shortcut.currentKey) {
      try {
        await invoke("register_action_shortcut", { action, key: shortcut.currentKey });
      } catch (err) {
        console.warn(`[ShortcutsStore] Erro ao sincronizar ${action}:`, err);
      }
    }
  }
};
