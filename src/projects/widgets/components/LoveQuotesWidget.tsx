import React, { useState } from "react";
import { WidgetInstance } from "../types";
import { Heart, Sparkles, Plus, RefreshCw, Quote } from "lucide-react";
import { useWidgetsStore } from "../store/widgetsStore";

interface LoveQuotesWidgetProps {
  widget: WidgetInstance;
}

const DEFAULT_QUOTES = [
  "Você é a razão do meu sorriso todos os dias! 💕",
  "Lembre-se: você é incrível, forte e muito amada! ✨",
  "Já bebeu água hoje? Cuide-se com carinho! 🌸",
  "O mundo é muito mais colorido com a sua risada. 🥰",
  "Tenho muito orgulho de tudo o que você constrói todos os dias! 🌟",
  "Passando aqui para mandar um abraço bem quentinho e apertado! 🧸",
  "Apenas um lembrete: você é insubstituível para mim! 💖",
  "Respire fundo, dê uma pausa e coma algo gostoso! ☕",
  "Seu coração bondoso ilumina tudo ao seu redor. 🌷",
];

export const LoveQuotesWidget: React.FC<LoveQuotesWidgetProps> = ({ widget }) => {
  const { updateWidgetSettings } = useWidgetsStore();

  const customQuotes: string[] = widget.settings?.customQuotes || [];
  const allQuotes = [...DEFAULT_QUOTES, ...customQuotes];

  const [currentIndex, setCurrentIndex] = useState(
    Math.floor(Math.random() * allQuotes.length)
  );
  const [isLiked, setIsLiked] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState("");

  const handleNext = () => {
    setIsLiked(false);
    setCurrentIndex((prev) => (prev + 1) % allQuotes.length);
  };

  const handleAddQuote = () => {
    if (!newQuoteText.trim()) return;
    const updated = [...customQuotes, newQuoteText.trim()];
    updateWidgetSettings(widget.id, {
      customQuotes: updated,
    });
    setNewQuoteText("");
    setShowAddModal(false);
    setCurrentIndex(DEFAULT_QUOTES.length + updated.length - 1);
  };

  const currentQuote = allQuotes[currentIndex] || DEFAULT_QUOTES[0];

  return (
    <div className="flex flex-col justify-between h-full w-full p-2 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
          <Sparkles size={14} className="text-pink-400" />
          <span>Recadinho do Dia</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddModal(!showAddModal)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title="Adicionar recadinho personalizado"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title="Próxima mensagem"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {showAddModal ? (
        <div className="flex flex-col gap-2 p-1 text-[11px] my-auto">
          <label className="text-[10px] text-white/70 font-semibold">
            Escreva uma frase de amor ou incentivo:
          </label>
          <textarea
            value={newQuoteText}
            onChange={(e) => setNewQuoteText(e.target.value)}
            placeholder="Ex: Te amo mais que tudo! 💕"
            rows={2}
            className="w-full bg-black/30 border border-white/20 rounded p-1.5 text-white text-[11px] resize-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAddQuote}
              className="flex-1 py-1 rounded bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs"
            >
              Adicionar
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-2 py-1 rounded bg-white/10 text-white/70 hover:text-white text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Quote Card */}
          <div className="flex flex-col justify-center items-center my-auto px-2 text-center relative py-2">
            <Quote
              size={18}
              className="text-pink-400/40 mb-1"
            />
            <p className="text-xs font-medium text-white/90 leading-relaxed italic drop-shadow-sm">
              "{currentQuote}"
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/5">
            <span>
              {currentIndex + 1} de {allQuotes.length}
            </span>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="flex items-center gap-1 hover:text-rose-400 transition-colors"
            >
              <Heart
                size={12}
                className={isLiked ? "fill-rose-500 text-rose-500" : "text-white/60"}
              />
              <span className={isLiked ? "text-rose-300 font-bold" : ""}>
                {isLiked ? "Amei!" : "Curtir"}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
