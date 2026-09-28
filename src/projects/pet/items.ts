import { PetItem } from "./types";

export const DEFAULT_PET_ITEMS: PetItem[] = [
  // Comidas
  {
    id: "food-strawberry",
    name: "Morango Fresquinho",
    category: "food",
    icon: "🍓",
    desc: "Um moranguinho doce e suculento para adoçar o dia.",
    effects: { hunger: +25, happiness: +15, bondXp: +10 },
    animationState: "eat",
  },
  {
    id: "food-sashimi",
    name: "Sashimi de Salmão",
    category: "food",
    icon: "🐟",
    desc: "Fatia fresquinha de peixe, a favorita dos gatinhos!",
    effects: { hunger: +40, happiness: +20, bondXp: +15 },
    animationState: "eat",
  },
  {
    id: "food-cake",
    name: "Bolo de Baunilha",
    category: "food",
    icon: "🍰",
    desc: "Pedaço de bolo fofinho com chantilly e amor.",
    effects: { hunger: +35, happiness: +30, energy: +10, bondXp: +20 },
    animationState: "eat",
  },
  {
    id: "food-croissant",
    name: "Croissant Quentinho",
    category: "food",
    icon: "🥐",
    desc: "Crocante por fora e macio por dentro.",
    effects: { hunger: +30, happiness: +15, bondXp: +10 },
    animationState: "eat",
  },

  // Bebidas
  {
    id: "drink-milk",
    name: "Tigelinha de Leite",
    category: "drink",
    icon: "🥛",
    desc: "Leitinho morno que conforta o coração.",
    effects: { thirst: +35, energy: +15, bondXp: +10 },
    animationState: "drink",
  },
  {
    id: "drink-water",
    name: "Águinha Fresca",
    category: "drink",
    icon: "💧",
    desc: "Água cristalina da fonte para matar a sede.",
    effects: { thirst: +50, happiness: +10, bondXp: +5 },
    animationState: "drink",
  },
  {
    id: "drink-boba",
    name: "Boba Tea Geladinho",
    category: "drink",
    icon: "🧋",
    desc: "Chá com bolinhas de tapioca, super na moda!",
    effects: { thirst: +40, happiness: +25, energy: +10, bondXp: +15 },
    animationState: "drink",
  },

  // Brinquedos
  {
    id: "toy-yarn",
    name: "Novelo de Lã Rosa",
    category: "toy",
    icon: "🧶",
    desc: "Perfeito para rolar e perseguir pela tela toda.",
    effects: { happiness: +35, energy: -15, bondXp: +20 },
    animationState: "play",
  },
  {
    id: "toy-console",
    name: "Mini Videogame",
    category: "toy",
    icon: "🎮",
    desc: "Jogos divertidos para passar o tempo juntos.",
    effects: { happiness: +40, energy: -10, bondXp: +25 },
    animationState: "play",
  },
  {
    id: "toy-teddy",
    name: "Ursinho de Pelúcia",
    category: "toy",
    icon: "🧸",
    desc: "Um amiguinho fofinho para abraçar na soneca.",
    effects: { happiness: +30, bondXp: +20 },
    animationState: "play",
  },

  // Higiene
  {
    id: "bath-bubble",
    name: "Banho de Espuma",
    category: "bath",
    icon: "🧼",
    desc: "Bolhas perfumadas de lavanda que deixam o pelo cheiroso!",
    effects: { hygiene: +60, happiness: +20, bondXp: +20 },
    animationState: "happy",
  },
  {
    id: "bath-brush",
    name: "Escovinha Macia",
    category: "bath",
    icon: "🪥",
    desc: "Penteia os pelos com carinho e remove todos os nozinhos.",
    effects: { hygiene: +40, happiness: +25, bondXp: +15 },
    animationState: "pet_head",
  },
];
