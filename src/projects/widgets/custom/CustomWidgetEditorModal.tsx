import React, { useState, useMemo } from "react";
import {
  X,
  Save,
  Play,
  Upload,
  Download,
  Copy,
  Sparkles,
  FileCode,
  Layout,
  Palette,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { CustomWidgetPackage, CustomWidgetManifest } from "./types";
import { useCustomWidgetsStore } from "./customWidgetsStore";
import { TEMPLATE_NEON_CLOCK, TEMPLATE_TODO_MINI } from "./templates";
import { WidgetSandbox } from "./WidgetSandbox";

interface CustomWidgetEditorModalProps {
  initialPackage?: CustomWidgetPackage;
  onClose: () => void;
  onSaved?: (savedPkg: CustomWidgetPackage) => void;
}

type TabType = "manifest" | "html" | "css" | "js";

export const CustomWidgetEditorModal: React.FC<CustomWidgetEditorModalProps> = ({
  initialPackage,
  onClose,
  onSaved,
}) => {
  const { savePackage, importPackageFromJson } = useCustomWidgetsStore();

  const [activeTab, setActiveTab] = useState<TabType>("html");

  // Editable fields
  const [manifestText, setManifestText] = useState<string>(() => {
    return JSON.stringify(
      initialPackage?.manifest || TEMPLATE_NEON_CLOCK.manifest,
      null,
      2
    );
  });
  const [htmlCode, setHtmlCode] = useState<string>(
    initialPackage?.html || TEMPLATE_NEON_CLOCK.html
  );
  const [cssCode, setCssCode] = useState<string>(
    initialPackage?.css || TEMPLATE_NEON_CLOCK.css
  );
  const [jsCode, setJsCode] = useState<string>(
    initialPackage?.js || TEMPLATE_NEON_CLOCK.js
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live preview package constructed on the fly
  const previewPkg: CustomWidgetPackage = useMemo(() => {
    let parsedManifest: CustomWidgetManifest = TEMPLATE_NEON_CLOCK.manifest;
    try {
      parsedManifest = JSON.parse(manifestText);
    } catch {
      // fallback
    }

    return {
      manifest: parsedManifest,
      html: htmlCode,
      css: cssCode,
      js: jsCode,
      createdAt: initialPackage?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }, [manifestText, htmlCode, cssCode, jsCode, initialPackage]);

  const handleApplyTemplate = (template: CustomWidgetPackage) => {
    if (confirm("Deseja substituir o conteúdo atual pelo modelo selecionado?")) {
      setManifestText(JSON.stringify(template.manifest, null, 2));
      setHtmlCode(template.html);
      setCssCode(template.css);
      setJsCode(template.js);
      setErrorMsg(null);
    }
  };

  const handleSave = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsedManifest: CustomWidgetManifest = JSON.parse(manifestText);
      if (!parsedManifest.name || !parsedManifest.name.trim()) {
        throw new Error("O campo 'name' no manifest.json é obrigatório.");
      }

      const id =
        parsedManifest.id ||
        `custom-${Date.now()}-${parsedManifest.name.toLowerCase().replace(/\s+/g, "-")}`;

      const pkgToSave: CustomWidgetPackage = {
        manifest: {
          ...parsedManifest,
          id,
        },
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        createdAt: initialPackage?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      savePackage(pkgToSave);
      setSuccessMsg(`Widget "${pkgToSave.manifest.name}" salvo com sucesso!`);

      if (onSaved) {
        onSaved(pkgToSave);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMsg(e.message || "Manifesto JSON inválido. Verifique a sintaxe.");
    }
  };

  const handleExportJson = () => {
    try {
      const parsedManifest = JSON.parse(manifestText);
      const pkg = {
        manifest: parsedManifest,
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const blob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${parsedManifest.id || "meu-widget"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Corrija o manifesto JSON antes de exportar.");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = importPackageFromJson(text);
      if (res.success && res.pkg) {
        setManifestText(JSON.stringify(res.pkg.manifest, null, 2));
        setHtmlCode(res.pkg.html);
        setCssCode(res.pkg.css);
        setJsCode(res.pkg.js);
        setSuccessMsg(`Pacote "${res.pkg.manifest.name}" importado com sucesso!`);
      } else {
        setErrorMsg(res.error || "Erro ao ler pacote importado.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-slate-900 border border-pink-500/30 rounded-3xl shadow-2xl text-white overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Editor de Widgets com Código <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-xs text-white/60">
                Crie ou edite widgets personalizados em HTML, CSS e JavaScript com isolamento seguro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Templates Dropdown / Buttons */}
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-[10px] text-white/50">Modelos:</span>
              <button
                onClick={() => handleApplyTemplate(TEMPLATE_NEON_CLOCK)}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-[10px] transition-colors"
                title="Carregar modelo de relógio neon"
              >
                Relógio Neon
              </button>
              <button
                onClick={() => handleApplyTemplate(TEMPLATE_TODO_MINI)}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-[10px] transition-colors"
                title="Carregar modelo de lista de tarefas"
              >
                Mini To-Do
              </button>
            </div>

            {/* Import / Export */}
            <label className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-colors" title="Importar Pacote .json">
              <Upload size={14} />
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportJson}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Exportar Pacote .json"
            >
              <Download size={14} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Content: Split Editor & Live Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6">
          {/* Left Side: Code Editor Tabs */}
          <div className="flex-1 flex flex-col bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/10 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("manifest")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "manifest"
                    ? "bg-pink-500 text-white shadow"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <FileText size={13} />
                <span>manifest.json</span>
              </button>

              <button
                onClick={() => setActiveTab("html")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "html"
                    ? "bg-pink-500 text-white shadow"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Layout size={13} />
                <span>index.html</span>
              </button>

              <button
                onClick={() => setActiveTab("css")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "css"
                    ? "bg-pink-500 text-white shadow"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Palette size={13} />
                <span>style.css</span>
              </button>

              <button
                onClick={() => setActiveTab("js")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "js"
                    ? "bg-pink-500 text-white shadow"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <FileCode size={13} />
                <span>widget.js</span>
              </button>
            </div>

            {/* Code Input Area */}
            <div className="flex-1 relative">
              {activeTab === "manifest" && (
                <textarea
                  value={manifestText}
                  onChange={(e) => setManifestText(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-emerald-300 font-mono text-xs resize-none outline-none custom-scrollbar"
                  placeholder="Configurações do manifesto JSON..."
                  spellCheck={false}
                />
              )}
              {activeTab === "html" && (
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-pink-200 font-mono text-xs resize-none outline-none custom-scrollbar"
                  placeholder="Código HTML do widget..."
                  spellCheck={false}
                />
              )}
              {activeTab === "css" && (
                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-sky-200 font-mono text-xs resize-none outline-none custom-scrollbar"
                  placeholder="Estilos CSS do widget..."
                  spellCheck={false}
                />
              )}
              {activeTab === "js" && (
                <textarea
                  value={jsCode}
                  onChange={(e) => setJsCode(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-amber-200 font-mono text-xs resize-none outline-none custom-scrollbar"
                  placeholder="Lógica JavaScript do widget..."
                  spellCheck={false}
                />
              )}
            </div>
          </div>

          {/* Right Side: Live Sandbox Preview Stage */}
          <div className="w-full md:w-80 flex flex-col bg-black/30 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Play size={13} className="text-pink-400" /> Prévia em Tempo Real
              </span>
              <span className="text-[10px] text-white/50">Sandbox Seguro</span>
            </div>

            {/* Sandbox Container */}
            <div className="flex-1 rounded-2xl bg-slate-950/60 border border-white/10 overflow-hidden flex items-center justify-center p-2 relative shadow-inner">
              <div
                style={{
                  width: `${previewPkg.manifest.defaultWidth || 260}px`,
                  height: `${previewPkg.manifest.defaultHeight || 180}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
                className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative"
              >
                <WidgetSandbox pkg={previewPkg} />
              </div>
            </div>

            {/* Info Preview */}
            <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-white/50">Nome:</span>
                <span className="font-semibold text-white truncate max-w-[140px]">
                  {previewPkg.manifest.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Dimensões:</span>
                <span className="font-mono text-pink-300">
                  {previewPkg.manifest.defaultWidth}x{previewPkg.manifest.defaultHeight}px
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/50">
            O widget será salvo localmente e disponibilizado na sua galeria.
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-500/25 active:scale-95 transition-all"
            >
              <Save size={16} />
              <span>Salvar no Catálogo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
