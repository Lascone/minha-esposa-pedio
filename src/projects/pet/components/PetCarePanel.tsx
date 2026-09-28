import React, { useState } from "react";
import {
  Heart,
  Coffee,
  Sparkles,
  Bath,
  Moon,
  Sun,
  Smile,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { usePetStore } from "../store/petStore";
import { PetItem } from "../types";

export const PetCarePanel: React.FC = () => {
  const {
    stats,
    inventory,
    currentState,
    feedPet,
    giveDrink,
    playWithPet,
    bathPet,
    caressPet,
    putToSleep,
    wakeUpPet,
  } = usePetStore();

  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "food" | "drink" | "toy" | "bath"
  >("all");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleUseItem = (item: PetItem) => {
    switch (item.category) {
      case "food":
        feedPet(item);
        showFeedback(`Você deu ${item.name}! Fome saciada 🍖`);
        break;
      case "drink":
        giveDrink(item);
        showFeedback(`Você deu ${item.name}! Hidratação recarregada 💧`);
        break;
      case "toy":
        playWithPet(item);
        showFeedback(`Brincando com ${item.name}! Muita diversão 🎾`);
        break;
      case "bath":
        bathPet(item);
        showFeedback(`Banho quentinho com ${item.name}! Limpinho ✨`);
        break;
      default:
        feedPet(item);
        break;
    }
  };

  const filteredItems =
    selectedCategory === "all"
      ? inventory
      : inventory.filter((item) => item.category === selectedCategory);

  const getStatColor = (value: number) => {
    if (value > 65) return "bg-emerald-400";
    if (value > 30) return "bg-amber-400";
    return "bg-rose-400";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Feedback temporário de cuidado */}
      {feedbackMsg && (
        <div className="fixed top-20 right-8 z-50 bg-pink-600/90 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg animate-bounce border border-pink-400/50 backdrop-blur-md">
          {feedbackMsg}
        </div>
      )}

      {/* Indicadores Principais em Cartões Fofos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Fome */}
        <div className="bg-theme-surface-card border border-theme-border/60 rounded-2xl p-3 flex flex-col justify-between shadow-soft hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
            <span className="flex items-center gap-1.5">🍖 Fome</span>
            <span className="text-[11px] text-theme-text-muted">{stats.hunger}%</span>
          </div>
          <div className="w-full bg-theme-border/40 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getStatColor(
                stats.hunger
              )}`}
              style={{ width: `${stats.hunger}%` }}
            />
          </div>
        </div>

        {/* Sede */}
        <div className="bg-theme-surface-card border border-theme-border/60 rounded-2xl p-3 flex flex-col justify-between shadow-soft hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
            <span className="flex items-center gap-1.5">💧 Sede</span>
            <span className="text-[11px] text-theme-text-muted">{stats.thirst}%</span>
          </div>
          <div className="w-full bg-theme-border/40 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getStatColor(
                stats.thirst
              )}`}
              style={{ width: `${stats.thirst}%` }}
            />
          </div>
        </div>

        {/* Energia */}
        <div className="bg-theme-surface-card border border-theme-border/60 rounded-2xl p-3 flex flex-col justify-between shadow-soft hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
            <span className="flex items-center gap-1.5">⚡ Energia</span>
            <span className="text-[11px] text-theme-text-muted">{stats.energy}%</span>
          </div>
          <div className="w-full bg-theme-border/40 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getStatColor(
                stats.energy
              )}`}
              style={{ width: `${stats.energy}%` }}
            />
          </div>
        </div>

        {/* Higiene */}
        <div className="bg-theme-surface-card border border-theme-border/60 rounded-2xl p-3 flex flex-col justify-between shadow-soft hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
            <span className="flex items-center gap-1.5">🧼 Banho</span>
            <span className="text-[11px] text-theme-text-muted">{stats.hygiene}%</span>
          </div>
          <div className="w-full bg-theme-border/40 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getStatColor(
                stats.hygiene
              )}`}
              style={{ width: `${stats.hygiene}%` }}
            />
          </div>
        </div>

        {/* Felicidade */}
        <div className="bg-theme-surface-card border border-theme-border/60 rounded-2xl p-3 flex flex-col justify-between shadow-soft hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-theme-text mb-1">
            <span className="flex items-center gap-1.5">✨ Alegria</span>
            <span className="text-[11px] text-theme-text-muted">{stats.happiness}%</span>
          </div>
          <div className="w-full bg-theme-border/40 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getStatColor(
                stats.happiness
              )}`}
              style={{ width: `${stats.happiness}%` }}
            />
          </div>
        </div>

        {/* Vínculo & Nível */}
        <div className="bg-theme-surface-card border border-theme-border/60 rounded-2xl p-3 flex flex-col justify-between shadow-soft hover:border-pink-500/40 transition-all bg-gradient-to-br from-pink-500/10 to-purple-500/5">
          <div className="flex items-center justify-between text-xs font-extrabold text-pink-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Heart size={14} className="fill-pink-500 text-pink-500" /> Nível {stats.bondLevel}
            </span>
            <span className="text-[10px] text-theme-text-muted font-normal">
              {stats.bondXp}/{stats.bondXpMax} XP
            </span>
          </div>
          <div className="w-full bg-pink-200/30 dark:bg-pink-900/30 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-pink-500 to-purple-500"
              style={{ width: `${Math.min(100, (stats.bondXp / stats.bondXpMax) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ações Rápidas de Interação */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => caressPet("head")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-soft transition-all transform active:scale-95"
        >
          <Smile size={16} />
          Fazer Cafuné 💖
        </button>

        {currentState === "sleep" ? (
          <button
            onClick={wakeUpPet}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-soft transition-all transform active:scale-95"
          >
            <Sun size={16} />
            Acordar Bichinho ☀️
          </button>
        ) : (
          <button
            onClick={putToSleep}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold text-xs border border-indigo-500/30 shadow-soft transition-all transform active:scale-95"
          >
            <Moon size={16} />
            Colocar para Dormir 💤
          </button>
        )}

        <button
          onClick={() => {
            const soap = inventory.find((i) => i.category === "bath");
            if (soap) handleUseItem(soap);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-bold text-xs border border-sky-500/30 shadow-soft transition-all transform active:scale-95"
        >
          <Bath size={16} />
          Dar Banho Espumante 🧼
        </button>
      </div>

      {/* Seção do Inventário / Mochilinha de Cuidados */}
      <div className="bg-theme-surface-card border border-theme-border/60 rounded-3xl p-5 flex flex-col gap-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-theme-text">
              🎒 Mochila de Cuidados & Itens
            </span>
            <span className="text-xs text-theme-text-muted">
              ({filteredItems.length} opções disponíveis)
            </span>
          </div>

          {/* Filtros por Categoria */}
          <div className="flex items-center gap-1.5 bg-theme-surface p-1 rounded-xl border border-theme-border/50 text-xs">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-theme-primary text-white"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedCategory("food")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                selectedCategory === "food"
                  ? "bg-theme-primary text-white"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Comidas 🍖
            </button>
            <button
              onClick={() => setSelectedCategory("drink")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                selectedCategory === "drink"
                  ? "bg-theme-primary text-white"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Bebidas 🧃
            </button>
            <button
              onClick={() => setSelectedCategory("toy")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                selectedCategory === "toy"
                  ? "bg-theme-primary text-white"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Brinquedos 🎾
            </button>
            <button
              onClick={() => setSelectedCategory("bath")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                selectedCategory === "bath"
                  ? "bg-theme-primary text-white"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              Higiene 🧼
            </button>
          </div>
        </div>

        {/* Grade de Itens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-theme-surface/70 hover:bg-theme-surface border border-theme-border/50 hover:border-pink-500/50 rounded-2xl p-3 flex flex-col justify-between group transition-all"
            >
              <div className="flex flex-col items-center text-center gap-1.5 mb-2">
                <span className="text-3xl group-hover:scale-125 transition-transform duration-300">
                  {item.icon}
                </span>
                <span className="text-xs font-bold text-theme-text leading-tight">
                  {item.name}
                </span>
                <span className="text-[10px] text-theme-text-muted leading-tight line-clamp-2">
                  {item.desc}
                </span>
              </div>

              {/* Efeitos numéricos fofos */}
              <div className="flex flex-wrap items-center justify-center gap-1 mb-2">
                {item.effects.hunger && (
                  <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-1.5 py-0.5 rounded-md">
                    +{item.effects.hunger} Fome
                  </span>
                )}
                {item.effects.thirst && (
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 font-bold px-1.5 py-0.5 rounded-md">
                    +{item.effects.thirst} Sede
                  </span>
                )}
                {item.effects.happiness && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded-md">
                    +{item.effects.happiness} Felicidade
                  </span>
                )}
                {item.effects.energy && (
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-1.5 py-0.5 rounded-md">
                    {item.effects.energy > 0 ? `+${item.effects.energy}` : item.effects.energy} Energia
                  </span>
                )}
                {item.effects.bondXp && (
                  <span className="text-[9px] bg-pink-500/10 text-pink-400 font-bold px-1.5 py-0.5 rounded-md">
                    +{item.effects.bondXp} XP
                  </span>
                )}
              </div>

              <button
                onClick={() => handleUseItem(item)}
                className="w-full py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500 text-pink-500 hover:text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1"
              >
                <span>Usar</span>
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
