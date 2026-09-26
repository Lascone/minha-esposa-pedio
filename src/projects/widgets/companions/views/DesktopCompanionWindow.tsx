import React, { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCompanionsStore } from "../store/companionsStore";
import { CompanionAvatar } from "../components/CompanionAvatar";

interface DesktopCompanionWindowProps {
  companionId?: string;
}

export const DesktopCompanionWindow: React.FC<DesktopCompanionWindowProps> = ({
  companionId: propCompanionId,
}) => {
  const { activeCompanions } = useCompanionsStore();

  // Extract instance ID from prop, Tauri window label, or hash
  let targetInstanceId = propCompanionId;
  if (!targetInstanceId) {
    try {
      const label = getCurrentWebviewWindow().label;
      if (label && label.startsWith("companion-")) {
        // e.g. "companion-companion-waifu-sakura-1" or "companion-waifu-sakura-1"
        const rawId = label.replace("companion-", "");
        if (activeCompanions.some((c) => c.instanceId === label)) {
          targetInstanceId = label;
        } else if (activeCompanions.some((c) => c.instanceId === rawId)) {
          targetInstanceId = rawId;
        } else {
          targetInstanceId = label;
        }
      }
    } catch {}
  }

  if (!targetInstanceId) {
    const hash = window.location.hash;
    const match = hash.match(/\/companion\/([^/?#]+)/);
    targetInstanceId = match ? match[1] : undefined;
  }

  const instance =
    activeCompanions.find(
      (c) =>
        c.instanceId === targetInstanceId ||
        c.instanceId === `companion-${targetInstanceId}` ||
        `companion-${c.instanceId}` === targetInstanceId
    ) || activeCompanions[0];

  // Set window background to 100% transparent in WebView2
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    const root = document.getElementById("root");
    if (root) {
      root.style.background = "transparent";
      root.style.backgroundColor = "transparent";
    }
  }, []);

  if (!instance) {
    return null;
  }

  return (
    <div
      className="w-screen h-screen flex items-center justify-center select-none overflow-hidden"
      style={{ background: "transparent" }}
    >
      <CompanionAvatar instance={instance} interactive={true} />
    </div>
  );
};

export default DesktopCompanionWindow;
