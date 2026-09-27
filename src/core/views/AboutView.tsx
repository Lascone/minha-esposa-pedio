import React, { useState, useEffect } from "react";
import { Card } from "@/core/components/Card";
import { Heart, ShieldCheck, ExternalLink, Code, Sparkles, RefreshCw } from "lucide-react";
import { checkForUpdates, getCurrentVersion, UpdateInfo } from "@/core/services/updateService";
import { UpdateModal } from "@/core/components/UpdateModal";
import { useToast } from "@/core/components/Toast";

export const AboutView: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState("1.0.0");
  const [checking, setChecking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    getCurrentVersion().then(setCurrentVersion);
  }, []);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const res = await checkForUpdates(true);
      setCurrentVersion(res.currentVersion);
      if (res.hasUpdate && res.updateInfo) {
        setUpdateInfo(res.updateInfo);
        setModalOpen(true);
      } else {
        addToast("Você já está usando a versão mais recente cheia de amor! 🥰✨", "sparkle");
      }
    } catch {
      addToast("Não foi possível verificar no momento.", "warning");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-2">
      <div>
        <h2 className="text-2xl font-bold text-theme-text">Sobre & Créditos</h2>
        <p className="text-xs text-theme-text-muted mt-1">
          História do projeto, licenças e tecnologias utilizadas.
        </p>
      </div>

      {/* Dedicação Especial */}
      <Card className="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border-theme-primary/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-500 flex items-center justify-center text-2xl flex-shrink-0">
            💕
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-theme-text">Para minha esposa querida</h3>
              <span className="px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-xs border border-pink-500/20">
                v{currentVersion}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-theme-text-muted">
              Este programa foi criado especialmente para você, com muito carinho e paciência, para que cada pequeno utilitário ou ferramenta que você precisar no seu dia a dia e nos seus jogos favoritos esteja sempre à sua disposição, rápido, fofinho e sem complicações.
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-theme-border/40">
              <span className="text-xs font-semibold text-theme-primary">
                "Feito com todo o amor do mundo." ✨
              </span>
              <button
                onClick={handleManualCheck}
                disabled={checking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary font-medium text-xs transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
                <span>{checking ? "Verificando..." : "Verificar se tem updatezinho 💕"}</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Licenças e Créditos Open Source */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
          <ShieldCheck size={18} className="text-emerald-500" />
          <h3 className="text-base font-bold text-theme-text">Licenças & Atribuições</h3>
        </div>

        <div className="flex flex-col gap-3 divide-y divide-theme-border/40 text-xs">
          <div className="pt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-theme-text">Tauri Desktop Framework</span>
              <span className="px-2 py-0.5 rounded bg-theme-surface-card border border-theme-border text-[10px] font-mono">
                MIT / Apache 2.0
              </span>
            </div>
            <span className="text-theme-text-muted">
              Runtime nativo leve, seguro e performático em Rust para Windows.
            </span>
          </div>

          <div className="pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-theme-text">Lucide Icons</span>
              <span className="px-2 py-0.5 rounded bg-theme-surface-card border border-theme-border text-[10px] font-mono">
                ISC License
              </span>
            </div>
            <span className="text-theme-text-muted">
              Ícones vetoriais modernos e minimalistas para interface e miras.
            </span>
          </div>

          <div className="pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-theme-text">Twemoji & Unicode Emojis</span>
              <span className="px-2 py-0.5 rounded bg-theme-surface-card border border-theme-border text-[10px] font-mono">
                CC-BY 4.0
              </span>
            </div>
            <span className="text-theme-text-muted">
              Emojis vetoriais elegantes e suporte a emojis nativos do sistema operacional.
            </span>
          </div>

          <div className="pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-theme-text">DOMPurify</span>
              <span className="px-2 py-0.5 rounded bg-theme-surface-card border border-theme-border text-[10px] font-mono">
                Apache 2.0 / MPL 2.0
              </span>
            </div>
            <span className="text-theme-text-muted">
              Sanitizador estrito contra injeção de scripts e vetores XSS em uploads SVG.
            </span>
          </div>

          <div className="pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-theme-text">Seelen UI (inspiração do Dock)</span>
              <span className="px-2 py-0.5 rounded bg-theme-surface-card border border-theme-border text-[10px] font-mono">
                AGPL-3.0
              </span>
            </div>
            <span className="text-theme-text-muted">
              Ideias de dock e filtragem de janelas. Nenhum código foi copiado: o dock deste app é uma implementação própria.
            </span>
          </div>

          <div className="pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-theme-text">Cairo Desktop (inspiração do Dock)</span>
              <span className="px-2 py-0.5 rounded bg-theme-surface-card border border-theme-border text-[10px] font-mono">
                Apache 2.0
              </span>
            </div>
            <span className="text-theme-text-muted">
              Referência de como uma barra alternativa convive com a barra do Windows (AppBar, bandeja intacta). Só conceitos, sem código copiado.
            </span>
          </div>
        </div>
      </Card>

      <UpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        updateInfo={updateInfo}
        currentVersion={currentVersion}
      />
    </div>
  );
};
