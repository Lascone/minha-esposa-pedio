import { CompanionManifest } from "./types";

export const DEFAULT_COMPANIONS: CompanionManifest[] = [
  {
    id: "waifu-sakura",
    name: "Sakura Chibi 🌸",
    category: "waifus",
    author: "Equipe Pedi para meu marido (Arte Original Chibi)",
    license: "CC-BY-4.0 / Uso Livre Pessoal",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Uma menininha chibi anime super alegre com flor de cerejeira no cabelo, que caminha e alegra a sua área de trabalho!",
    preview: "/companions/waifus/sakura/idle_1.svg",
    dimensions: {
      width: 100,
      height: 100,
    },
    defaultScale: 1.0,
    speed: 35,
    animations: {
      idle: {
        frames: [
          "/companions/waifus/sakura/idle_1.svg",
          "/companions/waifus/sakura/idle_2.svg",
        ],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/waifus/sakura/walk_1.svg",
          "/companions/waifus/sakura/walk_2.svg",
        ],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/waifus/sakura/sit_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/waifus/sakura/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/waifus/sakura/drag_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/waifus/sakura/click_1.svg"],
        frameDuration: 500,
      },
    },
  },
  {
    id: "cat-mimi",
    name: "Mimi (Gatinha Flor) 🐱🌸",
    category: "cats",
    author: "Projeto Pedi para meu marido (Acervo de Arte do Projeto)",
    license: "Uso Livre com Atribuição (CC-BY-SA)",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Uma gatinha branca fofinha dos sonhos, com bochechas rosinhas e uma florzinha na ponta do rabinho.",
    preview: "/companions/cats/gatinho branco 1.png",
    dimensions: {
      width: 100,
      height: 100,
    },
    defaultScale: 1.0,
    speed: 30,
    animations: {
      idle: {
        frames: [
          "/companions/cats/gatinho branco 1.png",
          "/companions/cats/mimi/click_1.svg",
        ],
        frameDuration: 550,
      },
      walk: {
        frames: [
          "/companions/cats/gatinho branco 2.png",
          "/companions/cats/gatinho branco 1.png",
        ],
        frameDuration: 260,
      },
      sit: {
        frames: ["/companions/cats/gatinho branco 1.png"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/cats/mimi/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/cats/mimi/drag_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/cats/mimi/click_1.svg"],
        frameDuration: 600,
      },
    },
  },
  {
    id: "cat-kuro",
    name: "Kuro (Gatinho Noturno) 🐾✨",
    category: "cats",
    author: "Projeto Pedi para meu marido (Acervo de Arte do Projeto)",
    license: "Uso Livre com Atribuição (CC-BY-SA)",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Um gatinho preto carinhoso com orelhas arroxeadas e olhos brilhantes, curioso por cada cantinho do seu monitor.",
    preview: "/companions/cats/gatinho preto 2.png",
    dimensions: {
      width: 100,
      height: 100,
    },
    defaultScale: 1.0,
    speed: 32,
    animations: {
      idle: {
        frames: [
          "/companions/cats/gatinho preto 2.png",
          "/companions/cats/gatinho preto 1.png",
        ],
        frameDuration: 500,
      },
      walk: {
        frames: [
          "/companions/cats/gatinho preto 3.png",
          "/companions/cats/gatinho preto 1.png",
        ],
        frameDuration: 250,
      },
      sit: {
        frames: ["/companions/cats/gatinho preto 2.png"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/cats/mimi/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/cats/mimi/drag_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/cats/mimi/click_1.svg"],
        frameDuration: 500,
      },
    },
  },
  {
    id: "dog-hachi",
    name: "Hachi (Shiba Inu) 🐕✨",
    category: "dogs",
    author: "Equipe Pedi para meu marido (Arte Original Vetorial)",
    license: "CC0 1.0 Domínio Público / Livre Redistribuição",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Um cãozinho Shiba Inu sempre feliz com coleira de guizo, pronto para passear alegremente e pedir carinho.",
    preview: "/companions/dogs/shiba/idle_1.svg",
    dimensions: {
      width: 100,
      height: 100,
    },
    defaultScale: 1.0,
    speed: 40,
    animations: {
      idle: {
        frames: [
          "/companions/dogs/shiba/idle_1.svg",
          "/companions/dogs/shiba/idle_2.svg",
        ],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/dogs/shiba/walk_1.svg",
          "/companions/dogs/shiba/walk_2.svg",
        ],
        frameDuration: 200,
      },
      sit: {
        frames: ["/companions/dogs/shiba/sit_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/dogs/shiba/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/dogs/shiba/drag_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/dogs/shiba/click_1.svg"],
        frameDuration: 500,
      },
    },
  },
  {
    id: "creature-bubi",
    name: "Bubi (Slime Gelatinoso) 🟢🫧",
    category: "creatures",
    author: "Equipe Pedi para meu marido (Arte Original Vetorial)",
    license: "CC0 1.0 Domínio Público / Livre Redistribuição",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Uma criaturinha de gelatina esmeralda que quica, se estica e se derrete numa poça fofinha ao descansar.",
    preview: "/companions/creatures/slime/idle_1.svg",
    dimensions: {
      width: 100,
      height: 100,
    },
    defaultScale: 1.0,
    speed: 28,
    animations: {
      idle: {
        frames: [
          "/companions/creatures/slime/idle_1.svg",
          "/companions/creatures/slime/idle_2.svg",
        ],
        frameDuration: 450,
      },
      walk: {
        frames: [
          "/companions/creatures/slime/walk_1.svg",
          "/companions/creatures/slime/walk_2.svg",
        ],
        frameDuration: 240,
      },
      sit: {
        frames: ["/companions/creatures/slime/sit_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/creatures/slime/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/creatures/slime/drag_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/creatures/slime/click_1.svg"],
        frameDuration: 500,
      },
    },
  },
];

export const getCompanionManifest = (
  id: string,
  customList: CompanionManifest[] = []
): CompanionManifest | undefined => {
  return (
    customList.find((c) => c.id === id) ||
    DEFAULT_COMPANIONS.find((c) => c.id === id)
  );
};
