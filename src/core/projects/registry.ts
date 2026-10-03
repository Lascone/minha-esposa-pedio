import { lazy } from "react";
import { ProjectDefinition } from "./types";

export const PROJECT_REGISTRY: ProjectDefinition[] = [
  {
    id: "crosshair",
    name: "Crosshair Studio",
    slug: "crosshair",
    icon: "🎯",
    description: "Uma mira do jeitinho que você quiser para jogar com estilo e precisão.",
    version: "1.0.0",
    coverGradient: "from-pink-400 via-rose-400 to-purple-500",
    category: "Jogos",
    createdAt: "2026-09-02",
    updatedAt: "2026-09-02",
    enabled: true,
    status: "active",
    tags: ["mira", "cs2", "overlay", "emojis", "ícones", "camadas"],
    route: "/projects/crosshair",
    component: lazy(() => import("@/projects/crosshair/CrosshairApp")),
  },
  {
    id: "autoclick",
    name: "Auto Click Studio",
    slug: "autoclick",
    icon: "🖱️",
    description: "Automação completa de cliques, teclas e sequências com alta precisão nativa.",
    version: "1.0.0",
    coverGradient: "from-purple-500 via-pink-500 to-rose-400",
    category: "Utilidades",
    createdAt: "2026-09-04",
    updatedAt: "2026-09-04",
    enabled: true,
    status: "active",
    tags: ["click", "macro", "automação", "teclado", "mouse", "alta precisão"],
    route: "/projects/autoclick",
    component: lazy(() => import("@/projects/autoclick/AutoClickApp")),
  },
  {
    id: "cozy-notes",
    name: "Bloco de Notas Fofo",
    slug: "cozy-notes",
    icon: "📝",
    description: "Anotações rápidas, listas de desejos e bilhetinhos carinhosos.",
    version: "0.1.0",
    coverGradient: "from-purple-400 via-pink-400 to-rose-300",
    category: "Mimos",
    createdAt: "2026-09-02",
    updatedAt: "2026-09-02",
    enabled: false,
    status: "in_development",
    tags: ["notas", "bilhetes", "organização"],
    route: "/projects/cozy-notes",
    component: lazy(() => import("@/projects/crosshair/CrosshairApp")), // Placeholder
  },
  {
    id: "movie-picker",
    name: "O Que Vamos Assistir?",
    slug: "movie-picker",
    icon: "🍿",
    description: "Sorteador de filmes e séries para acabar com a indecisão na sexta à noite.",
    version: "0.1.0",
    coverGradient: "from-amber-400 via-rose-400 to-pink-500",
    category: "Utilidades",
    createdAt: "2026-09-02",
    updatedAt: "2026-09-02",
    enabled: false,
    status: "planned",
    tags: ["filmes", "cinema", "sorteio"],
    route: "/projects/movie-picker",
    component: lazy(() => import("@/projects/crosshair/CrosshairApp")), // Placeholder
  },
];

export function getProjectBySlug(slug: string): ProjectDefinition | undefined {
  return PROJECT_REGISTRY.find((p) => p.slug === slug);
}
