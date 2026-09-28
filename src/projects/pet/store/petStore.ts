import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import {
  PetState,
  PetStats,
  PetCharacterManifest,
  PetItem,
  PetInstanceConfig,
} from "../types";
import { DEFAULT_PRESET_CHARACTERS, VUP_CHARACTER, MIMI_CHARACTER } from "../presets";
import { DEFAULT_PET_ITEMS } from "../items";

interface PetStateStore {
  // Estado do Bichinho Ativo
  activeCharacterId: string;
  customName: string;
  stats: PetStats;
  lastTickTimestamp: number;
  currentState: PetState;
  stateTimer: number;
  facing: "left" | "right";
  isDesktopActive: boolean;

  // Configurações
  config: PetInstanceConfig;
  inventory: PetItem[];

  // Personagens Disponíveis & Customizados do Editor
  customCharacters: PetCharacterManifest[];

  // Ações de Cuidados & Necessidades
  feedPet: (item: PetItem) => void;
  giveDrink: (item: PetItem) => void;
  playWithPet: (item: PetItem) => void;
  bathPet: (item: PetItem) => void;
  caressPet: (zone?: "head" | "body") => void;
  putToSleep: () => void;
  wakeUpPet: () => void;
  setPetState: (state: PetState, facing?: "left" | "right") => void;

  // Ciclo de Vida e Tempo Offline
  processTimePassage: () => void;

  // Controle de Desktop
  spawnPetOnDesktop: () => Promise<void>;
  closePetOnDesktop: () => Promise<void>;
  togglePetDesktop: () => Promise<void>;
  updateConfig: (updates: Partial<PetInstanceConfig>) => void;
  selectCharacter: (characterId: string) => void;

  // Editor de Personagens (Mod Maker)
  saveCustomCharacter: (character: PetCharacterManifest) => void;
  deleteCustomCharacter: (characterId: string) => void;
  getActiveCharacter: () => PetCharacterManifest;
  getAllCharacters: () => PetCharacterManifest[];
}

const INITIAL_STATS: PetStats = {
  hunger: 85,
  thirst: 85,
  energy: 90,
  hygiene: 95,
  happiness: 90,
  bondLevel: 1,
  bondXp: 0,
  bondXpMax: 100,
};

const INITIAL_CONFIG: PetInstanceConfig = {
  petId: "vpet-vup",
  customName: "VUP",
  scale: 1.15,
  alwaysOnTop: true,
  isPaused: false,
  soundEnabled: true,
  moveAroundDesktop: true,
  selectedMonitor: 0,
  x: 200,
  y: 350,
};

export const usePetStore = create<PetStateStore>()(
  persist(
    (set, get) => ({
      activeCharacterId: "vpet-vup",
      customName: "VUP",
      stats: INITIAL_STATS,
      lastTickTimestamp: Date.now(),
      currentState: "idle",
      stateTimer: 0,
      facing: "right",
      isDesktopActive: false,
      config: INITIAL_CONFIG,
      inventory: DEFAULT_PET_ITEMS,
      customCharacters: [],

      // Obtém o manifesto do bichinho ativo
      getActiveCharacter: () => {
        const { activeCharacterId, customCharacters } = get();
        const found =
          customCharacters.find((c) => c.id === activeCharacterId) ||
          DEFAULT_PRESET_CHARACTERS.find((c) => c.id === activeCharacterId);
        return found || VUP_CHARACTER;
      },

      getAllCharacters: () => {
        const { customCharacters } = get();
        return [...DEFAULT_PRESET_CHARACTERS, ...customCharacters];
      },

      selectCharacter: (characterId: string) => {
        const chars = get().getAllCharacters();
        const target = chars.find((c) => c.id === characterId);
        if (target) {
          set({
            activeCharacterId: target.id,
            customName: target.name,
            config: {
              ...get().config,
              petId: target.id,
              scale: target.defaultScale || 1.15,
            },
          });
        }
      },

      // Cálculo amigável da passagem de tempo (com limites seguros para NUNCA matar o pet)
      processTimePassage: () => {
        const now = Date.now();
        const { lastTickTimestamp, stats, currentState } = get();
        const elapsedSeconds = Math.max(0, Math.floor((now - lastTickTimestamp) / 1000));
        if (elapsedSeconds < 10) return;

        // Limita o cálculo a no máximo 12 horas para não punir a usuária excessivamente
        const cappedSeconds = Math.min(elapsedSeconds, 12 * 3600);

        // Taxas por hora: fome -6/h, sede -8/h, higiene -3/h, felicidade -5/h
        const hours = cappedSeconds / 3600;

        let newHunger = Math.max(15, stats.hunger - hours * 7);
        let newThirst = Math.max(15, stats.thirst - hours * 9);
        let newHygiene = Math.max(20, stats.hygiene - hours * 4);
        let newHappiness = Math.max(25, stats.happiness - hours * 6);
        let newEnergy = stats.energy;

        if (currentState === "sleep") {
          // Recupera energia enquanto dorme
          newEnergy = Math.min(100, stats.energy + hours * 30);
        } else {
          newEnergy = Math.max(15, stats.energy - hours * 5);
        }

        set({
          lastTickTimestamp: now,
          stats: {
            ...stats,
            hunger: Math.round(newHunger),
            thirst: Math.round(newThirst),
            hygiene: Math.round(newHygiene),
            happiness: Math.round(newHappiness),
            energy: Math.round(newEnergy),
          },
        });
      },

      // Sistema de ganho de XP e subida de nível
      feedPet: (item: PetItem) => {
        const { stats } = get();
        const ef = item.effects;
        const newHunger = Math.min(100, Math.max(0, stats.hunger + (ef.hunger || 0)));
        const newHappiness = Math.min(100, Math.max(0, stats.happiness + (ef.happiness || 0)));
        let newXp = stats.bondXp + (ef.bondXp || 10);
        let newLevel = stats.bondLevel;
        let newMax = stats.bondXpMax;

        if (newXp >= newMax) {
          newXp -= newMax;
          newLevel += 1;
          newMax = Math.round(newMax * 1.35);
        }

        set({
          stats: {
            ...stats,
            hunger: newHunger,
            happiness: newHappiness,
            bondXp: newXp,
            bondLevel: newLevel,
            bondXpMax: newMax,
          },
          currentState: item.animationState || "eat",
          lastTickTimestamp: Date.now(),
        });

        // Volta para idle após comer
        setTimeout(() => {
          if (get().currentState === (item.animationState || "eat")) {
            set({ currentState: "happy" });
            setTimeout(() => set({ currentState: "idle" }), 2000);
          }
        }, 3000);
      },

      giveDrink: (item: PetItem) => {
        const { stats } = get();
        const ef = item.effects;
        const newThirst = Math.min(100, Math.max(0, stats.thirst + (ef.thirst || 0)));
        const newHappiness = Math.min(100, Math.max(0, stats.happiness + (ef.happiness || 0)));
        let newXp = stats.bondXp + (ef.bondXp || 8);
        let newLevel = stats.bondLevel;
        let newMax = stats.bondXpMax;

        if (newXp >= newMax) {
          newXp -= newMax;
          newLevel += 1;
          newMax = Math.round(newMax * 1.35);
        }

        set({
          stats: {
            ...stats,
            thirst: newThirst,
            happiness: newHappiness,
            bondXp: newXp,
            bondLevel: newLevel,
            bondXpMax: newMax,
          },
          currentState: "drink",
          lastTickTimestamp: Date.now(),
        });

        setTimeout(() => {
          if (get().currentState === "drink") {
            set({ currentState: "happy" });
            setTimeout(() => set({ currentState: "idle" }), 2000);
          }
        }, 2500);
      },

      playWithPet: (item: PetItem) => {
        const { stats } = get();
        const ef = item.effects;
        const newHappiness = Math.min(100, stats.happiness + (ef.happiness || 25));
        const newEnergy = Math.max(10, stats.energy + (ef.energy || -10));
        let newXp = stats.bondXp + (ef.bondXp || 20);
        let newLevel = stats.bondLevel;
        let newMax = stats.bondXpMax;

        if (newXp >= newMax) {
          newXp -= newMax;
          newLevel += 1;
          newMax = Math.round(newMax * 1.35);
        }

        set({
          stats: {
            ...stats,
            happiness: newHappiness,
            energy: newEnergy,
            bondXp: newXp,
            bondLevel: newLevel,
            bondXpMax: newMax,
          },
          currentState: "play",
          lastTickTimestamp: Date.now(),
        });

        setTimeout(() => {
          if (get().currentState === "play") {
            set({ currentState: "happy" });
            setTimeout(() => set({ currentState: "idle" }), 2500);
          }
        }, 3500);
      },

      bathPet: (item: PetItem) => {
        const { stats } = get();
        set({
          stats: {
            ...stats,
            hygiene: 100,
            happiness: Math.min(100, stats.happiness + 20),
            bondXp: stats.bondXp + 15,
          },
          currentState: "happy",
          lastTickTimestamp: Date.now(),
        });
        setTimeout(() => set({ currentState: "idle" }), 3000);
      },

      caressPet: (zone = "head") => {
        const { stats } = get();
        const newHappiness = Math.min(100, stats.happiness + 12);
        let newXp = stats.bondXp + 6;
        let newLevel = stats.bondLevel;
        let newMax = stats.bondXpMax;

        if (newXp >= newMax) {
          newXp -= newMax;
          newLevel += 1;
          newMax = Math.round(newMax * 1.35);
        }

        set({
          stats: {
            ...stats,
            happiness: newHappiness,
            bondXp: newXp,
            bondLevel: newLevel,
            bondXpMax: newMax,
          },
          currentState: zone === "head" ? "pet_head" : "pet_body",
          lastTickTimestamp: Date.now(),
        });

        setTimeout(() => {
          if (get().currentState.startsWith("pet_")) {
            set({ currentState: "idle" });
          }
        }, 2200);
      },

      putToSleep: () => {
        set({ currentState: "sleep", lastTickTimestamp: Date.now() });
      },

      wakeUpPet: () => {
        set({ currentState: "wake" });
        setTimeout(() => set({ currentState: "idle" }), 1500);
      },

      setPetState: (state: PetState, facing?: "left" | "right") => {
        set({
          currentState: state,
          ...(facing ? { facing } : {}),
        });
      },

      // Controle da Janela do Companion no Desktop
      spawnPetOnDesktop: async () => {
        const { config, activeCharacterId } = get();
        try {
          await invoke("companion_open_window", {
            companionId: activeCharacterId,
            width: Math.round(140 * (config.scale || 1)),
            height: Math.round(140 * (config.scale || 1)),
            x: config.x || 200,
            y: config.y || 350,
          });
          set({ isDesktopActive: true });
        } catch (e) {
          console.warn("Companion desktop open warning:", e);
          set({ isDesktopActive: true });
        }
      },

      closePetOnDesktop: async () => {
        const { activeCharacterId } = get();
        try {
          await invoke("companion_close_window", {
            companionId: activeCharacterId,
          });
        } catch {}
        set({ isDesktopActive: false });
      },

      togglePetDesktop: async () => {
        const { isDesktopActive } = get();
        if (isDesktopActive) {
          await get().closePetOnDesktop();
        } else {
          await get().spawnPetOnDesktop();
        }
      },

      updateConfig: (updates: Partial<PetInstanceConfig>) => {
        set({ config: { ...get().config, ...updates } });
      },

      // Salva personagem criado no Editor de Personagens
      saveCustomCharacter: (character: PetCharacterManifest) => {
        const { customCharacters } = get();
        const existingIdx = customCharacters.findIndex((c) => c.id === character.id);
        let updated: PetCharacterManifest[];
        if (existingIdx >= 0) {
          updated = [...customCharacters];
          updated[existingIdx] = character;
        } else {
          updated = [character, ...customCharacters];
        }
        set({ customCharacters: updated });
      },

      deleteCustomCharacter: (characterId: string) => {
        const { customCharacters, activeCharacterId } = get();
        const updated = customCharacters.filter((c) => c.id !== characterId);
        set({
          customCharacters: updated,
          activeCharacterId:
            activeCharacterId === characterId ? "mimi-sakura" : activeCharacterId,
        });
      },
    }),
    {
      name: "pmm_vpet_character_store",
    }
  )
);
