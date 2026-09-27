export interface ModThemeOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  previewGradient: string;
  previewType: "taskbar" | "startmenu" | "explorer";
  config: {
    transparency?: boolean;
    centered?: boolean;
    compact?: boolean;
    floating?: boolean;
    acrylic?: boolean;
    noRecommendations?: boolean;
    cornerRadius?: number;
    margin?: number;
  };
}

export interface ModThemeDefinition {
  modId: string;
  title: string;
  description: string;
  defaultThemeId: string;
  themes: ModThemeOption[];
}

export const MOD_THEMES_CATALOG: Record<string, ModThemeDefinition> = {
  "windows-11-taskbar-styler": {
    modId: "windows-11-taskbar-styler",
    title: "Temas da Barra de Tarefas do Windows 11",
    description:
      "Escolha o visual desejado para a barra de tarefas antes ou após ativar o mod. Os temas personalizam transparência, cantos arredondados e formato flutuante.",
    defaultThemeId: "translucent-glass",
    themes: [
      {
        id: "translucent-glass",
        name: "Transparência Total (Aero Glass) 🪟",
        description: "Deixa a barra de tarefas 100% transparente e translúcida sobre o papel de parede com ícones nítidos.",
        badge: "Mais Popular",
        previewGradient: "from-blue-600/40 via-cyan-500/20 to-transparent",
        previewType: "taskbar",
        config: {
          transparency: true,
          acrylic: true,
          centered: true,
          floating: false,
        },
      },
      {
        id: "floating-dock",
        name: "Dock Flutuante (Estilo Mac / iPad) 🍏",
        description: "Transforma a barra em um dock flutuante com cantos super arredondados, margem inferior e fundo translúcido escuro.",
        badge: "Elegante",
        previewGradient: "from-purple-600/30 via-slate-900/80 to-pink-500/20",
        previewType: "taskbar",
        config: {
          transparency: true,
          floating: true,
          cornerRadius: 14,
          margin: 10,
          centered: true,
        },
      },
      {
        id: "compact-pill",
        name: "Pílula Compacta Centralizada 💊",
        description: "Formato em cápsula centralizada com ícones compactos e fundo acrílico escuro com borda suave.",
        badge: "Compacto",
        previewGradient: "from-slate-950 via-slate-900 to-indigo-950",
        previewType: "taskbar",
        config: {
          transparency: true,
          compact: true,
          centered: true,
          floating: true,
          cornerRadius: 20,
        },
      },
      {
        id: "frosted-acrylic",
        name: "Acrílico Fosco com Blur ❄️",
        description: "Efeito clássico de vidro fosco do Windows 11 Fluent Design com desfoque profundo e alta legibilidade.",
        badge: "Oficial Fluent",
        previewGradient: "from-white/20 via-slate-800/80 to-white/10",
        previewType: "taskbar",
        config: {
          transparency: true,
          acrylic: true,
          centered: true,
        },
      },
      {
        id: "classic-win10",
        name: "Clássico Windows 10 Retrô 🔲",
        description: "Alinha os ícones à esquerda junto ao botão Iniciar e utiliza estilo sólido retangular tradicional.",
        previewGradient: "from-slate-900 to-black",
        previewType: "taskbar",
        config: {
          transparency: false,
          centered: false,
          compact: false,
        },
      },
    ],
  },
  "windows-11-start-menu-styler": {
    modId: "windows-11-start-menu-styler",
    title: "Temas do Menu Iniciar do Windows 11",
    description: "Personalize a disposição do Menu Iniciar, ocultando itens desnecessários e ajustando transparência.",
    defaultThemeId: "clean-no-rec",
    themes: [
      {
        id: "clean-no-rec",
        name: "Foco Limpo (Sem Recomendações) ✨",
        description: "Remove a seção gigante de arquivos recomendados e aproveita todo o espaço para seus aplicativos fixados.",
        badge: "Recomendado",
        previewGradient: "from-pink-950/40 via-purple-900/30 to-indigo-950/50",
        previewType: "startmenu",
        config: {
          noRecommendations: true,
          compact: false,
        },
      },
      {
        id: "compact-start",
        name: "Menu Iniciar Mini / Compacto 📱",
        description: "Reduz a largura e altura da janela do Menu Iniciar para um visual leve e minimalista.",
        previewGradient: "from-slate-900 via-purple-950/30 to-slate-950",
        previewType: "startmenu",
        config: {
          compact: true,
          noRecommendations: true,
        },
      },
      {
        id: "classic-aligned-left",
        name: "Alinhado à Esquerda Tradicional ⬅️",
        description: "Abre o menu iniciar no canto inferior esquerdo tradicional com layout limpo.",
        previewGradient: "from-blue-950/40 via-slate-900 to-black",
        previewType: "startmenu",
        config: {
          centered: false,
          noRecommendations: true,
        },
      },
    ],
  },
  "windows-11-file-explorer-styler": {
    modId: "windows-11-file-explorer-styler",
    title: "Temas do Explorador de Arquivos",
    description: "Ajuste densidade de itens, abas e cores do Explorador do Windows 11.",
    defaultThemeId: "compact-explorer",
    themes: [
      {
        id: "compact-explorer",
        name: "Densidade Compacta 📁",
        description: "Reduz o espaçamento excessivo entre pastas e arquivos no Windows 11 para ver mais itens sem rolar.",
        badge: "Produtividade",
        previewGradient: "from-amber-950/30 via-slate-900 to-black",
        previewType: "explorer",
        config: {
          compact: true,
        },
      },
      {
        id: "classic-ribbon",
        name: "Menu de Contexto Clássico Integrado 📋",
        description: "Restaura o clique direito completo sem precisar clicar em 'Mostrar mais opções'.",
        previewGradient: "from-stone-900 to-slate-950",
        previewType: "explorer",
        config: {
          compact: false,
        },
      },
    ],
  },
};

/**
 * Retorna as opções de tema para um mod, caso existam
 */
export function getModThemes(modId: string): ModThemeDefinition | null {
  const cleanId = modId.toLowerCase();
  for (const [key, def] of Object.entries(MOD_THEMES_CATALOG)) {
    if (cleanId === key || cleanId.includes(key) || key.includes(cleanId)) {
      return def;
    }
  }
  return null;
}
