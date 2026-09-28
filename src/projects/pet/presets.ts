import { PetCharacterManifest } from "./types";

// SVG procedurais de altíssima fofura para Mimi - Gatinha Sakura
const createMimiSvg = (expression: string, bodyExtra = "") => {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="fur" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23ffffff" />
        <stop offset="100%" stop-color="%23fce7f3" />
      </linearGradient>
      <linearGradient id="ear" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23f472b6" />
        <stop offset="100%" stop-color="%23fb7185" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="%23f43f5e" flood-opacity="0.25"/>
      </filter>
    </defs>
    <!-- Cauda fofa -->
    <path d="M 85 90 C 110 85, 115 60, 95 65 C 85 68, 88 85, 80 92 Z" fill="url(%23fur)" stroke="%23fda4af" stroke-width="2" />
    <!-- Orelhas -->
    <polygon points="35,45 20,15 50,30" fill="url(%23fur)" stroke="%23fda4af" stroke-width="2" />
    <polygon points="32,40 24,20 44,30" fill="url(%23ear)" />
    <polygon points="85,45 100,15 70,30" fill="url(%23fur)" stroke="%23fda4af" stroke-width="2" />
    <polygon points="88,40 96,20 76,30" fill="url(%23ear)" />
    <!-- Flor de Sakura na orelha -->
    <circle cx="36" cy="28" r="4" fill="%23f43f5e" />
    <circle cx="33" cy="24" r="3.5" fill="%23fbcfe8" opacity="0.9" />
    <circle cx="40" cy="25" r="3.5" fill="%23fbcfe8" opacity="0.9" />
    <circle cx="41" cy="32" r="3.5" fill="%23fbcfe8" opacity="0.9" />
    <circle cx="35" cy="33" r="3.5" fill="%23fbcfe8" opacity="0.9" />
    <circle cx="30" cy="29" r="3.5" fill="%23fbcfe8" opacity="0.9" />
    <circle cx="36" cy="28" r="2" fill="%23fef08a" />
    <!-- Corpo -->
    <ellipse cx="60" cy="85" rx="30" ry="24" fill="url(%23fur)" stroke="%23fda4af" stroke-width="2" filter="url(%23shadow)" />
    <!-- Cabeça -->
    <circle cx="60" cy="55" r="34" fill="url(%23fur)" stroke="%23fda4af" stroke-width="2" filter="url(%23shadow)" />
    <!-- Bochechas coradas -->
    <circle cx="38" cy="62" r="6" fill="%23fda4af" opacity="0.6" />
    <circle cx="82" cy="62" r="6" fill="%23fda4af" opacity="0.6" />
    <!-- Expressão dos olhos e boca -->
    ${expression}
    <!-- Patinhas da frente -->
    <ellipse cx="48" cy="98" rx="8" ry="6" fill="%23ffffff" stroke="%23fda4af" stroke-width="1.5" />
    <circle cx="48" cy="98" r="2.5" fill="%23f472b6" opacity="0.6" />
    <ellipse cx="72" cy="98" rx="8" ry="6" fill="%23ffffff" stroke="%23fda4af" stroke-width="1.5" />
    <circle cx="72" cy="98" r="2.5" fill="%23f472b6" opacity="0.6" />
    ${bodyExtra}
  </svg>`.replace(/\n\s+/g, "");
};

// Expressões específicas de cada estado
const EXP_IDLE_1 = `
  <!-- Olhos abertos fofos com brilho -->
  <ellipse cx="45" cy="53" rx="5.5" ry="7.5" fill="%231e293b" />
  <circle cx="43" cy="50" r="2.5" fill="%23ffffff" />
  <circle cx="47" cy="56" r="1.2" fill="%23ffffff" />
  <ellipse cx="75" cy="53" rx="5.5" ry="7.5" fill="%231e293b" />
  <circle cx="73" cy="50" r="2.5" fill="%23ffffff" />
  <circle cx="77" cy="56" r="1.2" fill="%23ffffff" />
  <!-- Narizinho e boca :3 -->
  <polygon points="60,60 57,58 63,58" fill="%23f43f5e" />
  <path d="M 55 63 C 58 65, 60 63, 60 61 C 60 63, 62 65, 65 63" fill="none" stroke="%23475569" stroke-width="1.8" stroke-linecap="round" />
`;

const EXP_IDLE_2 = `
  <!-- Piscada de olhos suave -->
  <path d="M 40 54 Q 45 51 50 54" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" />
  <path d="M 70 54 Q 75 51 80 54" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" />
  <polygon points="60,60 57,58 63,58" fill="%23f43f5e" />
  <path d="M 55 63 C 58 65, 60 63, 60 61 C 60 63, 62 65, 65 63" fill="none" stroke="%23475569" stroke-width="1.8" stroke-linecap="round" />
`;

const EXP_HAPPY = `
  <!-- Olhinhos em arco sorrindo ^_^ -->
  <path d="M 39 55 Q 45 47 51 55" fill="none" stroke="%231e293b" stroke-width="3" stroke-linecap="round" />
  <path d="M 69 55 Q 75 47 81 55" fill="none" stroke="%231e293b" stroke-width="3" stroke-linecap="round" />
  <polygon points="60,59 57,57 63,57" fill="%23f43f5e" />
  <!-- Boquinha aberta de alegria -->
  <path d="M 55 62 Q 60 70 65 62 Z" fill="%23f43f5e" stroke="%23be123c" stroke-width="1.2" />
  <ellipse cx="60" cy="65" rx="2.5" ry="1.5" fill="%23fda4af" />
  <!-- Corações no topo -->
  <path d="M 25 15 C 20 8, 12 18, 25 28 C 38 18, 30 8, 25 15 Z" fill="%23f43f5e" opacity="0.9" />
  <path d="M 95 18 C 90 12, 84 20, 95 28 C 106 20, 100 12, 95 18 Z" fill="%23f43f5e" opacity="0.9" />
`;

const EXP_SLEEP = `
  <!-- Olhos dormindo relaxados -->
  <path d="M 40 55 Q 45 59 50 55" fill="none" stroke="%23475569" stroke-width="2.5" stroke-linecap="round" />
  <path d="M 70 55 Q 75 59 80 55" fill="none" stroke="%23475569" stroke-width="2.5" stroke-linecap="round" />
  <polygon points="60,60 57,58 63,58" fill="%23f43f5e" />
  <path d="M 56 63 Q 60 66 64 63" fill="none" stroke="%23475569" stroke-width="1.8" stroke-linecap="round" />
  <!-- Zzz flutuando -->
  <text x="85" y="30" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23a855f7" opacity="0.9">Z</text>
  <text x="96" y="20" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23ec4899" opacity="0.9">Z</text>
  <text x="108" y="10" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23f43f5e">Z</text>
`;

const EXP_EAT = `
  <!-- Olhinhos saboreando -->
  <path d="M 39 54 Q 45 48 51 54" fill="none" stroke="%231e293b" stroke-width="2.8" stroke-linecap="round" />
  <path d="M 69 54 Q 75 48 81 54" fill="none" stroke="%231e293b" stroke-width="2.8" stroke-linecap="round" />
  <polygon points="60,59 57,57 63,57" fill="%23f43f5e" />
  <!-- Mastigando bochechuda -->
  <ellipse cx="60" cy="65" rx="6" ry="4" fill="%23f43f5e" />
  <!-- Peixinho na boquinha -->
  <polygon points="68,64 78,59 78,69" fill="%2338bdf8" />
  <circle cx="72" cy="64" r="1" fill="%23ffffff" />
`;

const EXP_DRINK = `
  <!-- Bebendo -->
  <path d="M 40 55 Q 45 51 50 55" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" />
  <path d="M 70 55 Q 75 51 80 55" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" />
  <polygon points="60,60 57,58 63,58" fill="%23f43f5e" />
  <circle cx="60" cy="65" r="3" fill="%2338bdf8" />
  <!-- Tigela de leite na frente -->
  <ellipse cx="60" cy="98" rx="18" ry="6" fill="%23e2e8f0" stroke="%2394a3b8" stroke-width="1.5" />
  <ellipse cx="60" cy="97" rx="14" ry="4" fill="%23ffffff" />
`;

const EXP_PET = `
  <!-- Ronronando de carinho absoluto -->
  <path d="M 38 54 Q 45 47 52 54" fill="none" stroke="%23be123c" stroke-width="3" stroke-linecap="round" />
  <path d="M 68 54 Q 75 47 82 54" fill="none" stroke="%23be123c" stroke-width="3" stroke-linecap="round" />
  <polygon points="60,59 57,57 63,57" fill="%23f43f5e" />
  <path d="M 55 63 C 58 66, 60 64, 60 62 C 60 64, 62 66, 65 63" fill="none" stroke="%23be123c" stroke-width="2" stroke-linecap="round" />
  <!-- Corações orbitando -->
  <path d="M 15 45 C 10 38, 4 46, 15 54 C 26 46, 20 38, 15 45 Z" fill="%23ec4899" />
  <path d="M 105 45 C 100 38, 94 46, 105 54 C 116 46, 110 38, 105 45 Z" fill="%23ec4899" />
`;

const EXP_DRAG = `
  <!-- Sendo erguida / balançando patinhas -->
  <ellipse cx="45" cy="52" rx="6" ry="8" fill="%231e293b" />
  <circle cx="43" cy="49" r="3" fill="%23ffffff" />
  <ellipse cx="75" cy="52" rx="6" ry="8" fill="%231e293b" />
  <circle cx="73" cy="49" r="3" fill="%23ffffff" />
  <ellipse cx="60" cy="64" rx="3.5" ry="4.5" fill="%23f43f5e" />
`;

export const MIMI_CHARACTER: PetCharacterManifest = {
  version: "1.0.0",
  id: "mimi-sakura",
  name: "Mimi Sakura",
  author: "Pedi para meu marido",
  description: "A gatinha oficial da sua área de trabalho. Ama cafuné, sachê de salmão e caminhar pelas suas janelas!",
  species: "Gatinha Sakura",
  previewImage: createMimiSvg(EXP_IDLE_1),
  defaultScale: 1.15,
  moveSpeed: 45,
  hitbox: {
    width: 100,
    height: 100,
    offsetX: 10,
    offsetY: 10,
  },
  voiceLines: {
    greetings: [
      "Bom dia, mamãe! Dormiu bem? 💕",
      "Você voltou! Tava com tanta saudade! ✨",
      "Miau! Que bom ver você no computador!",
      "Pronta para mais um dia juntinhas! 🌸",
    ],
    hungry: [
      "Minha barriguinha tá roncando... tem um sachê? 🐟",
      "Mamãe, esqueci como é comer! Me dá um lanchinho?",
      "Miau... uma comidinha gostosa ia tão bem agora!",
    ],
    thirsty: [
      "Tô com a gargantinha seca... me dá uma aguinha? 💧",
      "Um leitinho morno agora seria perfeito! 🥛",
    ],
    sleepy: [
      "Nhaaa... que soninho bom... vou cochilar um pouquinho! 💤",
      "Me coloca pra nanar, mamãe?",
      "Olhinhos pesando... Zzz...",
    ],
    happy: [
      "Você é a melhor mamãe do mundo todinho! 💖",
      "Tô tão feliz que meu coração tá quentinho! ✨",
      "Pulinho de alegria! Yaaay! 🐾",
      "Amando passar esse tempinho com você!",
    ],
    afterCare: [
      "Hummm... que delícia! Muito obrigada, mamãe! 🌸",
      "Amo quando você me faz cafuné! Purrr... 💕",
      "Pêlo escovadinho e cheiroso de flores! ✨",
      "Barriguinha cheia e coração feliz!",
    ],
    idle: [
      "Olhando os passarinhos voando lá fora... 🌿",
      "Amassando pãozinho na sua barra de tarefas! 🐾",
      "Tô aqui cuidando de você enquanto você usa o PC! 💕",
      "Adoro te ver mexendo no mouse!",
      "Miauuu... que dia gostoso!",
    ],
  },
  animations: {
    idle: {
      name: "idle",
      frames: [createMimiSvg(EXP_IDLE_1), createMimiSvg(EXP_IDLE_2)],
      frameDuration: 1200,
      loop: true,
    },
    walk: {
      name: "walk",
      frames: [createMimiSvg(EXP_IDLE_1), createMimiSvg(EXP_IDLE_1, `<ellipse cx="44" cy="96" rx="8" ry="6" fill="%23ffffff" />`)],
      frameDuration: 300,
      loop: true,
    },
    sleep: {
      name: "sleep",
      frames: [createMimiSvg(EXP_SLEEP)],
      frameDuration: 2000,
      loop: true,
    },
    wake: {
      name: "wake",
      frames: [createMimiSvg(EXP_IDLE_2), createMimiSvg(EXP_IDLE_1)],
      frameDuration: 600,
      loop: false,
    },
    happy: {
      name: "happy",
      frames: [createMimiSvg(EXP_HAPPY)],
      frameDuration: 800,
      loop: true,
    },
    sad: {
      name: "sad",
      frames: [createMimiSvg(EXP_IDLE_2)],
      frameDuration: 1000,
      loop: true,
    },
    hungry: {
      name: "hungry",
      frames: [createMimiSvg(EXP_IDLE_1)],
      frameDuration: 1000,
      loop: true,
    },
    eat: {
      name: "eat",
      frames: [createMimiSvg(EXP_EAT), createMimiSvg(EXP_HAPPY)],
      frameDuration: 400,
      loop: true,
    },
    drink: {
      name: "drink",
      frames: [createMimiSvg(EXP_DRINK)],
      frameDuration: 500,
      loop: true,
    },
    play: {
      name: "play",
      frames: [createMimiSvg(EXP_HAPPY), createMimiSvg(EXP_IDLE_1)],
      frameDuration: 350,
      loop: true,
    },
    pet_head: {
      name: "pet_head",
      frames: [createMimiSvg(EXP_PET)],
      frameDuration: 600,
      loop: true,
    },
    pet_body: {
      name: "pet_body",
      frames: [createMimiSvg(EXP_PET)],
      frameDuration: 600,
      loop: true,
    },
    drag: {
      name: "drag",
      frames: [createMimiSvg(EXP_DRAG)],
      frameDuration: 300,
      loop: true,
    },
    fall: {
      name: "fall",
      frames: [createMimiSvg(EXP_DRAG)],
      frameDuration: 200,
      loop: true,
    },
  },
};

export const DEFAULT_PRESET_CHARACTERS: PetCharacterManifest[] = [
  MIMI_CHARACTER,
];
