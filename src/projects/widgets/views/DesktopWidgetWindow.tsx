import React, { useEffect, useState } from "react";
import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetRenderer } from "../components/WidgetRenderer";
import { WidgetConfigModal } from "../components/WidgetConfigModal";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

interface DesktopWidgetWindowProps {
  widgetId?: string;
}

export const DesktopWidgetWindow: React.FC<DesktopWidgetWindowProps> = ({ widgetId: propWidgetId }) => {
  const { activeWidgets } = useWidgetsStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Extract widget ID from prop, Tauri window label, or URL hash
  let targetId = propWidgetId;
  if (!targetId) {
    try {
      const label = getCurrentWebviewWindow().label;
      if (label && label.startsWith("widget-")) {
        // e.g. "widget-analog-clock-1" -> "analog-clock-1" or exact widget ID
        const rawId = label.replace("widget-", "");
        // Check if there is an active widget matching rawId or full label
        if (activeWidgets.some((w) => w.id === rawId)) {
          targetId = rawId;
        } else if (activeWidgets.some((w) => w.id === label)) {
          targetId = label;
        } else {
          targetId = rawId;
        }
      }
    } catch {}
  }

  if (!targetId) {
    const hash = window.location.hash;
    const match = hash.match(/\/widget\/([^/?#]+)/);
    targetId = match ? match[1] : undefined;
  }

  const widget =
    activeWidgets.find((w) => w.id === targetId || w.id === `widget-${targetId}`) ||
    activeWidgets[0];

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

  // Handle native window dragging
  const handleDragStart = async () => {
    try {
      const appWindow = getCurrentWebviewWindow();
      await appWindow.startDragging();
    } catch {}
  };

  if (!widget) {
    return (
      <div className="p-4 text-center text-xs text-white/70 bg-black/40 rounded-2xl backdrop-blur-md">
        Gadget não encontrado
      </div>
    );
  }

  return (
    <div
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
        widget={widget}
        onOpenSettings={() => setModalOpen(true)}
      />

      {modalOpen && (
        <WidgetConfigModal
          widget={widget}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DesktopWidgetWindow;
