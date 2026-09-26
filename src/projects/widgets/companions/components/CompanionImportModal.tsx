import React, { useState } from "react";
import { X, Upload, CheckCircle, AlertCircle, FileCode, Sparkles } from "lucide-react";
import { CompanionManifest, CompanionCategory } from "../types";
import { useCompanionsStore } from "../store/companionsStore";

interface CompanionImportModalProps {
  onClose: () => void;
}

export const CompanionImportModal: React.FC<CompanionImportModalProps> = ({
  onClose,
}) => {
  const { importCustomPackage } = useCompanionsStore();

  const [jsonText, setJsonText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick form mode
  const [activeTab, setActiveTab] = useState<"json" | "form">("json");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CompanionCategory>("waifus");
  const [author, setAuthor] = useState("");
  const [license, setLicense] = useState("Uso Pessoal");
  const [description, setDescription] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [idleFrames, setIdleFrames] = useState("");
  const [walkFrames, setWalkFrames] = useState("");

  const sampleJson: CompanionManifest = {
    id: "meu-pacote-personalizado",
    name: "Minha Waifu Fofinha",
    category: "waifus",
    author: "Você / Artista",
    license: "Uso Pessoal / CC-BY",
    description: "Um companheiro adicionado com amor diretamente do seu computador.",
    preview: "https://exemplo.com/preview.png ou data:image/png;base64,...",
    dimensions: { width: 100, height: 100 },
    defaultScale: 1.0,
    speed: 35,
    animations: {
      idle: {
        frames: ["/companions/waifus/sakura/idle_1.svg"],
        frameDuration: 400,
      },
      walk: {
        frames: [
          "/companions/waifus/sakura/walk_1.svg",
          "/companions/waifus/sakura/walk_2.svg",
        ],
        frameDuration: 220,
      },
    },
  };

  const handleValidateAndImportJson = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (!parsed.name || typeof parsed.name !== "string") {
        throw new Error("O campo 'name' (nome) é obrigatório.");
      }
      if (!parsed.animations || !parsed.animations.idle) {
        throw new Error("O manifesto precisa ter ao menos a animação 'idle'.");
      }

      const id =
        parsed.id || `custom-${Date.now()}-${parsed.name.toLowerCase().replace(/\s+/g, "-")}`;

      const manifest: CompanionManifest = {
        id,
        name: parsed.name,
        category: parsed.category || "outros",
        author: parsed.author || "Autor Desconhecido",
        license: parsed.license || "Uso Pessoal",
        description: parsed.description || "Companheiro importado.",
        preview: parsed.preview || parsed.animations.idle.frames?.[0] || "",
        dimensions: parsed.dimensions || { width: 100, height: 100 },
        defaultScale: parsed.defaultScale || 1.0,
        speed: parsed.speed || 30,
        animations: parsed.animations,
      };

      importCustomPackage(manifest);
      setSuccessMsg(`Companheiro "${manifest.name}" importado com sucesso!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMsg(e.message || "JSON inválido. Verifique a formatação.");
    }
  };

  const handleCreateFromForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Por favor, digite o nome do personagem.");
      return;
    }

    const idleList = idleFrames
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (idleList.length === 0) {
      setErrorMsg("Adicione ao menos uma imagem/URL para a animação Parado (idle).");
      return;
    }

    const walkList = walkFrames
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const id = `custom-${Date.now()}-${name.toLowerCase().replace(/\s+/g, "-")}`;

    const manifest: CompanionManifest = {
      id,
      name,
      category,
      author: author || "Você",
      license: license || "Uso Pessoal",
      description: description || "Personagem original importado com amor.",
      preview: previewSrc || idleList[0],
      dimensions: { width: 100, height: 100 },
      defaultScale: 1.0,
      speed: 35,
      animations: {
        idle: {
          frames: idleList,
          frameDuration: 400,
        },
        walk: {
          frames: walkList.length > 0 ? walkList : idleList,
          frameDuration: 220,
        },
      },
    };

    importCustomPackage(manifest);
    setSuccessMsg(`Personagem "${manifest.name}" adicionado com sucesso!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-slate-900 border border-pink-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                Importar Pacote de Personagem <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-xs text-white/60">
                Adicione waifus e pets personalizados com segurança (sem execução de código).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mt-4 bg-white/5 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("json")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "json"
                ? "bg-pink-500 text-white shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Importar Manifesto JSON
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "form"
                ? "bg-pink-500 text-white shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Criador Rápido de Pacote
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 text-xs">
          {activeTab === "json" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Cole o manifesto JSON ou carregue o arquivo:</span>
                <label className="cursor-pointer px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-pink-500/30">
                  <FileCode className="w-3.5 h-3.5" />
                  Carregar Arquivo .json
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={JSON.stringify(sampleJson, null, 2)}
                className="w-full h-48 bg-slate-950/70 border border-white/10 rounded-2xl p-3 font-mono text-[11px] text-pink-200 focus:outline-none focus:border-pink-500/50 resize-none"
              />

              <div className="text-[11px] text-white/50 bg-white/5 p-3 rounded-2xl leading-relaxed">
                💡 <strong>Dica de Segurança:</strong> O aplicativo só lê caminhos de imagens e configurações visuais. Nenhum script ou binário externo é executado.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Nome do Personagem:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Neko Maid Chibi"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Categoria:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CompanionCategory)}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  >
                    <option value="waifus">Waifus</option>
                    <option value="cats">Gatos</option>
                    <option value="dogs">Cachorros</option>
                    <option value="creatures">Criaturas</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Autor / Créditos:</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Seu nome ou artista"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Licença:</label>
                  <input
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    placeholder="Ex: CC-BY, CC0, Uso Próprio"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Descrição:</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Minha personagem chibi favorita andando pela tela."
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">
                  Quadros Parado / Idle (uma URL ou caminho por linha):
                </label>
                <textarea
                  value={idleFrames}
                  onChange={(e) => setIdleFrames(e.target.value)}
                  placeholder="/companions/waifus/minha_waifu/idle1.png&#10;/companions/waifus/minha_waifu/idle2.png"
                  className="w-full h-16 bg-slate-950/70 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-pink-200 focus:outline-none focus:border-pink-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">
                  Quadros Andando / Walk (uma URL ou caminho por linha):
                </label>
                <textarea
                  value={walkFrames}
                  onChange={(e) => setWalkFrames(e.target.value)}
                  placeholder="/companions/waifus/minha_waifu/walk1.png&#10;/companions/waifus/minha_waifu/walk2.png"
                  className="w-full h-16 bg-slate-950/70 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-pink-200 focus:outline-none focus:border-pink-500/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10 mt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition-colors text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={
              activeTab === "json"
                ? handleValidateAndImportJson
                : handleCreateFromForm
            }
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-xs transition-all shadow-lg shadow-pink-500/25"
          >
            Adicionar à Galeria ✨
          </button>
        </div>
      </div>
    </div>
  );
};
