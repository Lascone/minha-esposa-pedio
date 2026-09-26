import React, { useEffect, useState, useMemo } from "react";
import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetRenderer } from "../components/WidgetRenderer";
import { WidgetConfigModal } from "../components/WidgetConfigModal";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getWidgetDefinition } from "../registry";
import { useCustomWidgetsStore } from "../custom/customWidgetsStore";
import { WidgetInstance, WidgetType } from "../types";

interface DesktopWidgetWindowProps {
  widgetId?: string;
}

export const DesktopWidgetWindow: React.FC<DesktopWidgetWindowProps> = ({
  widgetId: propWidgetId,
}) => {
  const { activeWidgets, globalTheme, globalScale, globalOpacity } = useWidgetsStore();
  const { packages: customPackages } = useCustomWidgetsStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Extract widget ID from prop, Tauri window label, or URL hash
  let targetId = propWidgetId;
  let windowLabel = "";

  try {
    const currentWin = getCurrentWebviewWindow();
    if (currentWin && currentWin.label) {
      windowLabel = currentWin.label;
    }
  } catch {}

  if (!targetId && windowLabel) {
    targetId = windowLabel;
  }

  if (!targetId) {
    const hash = window.location.hash;
    const match = hash.match(/\/widget\/([^/?#]+)/);
    targetId = match ? match[1] : undefined;
  }

  // Resolve widget instance with ultra-resilient fallback
  const resolvedWidget: WidgetInstance = useMemo(() => {
    // 1. Try finding in activeWidgets store
    const exact = activeWidgets.find(
      (w) =>
        w.id === targetId ||
        `widget-${w.id}` === targetId ||
        (targetId && targetId.replace("widget-", "") === w.id)
    );
    if (exact) {
      return {
        ...exact,
        settings: exact.settings || {},
        alwaysOnTop: true,
      };
    }

    // 2. Infer type from label / targetId (e.g. "widget-pomodoro-12345" -> "pomodoro")
    const cleanId = (targetId || windowLabel || "widget-analog-clock-1").replace("widget-", "");
    const candidateId = cleanId.replace(/-\d+$/, "");
    const matchType = cleanId.split("-")[0] + (cleanId.split("-")[1] && isNaN(Number(cleanId.split("-")[1])) ? `-${cleanId.split("-")[1]}` : "");
    const def = getWidgetDefinition(candidateId) || getWidgetDefinition(matchType) || getWidgetDefinition(cleanId);
    const customPkg = customPackages.find(
      (p) => p.manifest.id === candidateId || p.manifest.id === cleanId || p.manifest.id === targetId || p.manifest.id === matchType
    );

    const finalType = (customPkg ? customPkg.manifest.id : def ? def.type : "analog-clock") as WidgetType;
    const finalTitle = customPkg ? customPkg.manifest.name : def ? def.name : "Gadget";
    const width = customPkg ? customPkg.manifest.defaultWidth : def ? def.defaultWidth : 240;
    const height = customPkg ? customPkg.manifest.defaultHeight : def ? def.defaultHeight : 240;

    return {
      id: targetId || `widget-${finalType}`,
      type: finalType,
      title: finalTitle,
      enabled: true,
      visible: true,
      x: 0,
      y: 0,
      width,
      height,
      scale: globalScale || 1.0,
      opacity: globalOpacity || 0.95,
      theme: globalTheme || "aero-glass",
      alwaysOnTop: true,
      locked: false,
      settings: {},
    };
  }, [activeWidgets, targetId, windowLabel, customPackages, globalTheme, globalScale, globalOpacity]);

  // Set window background to 100% transparent in WebView2
  useEffect(() => {
    document.documentElement.classList.add("is-transparent-window");
    document.body.classList.add("is-transparent-window");
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.documentElement.style.overflow = "hidden";
    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.body.style.overflow = "hidden";
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

  // Handle native window dragging
  const handleDragStart = async () => {
    try {
      const appWindow = getCurrentWebviewWindow();
      await appWindow.startDragging();
    } catch {}
  };

  return (
    <div
      id="widget-desktop-root"
      data-tauri-drag-region
      onMouseDown={(e) => {
        // Only start dragging if not clicking on interactive buttons or form fields
        if (!(e.target as HTMLElement).closest("button, input, textarea, a")) {
          handleDragStart();
        }
      }}
      className="w-screen h-screen flex items-center justify-center select-none overflow-hidden"
      style={{ background: "transparent" }}
    >
      <WidgetRenderer
        widget={resolvedWidget}
        onOpenSettings={() => setModalOpen(true)}
      />

      {modalOpen && (
        <WidgetConfigModal
          widget={resolvedWidget}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DesktopWidgetWindow;
