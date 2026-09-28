import React, { useEffect, useMemo } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCompanionsStore } from "../store/companionsStore";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { CompanionInstance } from "../types";
import { getCompanionManifest } from "../registry";

import { PetDesktopView } from "../../../pet/components/PetDesktopView";
import { usePetStore } from "../../../pet/store/petStore";

interface DesktopCompanionWindowProps {
  companionId?: string;
}

export const DesktopCompanionWindow: React.FC<DesktopCompanionWindowProps> = ({
  companionId: propCompanionId,
}) => {
  const { activeCompanions, customCompanions } = useCompanionsStore();

  // Extract instance ID from prop, global window label, URL hash, or Tauri window label
  let targetInstanceId = propCompanionId;
  let windowLabel = "";

  if (typeof window !== "undefined" && (window as any).__TAURI_WINDOW_LABEL__) {
    windowLabel = (window as any).__TAURI_WINDOW_LABEL__;
  }

  if (!targetInstanceId && windowLabel) {
    targetInstanceId = windowLabel;
  }

  if (!targetInstanceId) {
    const hash = window.location.hash;
    const match = hash.match(/\/companion\/([^/?#]+)/);
    targetInstanceId = match ? match[1] : undefined;
  }

  if (!targetInstanceId) {
    try {
      const currentWin = getCurrentWebviewWindow();
      if (currentWin && currentWin.label && currentWin.label !== "main") {
        targetInstanceId = currentWin.label;
        windowLabel = currentWin.label;
      }
    } catch {}
  }

  // Verifica se a janela pertence a um Bichinho Virtual (Pet VPet)
  const isPetWindow = useMemo(() => {
    const allPets = usePetStore.getState().getAllCharacters();
    const cleanId = (targetInstanceId || windowLabel || "").replace("companion-", "");
    return (
      allPets.some((p) => p.id === cleanId || targetInstanceId?.includes(p.id)) ||
      targetInstanceId?.includes("mimi-sakura") ||
      cleanId.startsWith("custom-pet") ||
      targetInstanceId?.startsWith("pet-")
    );
  }, [targetInstanceId, windowLabel]);

  const resolvedInstance: CompanionInstance = useMemo(() => {
    // 1. Try finding in activeCompanions store
    const exact = activeCompanions.find(
      (c) =>
        c.instanceId === targetInstanceId ||
        `companion-${c.instanceId}` === targetInstanceId ||
        (targetInstanceId && targetInstanceId.replace("companion-", "") === c.instanceId)
    );
    if (exact) return exact;

    // 2. Infer companion ID from label (e.g. "companion-waifu-sakura-1" -> "waifu-sakura")
    const cleanId = (targetInstanceId || windowLabel || "waifu-sakura").replace("companion-", "");
    // Remove trailing timestamp or index number (e.g., "-1" or "-1727389123")
    const inferredCompId = cleanId.replace(/-\d+$/, "");
    const manifest = getCompanionManifest(inferredCompId, customCompanions) ||
      getCompanionManifest(cleanId, customCompanions) ||
      getCompanionManifest("waifu-sakura", customCompanions);

    return {
      instanceId: targetInstanceId || `companion-${manifest?.id || "waifu-sakura"}`,
      companionId: manifest?.id || "waifu-sakura",
      customName: manifest?.name || "Companheiro",
      x: 100,
      y: 100,
      scale: manifest?.defaultScale || 1.0,
      opacity: 1.0,
      alwaysOnTop: false,
      isPaused: false,
      facing: "right",
      currentState: "idle",
      stateTimer: 0,
    };
  }, [activeCompanions, targetInstanceId, windowLabel, customCompanions]);

  // Set window background to 100% transparent in WebView2
  useEffect(() => {
    document.documentElement.classList.add("is-transparent-window");
    document.body.classList.add("is-transparent-window");
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    const root = document.getElementById("root");
    if (root) {
      root.style.background = "transparent";
      root.style.backgroundColor = "transparent";
    }

    return () => {
      document.documentElement.classList.remove("is-transparent-window");
      document.body.classList.remove("is-transparent-window");
    };
  }, []);

  return (
    <div
      id="companion-desktop-root"
      className="w-screen h-screen flex items-center justify-center select-none overflow-hidden"
      style={{ background: "transparent" }}
    >
      {isPetWindow ? (
        <PetDesktopView />
      ) : (
        <CompanionAvatar instance={resolvedInstance} interactive={true} />
      )}
    </div>
  );
};

export default DesktopCompanionWindow;
