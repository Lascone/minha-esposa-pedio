import React, { useState, useEffect } from "react";
import {
  Search,
  ExternalLink,
  Download,
  Flame,
  Clock,
  ThumbsUp,
  Users,
  Eye,
  RefreshCw,
  Sparkles,
  Key,
  Check,
  AlertCircle,
  FileCode,
  Tag,
  ArrowLeft,
} from "lucide-react";
import {
  SteamWorkshopService,
  SteamWorkshopMod,
  WorkshopSortType,
} from "../services/steamWorkshopService";
import { invoke } from "@tauri-apps/api/core";
import { usePetStore } from "../store/petStore";
import { PetCharacterManifest } from "../types";

interface PetSteamWorkshopProps {
  onBackToGame: () => void;
  onImportCharacter?: (character: PetCharacterManifest) => void;
}

export const PetSteamWorkshop: React.FC<PetSteamWorkshopProps> = ({
  onBackToGame,
  onImportCharacter,
}) => {
  const { saveCustomCharacter, selectCharacter } = usePetStore();
  const [mods, setMods] = useState<SteamWorkshopMod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sortType, setSortType] = useState<WorkshopSortType>("popular");
  const [selectedTag, setSelectedTag] = useState("all");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedMod, setSelectedMod] = useState<SteamWorkshopMod | null>(null);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(
    localStorage.getItem("pmm_steam_api_key") || "21316D4AD610F9DA16F10C3E6F8518DF"
  );
  const [keySaved, setKeySaved] = useState(false);

  const fetchMods = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await SteamWorkshopService.queryWorkshopItems({
        searchText,
        tag: selectedTag === "all" ? undefined : selectedTag,
        sort: sortType,
        page,
        pageSize: 20,
      });
      setMods(res.items);
      setTotalItems(res.total);
    } catch (err: any) {
      setError(
        "Não foi possível carregar os mods da Oficina Steam. Verifique sua conexão ou sua chave de API."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMods();
  }, [sortType, selectedTag, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMods();
  };

  const handleOpenInSteam = (url: string) => {
    try {
      invoke("widget_launch_target", { target: url });
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleSaveApiKey = () => {
    SteamWorkshopService.setApiKey(apiKeyInput);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowKeyConfig(false);
    }, 1200);
    fetchMods();
  };

  const handleImportModAsCharacter = (mod: SteamWorkshopMod) => {
    const newChar: PetCharacterManifest = {
      version: "1.0.0",
      id: `steam-mod-${mod.id}`,
      name: mod.title.slice(0, 30),
      author: `Steam #${mod.authorId}`,
      description: mod.description.slice(0, 200) || "Mod baixado da Oficina Steam do VPet.",
      species: "Mod da Oficina",
      previewImage: mod.previewUrl,
      defaultScale: 1.15,
      moveSpeed: 50,
      hitbox: { width: 130, height: 130, offsetX: 0, offsetY: 0 },
      voiceLines: {
        greetings: [`Oie! Eu sou o mod ${mod.title}! 💕`],
        hungry: ["Com fome... Me dá comida?"],
        thirsty: ["Estou com sede!"],
        sleepy: ["Que sono... Boa noite!"],
        happy: ["Adoro a oficina Steam! ✨"],
        afterCare: ["Obrigada pelo carinho! 🥰"],
        idle: ["Aproveitando o dia no seu desktop! 🐾"],
      },
      animations: {
        idle: {
          name: "idle",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        walk: {
          name: "walk",
          frames: [mod.previewUrl],
          frameDuration: 150,
          loop: true,
        },
        happy: {
          name: "happy",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        sad: {
          name: "sad",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        hungry: {
          name: "hungry",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        eat: {
          name: "eat",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        drink: {
          name: "drink",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        play: {
          name: "play",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        sleep: {
          name: "sleep",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        wake: {
          name: "wake",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: false,
        },
        pet_head: {
          name: "pet_head",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        pet_body: {
          name: "pet_body",
          frames: [mod.previewUrl],
          frameDuration: 200,
          loop: true,
        },
        drag: {
          name: "drag",
          frames: [mod.previewUrl],
          frameDuration: 150,
          loop: true,
        },
        fall: {
          name: "fall",
          frames: [mod.previewUrl],
          frameDuration: 150,
          loop: true,
        },
      },
    };

    saveCustomCharacter(newChar);
    selectCharacter(newChar.id);
    setImportedIds((prev) => [...prev, mod.id]);

    if (onImportCharacter) {
      onImportCharacter(newChar);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto animate-fadeIn select-none">
      {/* Header com Navegação */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-600/15 via-purple-600/15 to-pink-600/15 border border-blue-500/30 rounded-3xl p-6 shadow-soft backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToGame}
            className="w-12 h-12 rounded-2xl bg-theme-surface hover:bg-theme-surface-card border border-theme-border flex items-center justify-center text-theme-text transition-all transform hover:scale-105 active:scale-95 shadow-soft"
            title="Voltar para o Jogo"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-theme-text">
                Oficina Steam (VPet Workshop)
              </h1>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-soft flex items-center gap-1">
                <span>STEAM API</span>
              </span>
            </div>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Explore centenas de mods, personagens e skins criados pela comunidade mundial oficial do VPet no Steam! 🚀
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyConfig((prev) => !prev)}
            className="px-3.5 py-2 rounded-2xl bg-theme-surface border border-theme-border/60 text-xs font-bold text-theme-text hover:border-blue-500/50 flex items-center gap-2 transition-all shadow-soft"
          >
            <Key size={14} className="text-amber-500" />
            <span>Chave Steam</span>
          </button>

          <button
            onClick={() => handleOpenInSteam("https://steamcommunity.com/app/1920960/workshop/")}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 flex items-center gap-2 transition-all shadow-soft"
          >
            <ExternalLink size={14} />
            <span>Abrir no Steam</span>
          </button>
        </div>
      </div>

      {/* Configuração de Chave Steam (Modal ou Painel Colapsável) */}
      {showKeyConfig && (
        <div className="bg-theme-surface border border-amber-500/30 rounded-2xl p-4 shadow-soft flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-theme-text flex items-center gap-1.5">
              <Key size={14} className="text-amber-500" />
              Sua Chave da Web API do Steam
            </span>
            <span className="text-[10px] text-theme-text-muted">
              AppID VPet: 1920960
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Cole sua Steam Web API Key..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-theme-surface-card border border-theme-border focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              {keySaved ? <Check size={14} /> : <Sparkles size={14} />}
              <span>{keySaved ? "Salva!" : "Salvar Chave"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-theme-surface border border-theme-border/60 rounded-2xl p-4 shadow-soft">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Pesquisar mods, personagens ou anime na Oficina Steam..."
            className="w-full pl-10 pr-24 py-2 text-xs rounded-xl bg-theme-surface-card border border-theme-border focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ordenação */}
          <div className="flex items-center bg-theme-surface-card p-1 rounded-xl border border-theme-border/60 text-xs">
            <button
              onClick={() => setSortType("popular")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                sortType === "popular"
                  ? "bg-blue-600 text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Flame size={12} />
              <span>Mais Votados</span>
            </button>
            <button
              onClick={() => setSortType("trending")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                sortType === "trending"
                  ? "bg-blue-600 text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Sparkles size={12} />
              <span>Em Alta</span>
            </button>
            <button
              onClick={() => setSortType("subscriptions")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                sortType === "subscriptions"
                  ? "bg-blue-600 text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Users size={12} />
              <span>Inscritos</span>
            </button>
            <button
              onClick={() => setSortType("recent")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                sortType === "recent"
                  ? "bg-blue-600 text-white shadow-soft"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Clock size={12} />
              <span>Recentes</span>
            </button>
          </div>

          <button
            onClick={fetchMods}
            className="p-2 rounded-xl bg-theme-surface-card border border-theme-border/60 text-theme-text hover:text-blue-500 transition-colors"
            title="Recarregar Mods"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Status e Contagem */}
      <div className="flex items-center justify-between text-xs text-theme-text-muted px-1">
        <span>
          Exibindo {mods.length} mods da comunidade (Total encontrado: {totalItems})
        </span>
        <span>Página {page}</span>
      </div>

      {/* Grade de Mods */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-theme-text-muted gap-3">
          <RefreshCw size={32} className="animate-spin text-blue-500" />
          <p className="text-xs font-bold">Conectando à Oficina Steam do VPet...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-theme-surface border border-rose-500/30 rounded-3xl p-6 text-center gap-3">
          <AlertCircle size={36} className="text-rose-500" />
          <p className="text-sm font-bold text-rose-500">{error}</p>
          <button
            onClick={fetchMods}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      ) : mods.length === 0 ? (
        <div className="text-center py-16 bg-theme-surface border border-theme-border/60 rounded-3xl p-6 text-theme-text-muted text-xs">
          Nenhum mod encontrado para os critérios selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mods.map((mod) => {
            const isImported = importedIds.includes(mod.id);
            return (
              <div
                key={mod.id}
                className="bg-theme-surface border border-theme-border/60 rounded-2xl overflow-hidden shadow-soft hover:shadow-hover hover:border-blue-500/50 transition-all flex flex-col group"
              >
                {/* Imagem de Capa do Mod */}
                <div className="relative aspect-video w-full bg-black/10 overflow-hidden">
                  <img
                    src={mod.previewUrl}
                    alt={mod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/vpet/vup/idle/idle_0.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 justify-between">
                    <button
                      onClick={() => handleOpenInSteam(mod.steamUrl)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/90 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-blue-600"
                    >
                      <ExternalLink size={10} />
                      Steam
                    </button>
                    <button
                      onClick={() => setSelectedMod(mod)}
                      className="px-2.5 py-1 rounded-lg bg-white/90 text-black text-[10px] font-bold flex items-center gap-1 hover:bg-white"
                    >
                      Detalhes
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-theme-text line-clamp-1 group-hover:text-blue-500 transition-colors" title={mod.title}>
                      {mod.title}
                    </h3>
                    <p className="text-[10px] text-theme-text-muted line-clamp-2 mt-1 leading-relaxed">
                      {mod.description || "Sem descrição informada."}
                    </p>
                  </div>

                  {/* Estatísticas e Ações */}
                  <div className="pt-2 border-t border-theme-border/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] text-theme-text-muted">
                      <span className="flex items-center gap-1">
                        <Users size={11} className="text-blue-500" />
                        {mod.subscriptions}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={11} className="text-pink-500" />
                        {mod.favorites}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} className="text-purple-500" />
                        {mod.views}
                      </span>
                    </div>

                    <button
                      onClick={() => handleImportModAsCharacter(mod)}
                      disabled={isImported}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isImported
                          ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                          : "bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-600/20"
                      }`}
                    >
                      {isImported ? (
                        <>
                          <Check size={12} />
                          <span>Instalado no Pet!</span>
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          <span>Importar Personagem</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalItems > 20 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-theme-surface border border-theme-border text-xs font-bold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-theme-text">Página {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={mods.length < 20}
            className="px-4 py-2 rounded-xl bg-theme-surface border border-theme-border text-xs font-bold disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modal de Detalhes do Mod */}
      {selectedMod && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedMod(null)}
        >
          <div
            className="bg-theme-surface border border-theme-border rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-theme-text">
                  {selectedMod.title}
                </h2>
                <p className="text-xs text-theme-text-muted mt-0.5">
                  ID Oficina: {selectedMod.id} • Criador: {selectedMod.authorId}
                </p>
              </div>
              <button
                onClick={() => setSelectedMod(null)}
                className="text-theme-text-muted hover:text-theme-text p-1"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/10">
              <img
                src={selectedMod.previewUrl}
                alt={selectedMod.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedMod.tags.map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="bg-theme-surface-card p-3 rounded-xl border border-theme-border/60 text-xs text-theme-text whitespace-pre-wrap max-h-48 overflow-y-auto">
              {selectedMod.description || "Nenhuma descrição fornecida pelo autor."}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-theme-border/40">
              <button
                onClick={() => handleOpenInSteam(selectedMod.steamUrl)}
                className="px-4 py-2 rounded-xl bg-theme-surface-card border border-theme-border text-xs font-bold text-theme-text flex items-center gap-1.5 hover:bg-theme-surface"
              >
                <ExternalLink size={13} />
                Página da Oficina
              </button>

              <button
                onClick={() => {
                  handleImportModAsCharacter(selectedMod);
                  setSelectedMod(null);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-soft"
              >
                <Download size={13} />
                Importar e Usar Mascote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetSteamWorkshop;
