import { describe, it, expect, beforeEach } from "vitest";
import { usePetStore } from "../src/projects/pet/store/petStore";
import { DEFAULT_PET_ITEMS } from "../src/projects/pet/items";
import { MIMI_CHARACTER } from "../src/projects/pet/presets";
import { PetCharacterManifest } from "../src/projects/pet/types";

describe("Módulo Bichinho Virtual (VPet)", () => {
  beforeEach(() => {
    // Reset para valores padrão
    usePetStore.setState({
      activeCharacterId: "mimi-sakura",
      customName: "Mimi",
      stats: {
        hunger: 80,
        thirst: 80,
        energy: 90,
        hygiene: 95,
        happiness: 90,
        bondLevel: 1,
        bondXp: 0,
        bondXpMax: 100,
      },
      lastTickTimestamp: Date.now(),
      currentState: "idle",
      isDesktopActive: false,
      customCharacters: [],
    });
  });

  it("deve carregar o personagem padrão Mimi Sakura com falas em português", () => {
    const char = usePetStore.getState().getActiveCharacter();
    expect(char.id).toBe("mimi-sakura");
    expect(char.name).toBe("Mimi Sakura");
    expect(char.voiceLines.greetings.length).toBeGreaterThan(0);
    expect(char.animations.idle.frames.length).toBeGreaterThan(0);
  });

  it("deve alimentar o pet e aumentar a saciedade e XP de vínculo", () => {
    const food = DEFAULT_PET_ITEMS.find((i) => i.id === "food-strawberry")!;
    expect(food).toBeDefined();

    usePetStore.setState({
      stats: {
        ...usePetStore.getState().stats,
        hunger: 40,
        bondXp: 10,
      },
    });

    usePetStore.getState().feedPet(food);
    const updatedStats = usePetStore.getState().stats;

    expect(updatedStats.hunger).toBeGreaterThan(40);
    expect(updatedStats.bondXp).toBeGreaterThan(10);
  });

  it("deve hidratar o pet e recarregar a sede", () => {
    const drink = DEFAULT_PET_ITEMS.find((i) => i.id === "drink-water")!;
    expect(drink).toBeDefined();

    usePetStore.setState({
      stats: {
        ...usePetStore.getState().stats,
        thirst: 30,
      },
    });

    usePetStore.getState().giveDrink(drink);
    expect(usePetStore.getState().stats.thirst).toBeGreaterThan(30);
  });

  it("deve calcular a passagem de tempo sem nunca matar o bichinho ou zerar estatísticas", () => {
    // Simula 3 dias sem abrir o aplicativo
    const threeDaysAgo = Date.now() - 3 * 24 * 3600 * 1000;
    usePetStore.setState({
      lastTickTimestamp: threeDaysAgo,
      stats: {
        hunger: 80,
        thirst: 80,
        energy: 90,
        hygiene: 95,
        happiness: 90,
        bondLevel: 1,
        bondXp: 50,
        bondXpMax: 100,
      },
    });

    usePetStore.getState().processTimePassage();
    const stats = usePetStore.getState().stats;

    // Garante que os limites seguros previnem a morte do mascote
    expect(stats.hunger).toBeGreaterThanOrEqual(15);
    expect(stats.thirst).toBeGreaterThanOrEqual(15);
    expect(stats.energy).toBeGreaterThanOrEqual(15);
    expect(stats.hygiene).toBeGreaterThanOrEqual(20);
    expect(stats.happiness).toBeGreaterThanOrEqual(25);
    expect(stats.bondLevel).toBe(1); // Não perde progresso de nível
  });

  it("deve recuperar energia enquanto estiver dormindo", () => {
    const oneHourAgo = Date.now() - 3600 * 1000;
    usePetStore.setState({
      lastTickTimestamp: oneHourAgo,
      currentState: "sleep",
      stats: {
        ...usePetStore.getState().stats,
        energy: 30,
      },
    });

    usePetStore.getState().processTimePassage();
    expect(usePetStore.getState().stats.energy).toBeGreaterThan(30);
  });

  it("deve salvar e selecionar novos personagens criados no Mod Maker", () => {
    const customPet: PetCharacterManifest = {
      version: "1.0.0",
      id: "chibi-luna",
      name: "Luna Estelar",
      author: "Esposa & Marido 💕",
      description: "Uma raposinha estelar cheia de carinho.",
      species: "Raposinha",
      previewImage: "",
      defaultScale: 1.2,
      moveSpeed: 70,
      hitbox: { width: 120, height: 120, offsetX: 0, offsetY: 0 },
      voiceLines: {
        greetings: ["Oie amorzinho! 💕"],
        hungry: ["Com fomezinha!"],
        thirsty: ["Quero água fresca!"],
        sleepy: ["Soninho..."],
        happy: ["Muito feliz!"],
        afterCare: ["Amo seu dengo!"],
        idle: ["Te vigiando com amor!"],
      },
      animations: MIMI_CHARACTER.animations,
    };

    usePetStore.getState().saveCustomCharacter(customPet);
    const all = usePetStore.getState().getAllCharacters();
    expect(all.some((c) => c.id === "chibi-luna")).toBe(true);

    usePetStore.getState().selectCharacter("chibi-luna");
    expect(usePetStore.getState().activeCharacterId).toBe("chibi-luna");
    expect(usePetStore.getState().getActiveCharacter().name).toBe("Luna Estelar");
  });
});
