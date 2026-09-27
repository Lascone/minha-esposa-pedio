import React, { useState, useEffect, Suspense } from "react";
import { AppLayout } from "./core/layout/AppLayout";
import { HomeView } from "./core/views/HomeView";
import { ProjectsView } from "./core/views/ProjectsView";
import { SettingsView } from "./core/views/SettingsView";
import { AboutView } from "./core/views/AboutView";
import { AssetHubView } from "./core/views/AssetHubView";
import { ProfileView } from "./core/views/ProfileView";
import { ShortcutsHubView } from "./core/views/ShortcutsHubView";
import { CrosshairApp } from "./projects/crosshair/CrosshairApp";
import { WidgetsApp } from "./projects/widgets/WidgetsApp";
import { DesktopWidgetWindow } from "./projects/widgets/views/DesktopWidgetWindow";
import { useWidgetsStore } from "./projects/widgets/store/widgetsStore";
import { DesktopCompanionWindow } from "./projects/widgets/companions/views/DesktopCompanionWindow";
import { useCompanionsStore } from "./projects/widgets/companions/store/companionsStore";
import { AutoClickApp } from "./projects/autoclick/AutoClickApp";
import { ManageGamesView } from "./projects/widgets/console/components/ManageGamesView";
import { OverlayApp } from "./overlay/OverlayApp";
import { DockWindow } from "./projects/dock/views/DockWindow";
import { DockView } from "./projects/dock/views/DockView";
import { startDockOnLaunch } from "./projects/dock/dockLifecycle";
import { useCrosshairStore } from "./projects/crosshair/store/crosshairStore";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { checkForUpdates, UpdateInfo } from "./core/services/updateService";
import { UpdateModal } from "./core/components/UpdateModal";
import { syncAllSavedShortcutsToBackend } from "./core/stores/shortcutsStore";
import { useAutoClickStore } from "./projects/autoclick/store/autoclickStore";

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.hash ? window.location.hash.replace("#", "") : "/";
  });

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [currentAppVersion, setCurrentAppVersion] = useState("1.0.0");

  const {
    activeCrosshair,
    isOverlayActive,
    setOverlayActive,
    selectedMonitorIndex,
    overlayOffsetX,
    overlayOffsetY,
  } = useCrosshairStore();


  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.replace("#", "") || "/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Synchronize Overlay state and active crosshair with native Tauri backend
  useEffect(() => {
    const syncNativeOverlay = async () => {
      try {
        await invoke("set_overlay_state", {
          config: {
            visible: isOverlayActive,
            monitor_index: selectedMonitorIndex,
            offset_x: overlayOffsetX,
            offset_y: overlayOffsetY,
            size: 500,
          },
        });

        // Broadcast active crosshair directly to overlay window
        await emit("crosshair-data-updated", activeCrosshair);
        await emit("overlay-offsets-updated", {
          x: overlayOffsetX,
          y: overlayOffsetY,
        });
      } catch (e) {
        // Silently catch when running purely in web browser dev
      }
    };
    syncNativeOverlay();
  }, [isOverlayActive, activeCrosshair, selectedMonitorIndex, overlayOffsetX, overlayOffsetY]);


  // Listen to native tray toggle events
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<boolean>("overlay-state-changed", (event) => {
      setOverlayActive(event.payload);
    }).then((fn) => {
      unlisten = fn;
    }).catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, [setOverlayActive]);

  // Synchronize OS-level shortcuts to Rust backend on startup
  useEffect(() => {
    syncAllSavedShortcutsToBackend();
  }, []);

  // Root-level global listeners for automation shortcuts (AutoClick & Bots)
  useEffect(() => {
    let unlistenAutoclickStart: (() => void) | undefined;
    let unlistenAutoclickStatus: (() => void) | undefined;
    let unlistenWidgetsToggle: (() => void) | undefined;

    // 1. AutoClick Start request from native hotkey
    listen("autoclick-start-requested", () => {
      const s = useAutoClickStore.getState();
      if (!s.isRunning) {
        s.startAutoClick();
      }
    })
      .then((fn) => {
        unlistenAutoclickStart = fn;
      })
      .catch(() => {});

    // 2. AutoClick Status update from native hotkey / engine
    listen<boolean>("autoclick-status-changed", (event) => {
      const isRunningNative = event.payload;
      const s = useAutoClickStore.getState();
      if (!isRunningNative && s.isRunning) {
        s.stopAutoClick("Atalho nativo disparado");
      }
    })
      .then((fn) => {
        unlistenAutoclickStatus = fn;
      })
      .catch(() => {});

    // 3. Desktop Widgets toggle request from native hotkey / tray
    listen("widgets-toggle-all-requested", () => {
      useWidgetsStore.getState().toggleAllWidgets();
    })
      .then((fn) => {
        unlistenWidgetsToggle = fn;
      })
      .catch(() => {});

    return () => {
      if (unlistenAutoclickStart) unlistenAutoclickStart();
      if (unlistenAutoclickStatus) unlistenAutoclickStatus();
      if (unlistenWidgetsToggle) unlistenWidgetsToggle();
    };
  }, []);

  // Window-level keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const savedOverlayKey = (localStorage.getItem("pmm_hotkey_overlay") || "F10").toUpperCase();
      const savedAppKey = (localStorage.getItem("pmm_hotkey_app") || "Control+H").toUpperCase();

      const keyUpper = e.key.toUpperCase();

      // Check Overlay Hotkey
      const isOverlayKeyMatch =
        keyUpper === savedOverlayKey ||
        (savedOverlayKey === "CONTROL+ALT+X" && e.ctrlKey && e.altKey && e.key.toLowerCase() === "x") ||
        (savedOverlayKey.startsWith("F") && keyUpper === savedOverlayKey) ||
        e.key === "F10";

      if (isOverlayKeyMatch) {
        e.preventDefault();
        setOverlayActive(!isOverlayActive);
        return;
      }

      // Check App Hotkey
      const isAppKeyMatch =
        (savedAppKey === "CONTROL+H" && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") ||
        (savedAppKey === "CONTROL+ALT+C" && e.ctrlKey && e.altKey && e.key.toLowerCase() === "c");

      if (isAppKeyMatch) {
        e.preventDefault();
        invoke("hide_main_window").catch(() => {});
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOverlayActive, setOverlayActive]);

  // Determine current Tauri window label synchronously with reactive fallback
  const getDetectedWindowLabel = (): string => {
    try {
      if ((window as any).__TAURI_WINDOW_LABEL__) {
        return (window as any).__TAURI_WINDOW_LABEL__;
      }
      const hash = window.location.hash;
      const widgetMatch = hash.match(/\/widget\/([^/?#]+)/);
      if (widgetMatch) return widgetMatch[1];
      const compMatch = hash.match(/\/companion\/([^/?#]+)/);
      if (compMatch) return compMatch[1];
      if (hash.includes("overlay")) return "overlay";

      const internals = (window as any).__TAURI_INTERNALS__;
      if (internals?.metadata?.currentWebview?.label) {
        return internals.metadata.currentWebview.label;
      }
      if (internals?.metadata?.currentWindow?.label) {
        return internals.metadata.currentWindow.label;
      }
      const currentWin = getCurrentWebviewWindow();
      if (currentWin && currentWin.label) {
        return currentWin.label;
      }
    } catch {}
    return "main";
  };

  const [windowLabel, setWindowLabel] = useState<string>(getDetectedWindowLabel);

  useEffect(() => {
    const detected = getDetectedWindowLabel();
    if (detected !== windowLabel) {
      setWindowLabel(detected);
    }
  }, [windowLabel]);

  const isWidgetWindow =
    (typeof window !== "undefined" && (window as any).__TAURI_WINDOW_LABEL__?.startsWith("widget-")) ||
    windowLabel.startsWith("widget-") ||
    currentRoute.startsWith("/widget/") ||
    window.location.hash.startsWith("#/widget/");

  const isCompanionWindow =
    (typeof window !== "undefined" && (window as any).__TAURI_WINDOW_LABEL__?.startsWith("companion-")) ||
    windowLabel.startsWith("companion-") ||
    currentRoute.startsWith("/companion/") ||
    window.location.hash.startsWith("#/companion/");

  const isOverlayWindow =
    windowLabel === "overlay" ||
    currentRoute === "/overlay" ||
    window.location.hash.startsWith("#/overlay");

  const isDockWindow = windowLabel === "dock" || currentRoute === "/dock";

  // Auto-launch active desktop widgets and companions ONLY in the real main window
  useEffect(() => {
    if (windowLabel === "main" && !isWidgetWindow && !isCompanionWindow && !isOverlayWindow && !isDockWindow) {
      const timer = setTimeout(() => {
        useWidgetsStore.getState().launchAllActiveWidgets();
        useCompanionsStore.getState().launchAllActiveCompanions();
        startDockOnLaunch();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [windowLabel, isWidgetWindow, isCompanionWindow, isOverlayWindow, isDockWindow]);

  // "Configurar dock…" from the dock's context menu
  useEffect(() => {
    if (windowLabel !== "main") return;
    const off = listen("dock-open-settings", () => {
      window.location.hash = "/dock-settings";
      setCurrentRoute("/dock-settings");
    });
    return () => {
      off.then((f) => f()).catch(() => {});
    };
  }, [windowLabel]);

  // If this window is the dedicated overlay window, render only the overlay canvas
  if (isOverlayWindow) {
    return <OverlayApp />;
  }

  if (isDockWindow) {
    return <DockWindow />;
  }

  // If this window is an independent native desktop widget window
  if (isWidgetWindow) {
    return <DesktopWidgetWindow />;
  }

  // If this window is an independent native desktop companion mascot window
  if (isCompanionWindow) {
    return <DesktopCompanionWindow />;
  }

  const navigate = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
  };

  const renderContent = () => {
    if (currentRoute === "/hub") {
      return <AssetHubView onNavigateToStudio={() => navigate("/projects/crosshair")} />;
    }
    if (currentRoute === "/profile") {
      return <ProfileView />;
    }
    if (currentRoute === "/projects/crosshair") {
      return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-theme-text-muted">Carregando Crosshair Studio... ✨</div>}>
          <CrosshairApp />
        </Suspense>
      );
    }
    if (currentRoute === "/widgets" || currentRoute.startsWith("/widgets/")) {
      return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-theme-text-muted">Carregando Gadgets da Área de Trabalho... 🪟</div>}>
          <WidgetsApp />
        </Suspense>
      );
    }
    if (currentRoute === "/autoclick" || currentRoute === "/projects/autoclick") {
      return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-theme-text-muted">Carregando Auto Click... 🖱️</div>}>
          <AutoClickApp />
        </Suspense>
      );
    }
    if (currentRoute === "/dock-settings") {
      return <DockView />;
    }
    if (currentRoute === "/projects") {
      return <ProjectsView onSelectProject={(slug) => navigate(`/projects/${slug}`)} />;
    }
    if (currentRoute === "/shortcuts") {
      return <ShortcutsHubView />;
    }
    if (currentRoute === "/settings") {
      return <SettingsView />;
    }
    if (currentRoute === "/settings/console") {
      return <ManageGamesView />;
    }
    if (currentRoute === "/about") {
      return <AboutView />;
    }
    return (
      <HomeView
        onNavigateToProject={(slug) => navigate(`/projects/${slug}`)}
        onNavigateToTab={(tab) => navigate(`/${tab}`)}
      />
    );
  };

  // Verificação automática silenciosa de atualizações após iniciar
  useEffect(() => {
    // Apenas na janela principal, não na sobreposição (overlay)
    if (window.location.hash.includes("overlay")) return;

    const timer = setTimeout(async () => {
      try {
        const res = await checkForUpdates(false);
        if (res.hasUpdate && res.updateInfo) {
          setUpdateInfo(res.updateInfo);
          setCurrentAppVersion(res.currentVersion);
          setUpdateModalOpen(true);
        }
      } catch {}
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AppLayout currentRoute={currentRoute} onNavigate={navigate}>
        {renderContent()}
      </AppLayout>

      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
        currentVersion={currentAppVersion}
      />
    </>
  );
};

export default App;
