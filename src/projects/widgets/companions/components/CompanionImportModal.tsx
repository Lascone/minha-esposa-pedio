import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  FileCode,
  Sparkles,
  BookOpen,
  Play,
  Pause,
  Sliders,
  Maximize2,
  Copy,
  Check,
} from "lucide-react";
import { CompanionManifest, CompanionCategory } from "../types";
import { useCompanionsStore } from "../store/companionsStore";

interface CompanionImportModalProps {
  onClose: () => void;
}

export const CompanionImportModal: React.FC<CompanionImportModalProps> = ({
  onClose,
}) => {
  const { importCustomPackage } = useCompanionsStore();

  const [activeTab, setActiveTab] = useState<"json" | "form" | "docs">("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form mode fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CompanionCategory>("waifus");
  const [author, setAuthor] = useState("");
  const [license, setLicense] = useState("Uso Pessoal / CC-BY");
  const [description, setDescription] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [idleFrames, setIdleFrames] = useState("");
  const [walkFrames, setWalkFrames] = useState("");

  // Calibration settings
  const [testScale, setTestScale] = useState<number>(1.0);
  const [testFps, setTestFps] = useState<number>(4);
  const [testMode, setTestMode] = useState<"idle" | "walk">("idle");
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(true);

  // JSON mode
  const sampleJson: CompanionManifest = {
    id: "meu-pacote-personalizado",
    name: "Minha Waifu Chibi",
    category: "waifus",
    author: "Seu Nome / Artista",
    license: "CC-BY-4.0 / Uso Pessoal",
    description: "Um personagem animado fofinho andando pelo Windows.",
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
      sleep: {
        frames: ["/companions/waifus/sakura/sleep_1.svg"],
        frameDuration: 600,
      },
      click: {
        frames: ["/companions/waifus/sakura/click_1.svg"],
        frameDuration: 400,
      },
    },
  };

  const [jsonText, setJsonText] = useState(JSON.stringify(sampleJson, null, 2));
  const [copiedDocs, setCopiedDocs] = useState(false);

  // Active frames for live test preview
  const parsedIdleList = idleFrames
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsedWalkList = walkFrames
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const activeTestFrames =
    testMode === "walk" && parsedWalkList.length > 0
      ? parsedWalkList
      : parsedIdleList.length > 0
      ? parsedIdleList
      : previewSrc
      ? [previewSrc]
      : ["/companions/waifus/sakura/idle_1.svg"];

  // Ticker for preview animation
  useEffect(() => {
    if (!isPlayingTest || activeTestFrames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % activeTestFrames.length);
    }, Math.round(1000 / testFps));

    return () => clearInterval(interval);
  }, [isPlayingTest, activeTestFrames, testFps]);

  const handleValidateAndImportJson = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.name || typeof parsed.name !== "string") {
        throw new Error("O campo 'name' (nome) é obrigatório.");
      }
      if (!parsed.animations || !parsed.animations.idle) {
        throw new Error("O manifesto precisa ter ao menos a animação 'idle'.");
      }

      const id =
        parsed.id ||
        `custom-${Date.now()}-${parsed.name.toLowerCase().replace(/\s+/g, "-")}`;

      const manifest: CompanionManifest = {
        id,
        name: parsed.name,
        category: parsed.category || "other",
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

    if (parsedIdleList.length === 0 && !previewSrc) {
      setErrorMsg("Adicione ao menos uma imagem/frame para Parado (idle) ou Prévia.");
      return;
    }

    const finalIdle = parsedIdleList.length > 0 ? parsedIdleList : [previewSrc];
    const finalWalk = parsedWalkList.length > 0 ? parsedWalkList : finalIdle;

    const id = `custom-${Date.now()}-${name.toLowerCase().replace(/\s+/g, "-")}`;

    const manifest: CompanionManifest = {
      id,
      name,
      category,
      author: author || "Você",
      license: license || "Uso Pessoal",
      description: description || "Personagem original importado com carinho.",
      preview: previewSrc || finalIdle[0],
      dimensions: { width: 100, height: 100 },
      defaultScale: testScale,
      speed: 35,
      animations: {
        idle: {
          frames: finalIdle,
          frameDuration: Math.round(1000 / testFps),
        },
        walk: {
          frames: finalWalk,
          frameDuration: Math.round(1000 / (testFps * 1.5)),
        },
      },
    };

    importCustomPackage(manifest);
    setSuccessMsg(`Personagem "${manifest.name}" adicionado com sucesso!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "preview" | "idle"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (target === "preview") {
        setPreviewSrc(dataUri);
      } else {
        setIdleFrames((prev) => (prev ? `${prev}\n${dataUri}` : dataUri));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyDocs = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleJson, null, 2));
    setCopiedDocs(true);
    setTimeout(() => setCopiedDocs(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-pink-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                Importar Personagem & Companheiro <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-xs text-white/60">
                Adicione waifus originais, pets e criaturinhas com prévia e calibração de FPS.
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
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "form"
                ? "bg-pink-500 text-white shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Criador Visual & Calibração
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "json"
                ? "bg-pink-500 text-white shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Manifesto JSON
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "docs"
                ? "bg-pink-500 text-white shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            Formato do Pacote 📖
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
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 text-xs custom-scrollbar">
          {activeTab === "form" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Form Fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-white/70 mb-1 font-semibold">
                    Nome do Personagem: *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Luna Chibi, Totoro, Puppy..."
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1 font-semibold">Categoria:</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CompanionCategory)}
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                    >
                      <option value="waifus">Waifus Chibi</option>
                      <option value="cats">Gatinhos</option>
                      <option value="dogs">Cachorrinhos</option>
                      <option value="creatures">Criaturas & Fantasia</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1 font-semibold">Autor:</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Seu nome ou artista"
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 mb-1 font-semibold">Licença:</label>
                  <input
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    placeholder="Ex: CC-BY-4.0, CC0, Uso Próprio"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>

                {/* Upload Image Frame */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/70 font-semibold">
                      Frames Parado / Idle:
                    </label>
                    <label className="text-[10px] text-pink-300 hover:text-pink-200 cursor-pointer flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                      <Upload size={11} /> Carregar Imagem Local
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "idle")}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    value={idleFrames}
                    onChange={(e) => setIdleFrames(e.target.value)}
                    placeholder="URLs, caminhos ou cole data:image/png;base64... (uma por linha)"
                    rows={2}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-2 font-mono text-[11px] text-pink-200 focus:outline-none focus:border-pink-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-white/70 mb-1 font-semibold">
                    Frames Andando / Walk (Opcional):
                  </label>
                  <textarea
                    value={walkFrames}
                    onChange={(e) => setWalkFrames(e.target.value)}
                    placeholder="URLs ou caminhos para a caminhada..."
                    rows={2}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-2 font-mono text-[11px] text-pink-200 focus:outline-none focus:border-pink-500/50 resize-none"
                  />
                </div>
              </div>

              {/* Right Column: Live Interactive Preview & Calibration */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                    <span className="font-bold text-xs text-pink-300 flex items-center gap-1">
                      <Sparkles size={13} /> Calibrador & Prévia ao Vivo
                    </span>
                    <span className="text-[10px] text-white/50">Tempo Real</span>
                  </div>

                  {/* Canvas Stage */}
                  <div className="relative h-44 rounded-2xl bg-slate-950/60 border border-white/10 overflow-hidden flex items-center justify-center p-3 shadow-inner">
                    <img
                      src={activeTestFrames[currentFrameIdx] || activeTestFrames[0]}
                      alt="Prévia"
                      style={{
                        transform: `scale(${testScale})`,
                        transition: "transform 0.1s ease-out",
                      }}
                      className="max-h-28 max-w-28 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                    />

                    {/* Mode pill overlay */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-xl border border-white/10 text-[10px]">
                      <button
                        onClick={() => setTestMode("idle")}
                        className={`px-2 py-0.5 rounded-lg font-bold ${
                          testMode === "idle" ? "bg-pink-500 text-white" : "text-white/60"
                        }`}
                      >
                        Parado
                      </button>
                      <button
                        onClick={() => setTestMode("walk")}
                        className={`px-2 py-0.5 rounded-lg font-bold ${
                          testMode === "walk" ? "bg-pink-500 text-white" : "text-white/60"
                        }`}
                      >
                        Andando
                      </button>
                      <button
                        onClick={() => setIsPlayingTest(!isPlayingTest)}
                        className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/80"
                      >
                        {isPlayingTest ? <Pause size={10} /> : <Play size={10} />}
                      </button>
                    </div>
                  </div>

                  {/* Calibration Sliders */}
                  <div className="space-y-3 mt-3 pt-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-white/70 flex items-center gap-1">
                          <Sliders size={12} className="text-pink-400" /> Velocidade (FPS):
                        </span>
                        <span className="font-mono text-pink-300 font-bold">{testFps} FPS</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="16"
                        value={testFps}
                        onChange={(e) => setTestFps(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-white/70 flex items-center gap-1">
                          <Maximize2 size={12} className="text-sky-400" /> Escala Padrão:
                        </span>
                        <span className="font-mono text-sky-300 font-bold">
                          {(testScale * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={testScale}
                        onChange={(e) => setTestScale(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 text-[10px] text-white/50">
                  Total de quadros carregados: {activeTestFrames.length}
                </div>
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Cole o manifesto JSON ou carregue o arquivo:</span>
                <label className="cursor-pointer px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-pink-500/30">
                  <FileCode className="w-3.5 h-3.5" />
                  Carregar Arquivo .json
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full h-80 bg-slate-950/70 border border-white/10 rounded-2xl p-4 font-mono text-[11px] text-pink-200 focus:outline-none focus:border-pink-500/50 resize-none custom-scrollbar"
                spellCheck={false}
              />
            </div>
          )}

          {activeTab === "docs" && (
            <div className="space-y-4 p-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                    <BookOpen size={14} /> Estrutura do Pacote de Companheiro
                  </h3>
                  <button
                    onClick={handleCopyDocs}
                    className="flex items-center gap-1 text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-white"
                  >
                    {copiedDocs ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>Copiar Modelo JSON</span>
                  </button>
                </div>
                <p className="text-white/80 leading-relaxed text-[11px]">
                  Um pacote de personagem pode conter sequências de imagens individuais (SVG, PNG, WebP) ou uma <strong>spritesheet em grade</strong>. Todas as animações são executadas pelo mesmo motor leve do aplicativo.
                </p>
                <div className="bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-pink-200 space-y-1">
                  <div>📁 meu-companheiro/</div>
                  <div className="pl-4">├── 📄 <strong>manifest.json</strong> (Configurações, escala e mapeamento de frames)</div>
                  <div className="pl-4">├── 🖼️ <strong>preview.png</strong> (Ícone para a galeria)</div>
                  <div className="pl-4">└── 📁 <strong>sprites/</strong> (idle_1.png, walk_1.png, etc.)</div>
                </div>
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
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-xs transition-all shadow-lg shadow-pink-500/25 active:scale-95"
          >
            Adicionar à Galeria ✨
          </button>
        </div>
      </div>
    </div>
  );
};
