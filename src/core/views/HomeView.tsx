import React, { useState } from "react";
import { PROJECT_REGISTRY } from "../projects/registry";
import { ProjectDefinition } from "../projects/types";
import { useCrosshairStore } from "@/projects/crosshair/store/crosshairStore";
import { Button } from "@/core/components/Button";
import { Card } from "@/core/components/Card";
import confetti from "canvas-confetti";
import {
  Heart,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
} from "lucide-react";

interface HomeViewProps {
  onNavigateToProject: (slug: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateToProject,
  onNavigateToTab,
}) => {
  const { activeCrosshair, isOverlayActive, setOverlayActive } = useCrosshairStore();
  const [heartClicks, setHeartClicks] = useState(0);

  // Easter Egg: 5 clicks on the heart logo triggers delicate heart floats!
  const handleHeartClick = () => {
    const nextClicks = heartClicks + 1;
    setHeartClicks(nextClicks);

    if (nextClicks >= 5) {
      setHeartClicks(0);
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.2 },
        colors: ["#ec4899", "#f472b6", "#fbcfe8", "#c084fc", "#ffffff"],
        shapes: ["circle"],
        scalar: 1.2,
      });
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-2">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent p-8 rounded-cuter border border-theme-border/60 shadow-soft">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              onClick={handleHeartClick}
              className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-pink-500/40 shadow-soft cursor-pointer hover:scale-105 transition-all bg-pink-500/10 shrink-0"
              title="Feito com muito carinho pelo seu marido! Clique para soltar confetes 💕"
            >
              <img src="/logo.png" alt="Mascote Pedi para meu Marido" className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-theme-primary">
                  Central de Mimos & Projetos
                </span>
                <span className="text-xs">💕</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-theme-text">
                Oi, meu amor! O que vamos usar hoje? ✨
              </h1>
              <p className="text-xs lg:text-sm text-theme-text-muted max-w-xl">
                Aqui fica reunido tudo o que você me pediu, desenvolvido com amor, cuidado e atenção a cada detalhe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Sparkles size={18} />}
              onClick={() => onNavigateToProject("crosshair")}
            >
              Abrir Crosshair Studio
            </Button>
          </div>
        </div>

        {/* Decorative subtle background sparkles */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-theme-primary/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* BANNER DE DESTAQUE: NOVO JOGO PET VIRTUAL (VPET) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/15 p-6 rounded-3xl border-2 border-pink-500/40 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-pink-500/60 transition-all">
        <div className="flex items-center gap-5 z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-pink-400/40 p-1 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-soft backdrop-blur-sm">
            <img
              src="/vpet/vup/idle/idle_0.png"
              alt="Mascote VUP Original"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500 text-white shadow-soft">
                🎮 NOVO JOGO PARA VOCÊ
              </span>
              <span className="text-xs text-pink-500 font-bold">Inspirado no VPet</span>
            </div>
            <h2 className="text-xl font-extrabold text-theme-text flex items-center gap-2">
              🐾 Seu Bichinho Virtual de Desktop
            </h2>
            <p className="text-xs text-theme-text-muted max-w-lg">
              Adote a mascotinha original VUP! Cuide dela com comidinhas, aguinha, carinho, banho e veja ela passeando pela sua tela todos os dias. 💕
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles size={18} />}
            onClick={() => onNavigateToTab("pet")}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold shadow-soft transform active:scale-95 text-sm"
          >
            Jogar com meu Bichinho 🐾
          </Button>
        </div>

        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-pink-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Seção: Pedidos Concluídos & Em Andamento */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-theme-text flex items-center gap-2">
            <Heart size={18} className="text-pink-500 fill-pink-500" />
            Pedidos Concluídos 💗
          </h3>
          <span className="text-xs text-theme-text-muted">
            1 concluído • mais a caminho
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Pet Virtual VPet Concluído */}
          <Card
            hoverable
            onClick={() => onNavigateToTab("pet")}
            className="flex flex-col justify-between border-pink-500/30 bg-gradient-to-b from-pink-500/5 to-transparent relative overflow-hidden group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform">
                🐾
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 size={12} /> Jogo Novo
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-theme-text">Pet Virtual (VPet)</h4>
              <p className="text-xs text-theme-text-muted mt-1">
                Mascote oficial VUP no seu desktop, com cuidados, comidas, cafuné e editor de mods.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-theme-border/40 flex items-center justify-between text-xs text-pink-500 font-semibold">
              <span>Jogar agora</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* Card: Crosshair Studio Concluído */}
          <Card
            hoverable
            onClick={() => onNavigateToProject("crosshair")}
            className="flex flex-col justify-between border-theme-primary/30 relative overflow-hidden group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-500 text-white flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform">
                🎯
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 size={12} /> Concluído
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-theme-text">Crosshair Studio</h4>
              <p className="text-xs text-theme-text-muted mt-1">
                Uma mira do jeitinho que você quiser com emojis, ícones, CS2 e overlay transparente.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-theme-border/40 flex items-center justify-between text-xs text-theme-primary font-semibold">
              <span>Abrir ferramenta</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* Card: Widgets de Área de Trabalho (Novo Módulo Concluído!) */}
          <Card
            hoverable
            onClick={() => onNavigateToTab("widgets")}
            className="flex flex-col justify-between border-pink-400/50 relative overflow-hidden group shadow-soft"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-500 text-white flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform">
                🪟
              </div>
              <span className="px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-extrabold text-[11px] flex items-center gap-1">
                <Sparkles size={12} /> Novo Módulo
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-theme-text">Widgets da Área de Trabalho</h4>
              <p className="text-xs text-theme-text-muted mt-1">
                Gadgets estilo Windows 7: relógios, calendário, previsão do tempo, notas e monitores de PC.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-theme-border/40 flex items-center justify-between text-xs text-theme-primary font-semibold">
              <span>Abrir Galeria de Widgets ✨</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* Card: Auto Click Studio */}
          <Card
            hoverable
            onClick={() => onNavigateToTab("autoclick")}
            className="flex flex-col justify-between border-pink-400/50 relative overflow-hidden group shadow-soft"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform">
                🖱️
              </div>
              <span className="px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-extrabold text-[11px] flex items-center gap-1">
                <Sparkles size={12} /> Alta Precisão
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-theme-text">Auto Click Studio</h4>
              <p className="text-xs text-theme-text-muted mt-1">
                Cliques rápidos, multi-pontos, timeline com loops e gravação de macros em tempo real.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-theme-border/40 flex items-center justify-between text-xs text-theme-primary font-semibold">
              <span>Abrir Auto Click 💕</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* Card: Próximos Pedidos */}
          {PROJECT_REGISTRY.filter((p) => p.slug !== "crosshair" && p.slug !== "autoclick").map((proj) => (
            <Card
              key={proj.id}
              className="flex flex-col justify-between opacity-75 bg-theme-surface-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-theme-border/40 text-theme-text-muted flex items-center justify-center text-2xl">
                  {proj.icon}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-[11px] flex items-center gap-1">
                  <Clock size={12} /> Em breve
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-theme-text">{proj.name}</h4>
                <p className="text-xs text-theme-text-muted mt-1">{proj.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-theme-border/40 text-xs text-theme-text-muted">
                <span>Preparando para você 💕</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Seção: Mira Ativa Rápida */}
      <section className="bg-theme-surface p-6 rounded-cuter border border-theme-border/60 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#181f2f] flex items-center justify-center text-white border border-theme-border flex-shrink-0">
            <span className="text-2xl">🎯</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-theme-text-muted uppercase font-bold tracking-wider">
              Mira Selecionada no Momento
            </span>
            <h4 className="text-base font-bold text-theme-text">{activeCrosshair.name}</h4>
            <span className="text-xs text-theme-text-muted">
              {isOverlayActive ? "Ativa na tela no momento 🟢" : "Desativada na tela"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isOverlayActive ? "danger" : "primary"}
            size="md"
            onClick={() => setOverlayActive(!isOverlayActive)}
          >
            {isOverlayActive ? "Ocultar da Tela" : "Exibir na Tela 🎯"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => onNavigateToProject("crosshair")}
          >
            Editar no Studio
          </Button>
        </div>
      </section>
    </div>
  );
};
