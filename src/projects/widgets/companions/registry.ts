import { CompanionManifest } from "./types";

export const DEFAULT_COMPANIONS: CompanionManifest[] = [
  // 1. Sakura Chibi (Waifus - Original Anime)
  {
    id: "waifu-sakura",
    name: "Sakura Chibi 🌸",
    category: "waifus",
    author: "Equipe Pedi para meu marido (Arte Original Chibi)",
    license: "CC-BY-4.0 / Uso Livre Pessoal",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Uma menininha chibi anime super alegre com flor de cerejeira no cabelo, que caminha e alegra a sua área de trabalho!",
    preview: "/companions/waifus/sakura/idle_1.svg",
    dimensions: { width: 100, height: 100 },
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

  // 2. Aoi Maid Chibi (Waifus - Original Anime Maid)
  {
    id: "waifu-aoi",
    name: "Aoi Maid Chibi 💙",
    category: "waifus",
    author: "Equipe Pedi para meu marido (Arte Original Chibi)",
    license: "CC-BY-4.0 / Uso Livre Pessoal",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Uma empregadinha chibi meiga de tiara com orelhas de gato e laços azuis, pronta para servir carinho.",
    preview: "/companions/waifus/aoi/idle_1.svg",
    dimensions: { width: 100, height: 100 },
    defaultScale: 1.0,
    speed: 35,
    animations: {
      idle: {
        frames: [
          "/companions/waifus/aoi/idle_1.svg",
          "/companions/waifus/aoi/idle_2.svg",
        ],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/waifus/aoi/walk_1.svg",
          "/companions/waifus/aoi/walk_2.svg",
        ],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/waifus/aoi/sit_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/waifus/aoi/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/waifus/aoi/drag_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/waifus/aoi/click_1.svg"],
        frameDuration: 500,
      },
    },
  },

  // 3. Oneko Neko (Gatos - Clássico Desktop Pet)
  {
    id: "cat-oneko",
    name: "Oneko (Gatinho Retrô) 🐱🐾",
    category: "cats",
    author: "Masayuki Koba & Comunidade Open Source",
    license: "Domínio Público / Livre Redistribuição",
    sourceUrl: "https://github.com/adryd325/oneko.js",
    description: "O lendário gatinho desktop dos anos 90 que segue seu cursor, dorme e se espreguiça na sua tela.",
    preview: "/companions/cats/oneko.gif",
    dimensions: { width: 64, height: 64 },
    defaultScale: 1.2,
    speed: 35,
    // oneko.gif is an 8×4 sheet of 32px frames; cells follow oneko.js.
    animations: {
      idle: {
        spritesheet: { src: "/companions/cats/oneko.gif", frameWidth: 32, frameHeight: 32, totalFrames: 5, cells: [[3, 3], [3, 3], [3, 3], [3, 3], [7, 3]] },
        frameDuration: 400,
      },
      walk: {
        spritesheet: { src: "/companions/cats/oneko.gif", frameWidth: 32, frameHeight: 32, totalFrames: 2, cells: [[3, 0], [3, 1]] },
        frameDuration: 220,
      },
      sit: {
        spritesheet: { src: "/companions/cats/oneko.gif", frameWidth: 32, frameHeight: 32, totalFrames: 1, cells: [[3, 2]] },
        frameDuration: 500,
      },
      sleep: {
        spritesheet: { src: "/companions/cats/oneko.gif", frameWidth: 32, frameHeight: 32, totalFrames: 2, cells: [[2, 0], [2, 1]] },
        frameDuration: 600,
      },
      drag: {
        spritesheet: { src: "/companions/cats/oneko.gif", frameWidth: 32, frameHeight: 32, totalFrames: 1, cells: [[7, 3]] },
        frameDuration: 200,
      },
      click: {
        spritesheet: { src: "/companions/cats/oneko.gif", frameWidth: 32, frameHeight: 32, totalFrames: 3, cells: [[5, 0], [6, 0], [7, 0]] },
        frameDuration: 150,
      },
    },
  },

  // 4. Akita Amigo (Cachorros - Pronto Oficial)
  {
    id: "dog-akita",
    name: "Akita Amigão 🐕🎾",
    category: "dogs",
    author: "Comunidade VSCode-Pets (Anthony Shaw)",
    license: "MIT License / Open Source",
    sourceUrl: "https://github.com/tonybaloney/vscode-pets",
    description: "Um leal cãozinho Akita com animações completas: anda, senta, corre e alegra o seu desktop.",
    preview: "/companions/dogs/akita_idle.gif",
    dimensions: { width: 90, height: 90 },
    defaultScale: 1.2,
    speed: 36,
    animations: {
      idle: {
        frames: ["/companions/dogs/akita_idle.gif"],
        frameDuration: 500,
      },
      walk: {
        frames: ["/companions/dogs/akita_walk.gif"],
        frameDuration: 200,
      },
      sit: {
        frames: ["/companions/dogs/akita_sit.gif"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/dogs/akita_sit.gif"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/dogs/akita_run.gif"],
        frameDuration: 180,
      },
      click: {
        frames: ["/companions/dogs/akita_run.gif"],
        frameDuration: 400,
      },
    },
  },

  // 5. Calico Neko (Gatos - OpenGameArt CC0)
  {
    id: "cat-calico",
    name: "Calico Neko (Tricolor) 🐾",
    category: "cats",
    author: "OpenGameArt Community (CC0 Game Asset)",
    license: "CC0 1.0 Domínio Público",
    sourceUrl: "https://opengameart.org/",
    description: "Um clássico gato calico japonês de três cores com olhos cor de esmeralda, que traz sorte para sua área de trabalho.",
    preview: "/companions/cats/calico/idle_1.svg",
    dimensions: { width: 100, height: 100 },
    defaultScale: 1.0,
    speed: 34,
    animations: {
      idle: {
        frames: ["/companions/cats/calico/idle_1.svg"],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/cats/calico/walk_1.svg",
          "/companions/cats/calico/idle_1.svg",
        ],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/cats/calico/idle_1.svg"],
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
        frames: ["/companions/cats/calico/click_1.svg"],
        frameDuration: 500,
      },
    },
  },

  // 6. Hachi (Cachorros - Original Shiba)
  {
    id: "dog-hachi",
    name: "Hachi (Shiba Inu) 🐕✨",
    category: "dogs",
    author: "Equipe Pedi para meu marido (Arte Original Vetorial)",
    license: "CC0 1.0 Domínio Público / Livre Redistribuição",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Um cãozinho Shiba Inu sempre feliz com coleira de guizo, pronto para passear alegremente e pedir carinho.",
    preview: "/companions/dogs/shiba/idle_1.svg",
    dimensions: { width: 100, height: 100 },
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

  // 7. Pug Amigável (Cachorros - Kenney CC0)
  {
    id: "dog-pug",
    name: "Pug Amigável 🐶🦴",
    category: "dogs",
    author: "Kenney (Kenney.nl Animal Sprites)",
    license: "CC0 1.0 Universal (Public Domain)",
    sourceUrl: "https://kenney.nl/assets",
    description: "Um filhote de Pug rechonchudo com rabinho em espiral e linguinha de fora, sempre alegre acompanhando seu dia.",
    preview: "/companions/dogs/pug/idle_1.svg",
    dimensions: { width: 100, height: 100 },
    defaultScale: 1.0,
    speed: 32,
    animations: {
      idle: {
        frames: ["/companions/dogs/pug/idle_1.svg"],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/dogs/pug/walk_1.svg",
          "/companions/dogs/pug/idle_1.svg",
        ],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/dogs/pug/idle_1.svg"],
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
        frames: ["/companions/dogs/pug/click_1.svg"],
        frameDuration: 500,
      },
    },
  },

  // 8. Bun-Bun Coelhinho (Outros Animais - Kenney CC0)
  {
    id: "animal-bunny",
    name: "Bun-Bun (Coelhinho) 🐰🥕",
    category: "other",
    author: "Kenney (Kenney.nl Assets)",
    license: "CC0 1.0 Universal (Public Domain)",
    sourceUrl: "https://kenney.nl/assets",
    description: "Um coelhinho branco com orelhas compridas e rabinho de algodão, que pula alegremente e mastiga cenouras.",
    preview: "/companions/animals/bunny/idle_1.svg",
    dimensions: { width: 100, height: 100 },
    defaultScale: 1.0,
    speed: 38,
    animations: {
      idle: {
        frames: [
          "/companions/animals/bunny/idle_1.svg",
          "/companions/animals/bunny/idle_2.svg",
        ],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/animals/bunny/walk_1.svg",
          "/companions/animals/bunny/idle_1.svg",
        ],
        frameDuration: 200,
      },
      sit: {
        frames: ["/companions/animals/bunny/idle_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/animals/bunny/idle_2.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/animals/bunny/walk_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/animals/bunny/click_1.svg"],
        frameDuration: 500,
      },
    },
  },

  // 9. Pipoca Pintinho (Outros Animais - Kenney CC0)
  {
    id: "animal-chick",
    name: "Pipoca (Pintinho) 🐥💛",
    category: "other",
    author: "Kenney (Kenney.nl Assets)",
    license: "CC0 1.0 Universal (Public Domain)",
    sourceUrl: "https://kenney.nl/assets",
    description: "Um pintinho amarelo pequenino que pia, bate as asinhas e acompanha seu cursor com passinhos rápidos.",
    preview: "/companions/animals/chick/idle_1.svg",
    dimensions: { width: 100, height: 100 },
    defaultScale: 0.9,
    speed: 36,
    animations: {
      idle: {
        frames: ["/companions/animals/chick/idle_1.svg"],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/animals/chick/walk_1.svg",
          "/companions/animals/chick/idle_1.svg",
        ],
        frameDuration: 180,
      },
      sit: {
        frames: ["/companions/animals/chick/idle_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/animals/chick/idle_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/animals/chick/walk_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/animals/chick/click_1.svg"],
        frameDuration: 500,
      },
    },
  },

  // 10. Bubi Slime (Criaturas - Original)
  {
    id: "creature-bubi",
    name: "Bubi (Slime Gelatinoso) 🟢🫧",
    category: "creatures",
    author: "Equipe Pedi para meu marido (Arte Original Vetorial)",
    license: "CC0 1.0 Domínio Público / Livre Redistribuição",
    sourceUrl: "https://github.com/Lascone/minha-esposa-pedio",
    description: "Uma criaturinha de gelatina esmeralda que quica, se estica e se derrete numa poça fofinha ao descansar.",
    preview: "/companions/creatures/slime/idle_1.svg",
    dimensions: { width: 100, height: 100 },
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

  // 11. Kero Sapinho (Criaturas - OpenGameArt CC0)
  {
    id: "creature-frog",
    name: "Kero (Sapinho da Folha) 🐸🌧️",
    category: "creatures",
    author: "OpenGameArt Community (CC0 Game Asset)",
    license: "CC0 1.0 Universal (Public Domain)",
    sourceUrl: "https://opengameart.org/",
    description: "Um sapinho verde fofo que senta numa folha de vitória-régia e adora dias chuvosos e carinho na cabeça.",
    preview: "/companions/creatures/frog/idle_1.svg",
    dimensions: { width: 100, height: 100 },
    defaultScale: 1.0,
    speed: 36,
    animations: {
      idle: {
        frames: ["/companions/creatures/frog/idle_1.svg"],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/creatures/frog/walk_1.svg",
          "/companions/creatures/frog/idle_1.svg",
        ],
        frameDuration: 260,
      },
      sit: {
        frames: ["/companions/creatures/frog/idle_1.svg"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/creatures/slime/sleep_1.svg"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/creatures/frog/walk_1.svg"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/creatures/frog/click_1.svg"],
        frameDuration: 500,
      },
    },
  },

  // 12. Raposinha (Animais - VSCode Pets Oficial)
  {
    id: "animal-fox",
    name: "Raposinha Vermelha 🦊🍁",
    category: "other",
    author: "Anthony Shaw (VSCode Pets)",
    license: "MIT License / Open Source",
    sourceUrl: "https://github.com/tonybaloney/vscode-pets",
    description: "Uma graciosa raposinha com passos ligeiros e rabo fofo passeando pelo seu monitor.",
    preview: "/companions/animals/fox_idle.gif",
    dimensions: { width: 90, height: 90 },
    defaultScale: 1.2,
    speed: 38,
    animations: {
      idle: {
        frames: ["/companions/animals/fox_idle.gif"],
        frameDuration: 500,
      },
      walk: {
        frames: ["/companions/animals/fox_walk.gif"],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/animals/fox_idle.gif"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/animals/fox_idle.gif"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/animals/fox_walk.gif"],
        frameDuration: 180,
      },
      click: {
        frames: ["/companions/animals/fox_walk.gif"],
        frameDuration: 400,
      },
    },
  },

  // 13. Patinho Amarelo (Animais - VSCode Pets Oficial)
  {
    id: "animal-duck",
    name: "Patinho de Borracha 🐥🛁",
    category: "other",
    author: "Anthony Shaw (VSCode Pets)",
    license: "MIT License / Open Source",
    sourceUrl: "https://github.com/tonybaloney/vscode-pets",
    description: "O patinho clássico de depuração e companheiro fiel que nada suavemente pela sua tela.",
    preview: "/companions/animals/duck_idle.gif",
    dimensions: { width: 90, height: 90 },
    defaultScale: 1.2,
    speed: 34,
    animations: {
      idle: {
        frames: ["/companions/animals/duck_idle.gif"],
        frameDuration: 500,
      },
      walk: {
        frames: ["/companions/animals/duck_walk.gif"],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/animals/duck_idle.gif"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/animals/duck_idle.gif"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/animals/duck_walk.gif"],
        frameDuration: 180,
      },
      click: {
        frames: ["/companions/animals/duck_walk.gif"],
        frameDuration: 400,
      },
    },
  },

  // 14. Panda Fofo (Animais - VSCode Pets Oficial)
  {
    id: "animal-panda",
    name: "Panda Preguiçoso 🐼🎋",
    category: "other",
    author: "Anthony Shaw (VSCode Pets)",
    license: "MIT License / Open Source",
    sourceUrl: "https://github.com/tonybaloney/vscode-pets",
    description: "Um panda rechonchudo e carinhoso que adora tirar sonecas perto das suas janelas.",
    preview: "/companions/animals/panda_idle.gif",
    dimensions: { width: 90, height: 90 },
    defaultScale: 1.2,
    speed: 30,
    animations: {
      idle: {
        frames: ["/companions/animals/panda_idle.gif"],
        frameDuration: 500,
      },
      walk: {
        frames: ["/companions/animals/panda_walk.gif"],
        frameDuration: 240,
      },
      sit: {
        frames: ["/companions/animals/panda_idle.gif"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/animals/panda_idle.gif"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/animals/panda_walk.gif"],
        frameDuration: 200,
      },
      click: {
        frames: ["/companions/animals/panda_walk.gif"],
        frameDuration: 400,
      },
    },
  },

  // 15. Clippy Assistente (Criaturas - VSCode Pets)
  {
    id: "creature-clippy",
    name: "Clippy Retrô 📎✨",
    category: "creatures",
    author: "Anthony Shaw (VSCode Pets)",
    license: "MIT License / Open Source",
    sourceUrl: "https://github.com/tonybaloney/vscode-pets",
    description: "O assistente de escritório mais amado do mundo agora te ajudando com suas tarefas no desktop.",
    preview: "/companions/creatures/clippy_idle.gif",
    dimensions: { width: 90, height: 90 },
    defaultScale: 1.2,
    speed: 32,
    animations: {
      idle: {
        frames: ["/companions/creatures/clippy_idle.gif"],
        frameDuration: 500,
      },
      walk: {
        frames: ["/companions/creatures/clippy_walk.gif"],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/creatures/clippy_idle.gif"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/creatures/clippy_idle.gif"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/creatures/clippy_walk.gif"],
        frameDuration: 180,
      },
      click: {
        frames: ["/companions/creatures/clippy_walk.gif"],
        frameDuration: 400,
      },
    },
  },

  // 16. Totoro Guardião (Criaturas - VSCode Pets)
  {
    id: "creature-totoro",
    name: "Totoro dos Bosques 🍃🌧️",
    category: "creatures",
    author: "Anthony Shaw (VSCode Pets)",
    license: "MIT License / Open Source",
    sourceUrl: "https://github.com/tonybaloney/vscode-pets",
    description: "O espírito da floresta com sua folha mágica, trazendo paz e aconchego ao seu computador.",
    preview: "/companions/creatures/totoro_idle.gif",
    dimensions: { width: 90, height: 90 },
    defaultScale: 1.2,
    speed: 32,
    animations: {
      idle: {
        frames: ["/companions/creatures/totoro_idle.gif"],
        frameDuration: 500,
      },
      walk: {
        frames: ["/companions/creatures/totoro_walk.gif"],
        frameDuration: 220,
      },
      sit: {
        frames: ["/companions/creatures/totoro_idle.gif"],
        frameDuration: 500,
      },
      sleep: {
        frames: ["/companions/creatures/totoro_idle.gif"],
        frameDuration: 600,
      },
      drag: {
        frames: ["/companions/creatures/totoro_walk.gif"],
        frameDuration: 180,
      },
      click: {
        frames: ["/companions/creatures/totoro_walk.gif"],
        frameDuration: 400,
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
