/**
 * Tipos e especificações para o módulo "Bichinho Virtual" (Desktop Pet)
 * Inspirado no ecossistema VPet com suporte nativo a estados, cuidados, falas e editor de personagens.
 */

export type PetState =
  | "idle"
  | "walk"
  | "sleep"
  | "wake"
  | "happy"
  | "sad"
  | "hungry"
  | "eat"
  | "drink"
  | "play"
  | "pet_head"
  | "pet_body"
  | "drag"
  | "fall";

export interface PetStats {
  hunger: number;     // 0 a 100 (100 = satisfeito, 0 = muita fome)
  thirst: number;     // 0 a 100 (100 = hidratado, 0 = com sede)
  energy: number;     // 0 a 100 (100 = descansado, 0 = exausto)
  hygiene: number;    // 0 a 100 (100 = limpinho, 0 = sujinho)
  happiness: number;  // 0 a 100 (100 = muito feliz, 0 = deprimido)
  bondLevel: number;  // Nível de amizade (1+)
  bondXp: number;     // Experiência atual
  bondXpMax: number;  // Experiência para o próximo nível
}

export interface PetVoiceLines {
  greetings: string[];   // Ao abrir o app ou acordar
  hungry: string[];      // Quando a fome cai
  thirsty: string[];     // Quando a sede cai
  sleepy: string[];      // Quando a energia está baixa
  happy: string[];       // Quando está muito feliz
  afterCare: string[];   // Ao receber carinho ou comida
  idle: string[];        // Falas aleatórias durante o dia
}

export interface PetAnimationDef {
  name: PetState;
  frames: string[];      // URLs, data URIs (Base64) ou paths locais
  frameDuration: number; // Duração de cada quadro em milissegundos
  loop?: boolean;        // Se repete continuamente
  flipHorizontal?: boolean; // Espelhar horizontalmente
}

export interface PetItem {
  id: string;
  name: string;
  category: "food" | "drink" | "toy" | "bath" | "special";
  icon: string;
  desc: string;
  effects: {
    hunger?: number;
    thirst?: number;
    energy?: number;
    hygiene?: number;
    happiness?: number;
    bondXp?: number;
  };
  animationState?: PetState;
}

export interface PetCharacterManifest {
  version: "1.0.0";
  id: string;
  name: string;
  author: string;
  description: string;
  species: string;       // ex: "Gatinha", "Chibi Waifu", "Ursinho", "Cachorrinho"
  previewImage: string;
  defaultScale: number;
  moveSpeed: number;     // Velocidade de caminhada no desktop (px/s)
  hitbox: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  voiceLines: PetVoiceLines;
  animations: Record<PetState, PetAnimationDef>;
  customItems?: PetItem[];
}

export interface PetInstanceConfig {
  petId: string;
  customName: string;
  scale: number;
  alwaysOnTop: boolean;
  isPaused: boolean;
  soundEnabled: boolean;
  moveAroundDesktop: boolean;
  selectedMonitor: number;
  x: number;
  y: number;
}
