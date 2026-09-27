import React, { useState } from "react";
import { X, Code2, Sparkles, Check, FileCode, Play } from "lucide-react";
import { useModsStore } from "../store/modsStore";
import { useToast } from "@/core/components/Toast";
import { Button } from "@/core/components/Button";

interface CreateCustomModModalProps {
  onClose: () => void;
}

export const CreateCustomModModal: React.FC<CreateCustomModModalProps> = ({ onClose }) => {
  const { createCustomMod, restartExplorer } = useModsStore();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [targetProcess, setTargetProcess] = useState("explorer.exe");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!id || id === name.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setId(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id.trim()) {
      addToast("Preencha o nome e identificador do mod.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomMod({
        id: id.trim(),
        name: name.trim(),
        description: description.trim() || "Mod personalizado criado no aplicativo.",
        targetProcess: targetProcess.trim() || "explorer.exe",
      });

      addToast(`Mod '${name}' criado com sucesso no nosso motor! ✨`, "sparkle");
      onClose();
    } catch (err: any) {
      addToast(`Erro ao criar mod: ${err.message || err}`, "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-lg rounded-3xl border border-theme-border/60 bg-theme-surface-card shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-theme-border/40 bg-gradient-to-r from-theme-surface to-theme-surface-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
              <FileCode size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-theme-text flex items-center gap-1.5">
                Criar Mod C++ no Nosso Motor <Sparkles size={14} className="text-pink-400" />
              </h3>
              <p className="text-xs text-theme-text-muted">
                Adicione um mod nativo com código fonte direto no motor integrado.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-theme-text-muted hover:text-theme-text hover:bg-theme-border/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-theme-text">Nome da Modificação</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Minha Barra Translúcida"
              required
              className="p-2.5 rounded-xl bg-theme-surface border border-theme-border/60 text-theme-text outline-none focus:border-theme-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-theme-text">Identificador (ID do Arquivo .wh.cpp)</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="minha-barra-translucida"
              required
              className="p-2.5 rounded-xl font-mono bg-theme-surface border border-theme-border/60 text-theme-text outline-none focus:border-theme-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-theme-text">Processo Alvo da Injeção</label>
            <select
              value={targetProcess}
              onChange={(e) => setTargetProcess(e.target.value)}
              className="p-2.5 rounded-xl bg-theme-surface border border-theme-border/60 text-theme-text outline-none focus:border-theme-primary transition-colors"
            >
              <option value="explorer.exe">explorer.exe (Barra de Tarefas, Menu Iniciar, Pastas)</option>
              <option value="StartMenuExperienceHost.exe">StartMenuExperienceHost.exe (Menu Iniciar Moderno)</option>
              <option value="ShellExperienceHost.exe">ShellExperienceHost.exe (Notificações & Central)</option>
              <option value="*">Global (*) - Todos os Processos</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-theme-text">Descrição Breve</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="O que este mod faz no Windows..."
              className="p-2.5 rounded-xl bg-theme-surface border border-theme-border/60 text-theme-text outline-none focus:border-theme-primary transition-colors resize-none"
            />
          </div>

          <div className="p-3 rounded-2xl bg-theme-surface border border-theme-border/40 text-[11px] text-theme-text-muted leading-relaxed">
            💡 O mod será gerado como <code>{id || "meu-mod"}.wh.cpp</code> com os ganchos <code>Wh_ModInit()</code> e <code>Wh_ModUninit()</code> e aberto imediatamente no editor com código fonte completo para você personalizar!
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-border/40">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando Mod..." : "Criar & Abrir Código C++ ✨"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
