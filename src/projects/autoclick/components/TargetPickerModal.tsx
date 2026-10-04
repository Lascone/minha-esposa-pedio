import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Crosshair } from "lucide-react";
import { useAutoClickStore } from "../store/autoclickStore";
import { InputService } from "@/core/services/automation/InputService";

export const TargetPickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetPointId?: string | null;
}> = ({ isOpen, onClose, targetPointId }) => {
  const { setFixedPosition, setPositionMode, updatePoint } = useAutoClickStore();
  const [hint, setHint] = useState("A janela vai sair da frente. Clique no ponto. ESC cancela.");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setHint("A janela vai sair da frente. Clique no ponto. ESC cancela.");

    const run = async () => {
      try {
        await new Promise((r) => setTimeout(r, 700));
        if (cancelled) return;
        setHint("Pode clicar. ESC cancela.");
        await invoke("hide_main_window");
        const [x, y] = await InputService.captureClick();
        if (cancelled) return;
        if (targetPointId) {
          updatePoint(targetPointId, { x, y });
        } else {
          setFixedPosition(x, y);
          setPositionMode("fixed");
        }
        useAutoClickStore.setState({ statusMessage: `Posição fixa: X=${x}, Y=${y}` });
      } catch {
        if (!cancelled) {
          useAutoClickStore.setState({ statusMessage: "Captura de posição cancelada" });
        }
      } finally {
        await invoke("show_main_window").catch(() => {});
        if (!cancelled) onCloseRef.current();
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetPointId, setFixedPosition, setPositionMode, updatePoint]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] select-none animate-fade-in">
      <div className="p-4 rounded-3xl bg-theme-surface/90 border border-theme-border/80 shadow-2xl flex items-center gap-3 pointer-events-none">
        <div className="w-10 h-10 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-soft animate-pulse">
          <Crosshair size={22} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-theme-text">Mirando a posição do auto click</span>
          <span className="text-[11px] text-theme-text-muted mt-0.5">{hint}</span>
        </div>
      </div>
    </div>
  );
};
