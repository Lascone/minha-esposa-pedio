import React, { useEffect, useRef, useState, useMemo } from "react";
import { CustomWidgetPackage, SandboxMessageToParent } from "./types";
import { WidgetTheme } from "../types";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { DRAG_EXEMPT_SELECTOR, DRAG_THRESHOLD_PX } from "../dragLogic";
import { useIntegrationsStore } from "@/core/stores/integrationsStore";
import { useSnesCustomizerStore, SNES_SKINS } from "../console/snesCustomizer";

interface WidgetSandboxProps {
  pkg: CustomWidgetPackage;
  theme?: WidgetTheme;
  initialConfig?: Record<string, any>;
  onConfigChange?: (key: string, value: any) => void;
  onRequestResize?: (width: number, height: number) => void;
  onFixWithAi?: (errorMsg: string) => void;
  className?: string;
}

export const WidgetSandbox: React.FC<WidgetSandboxProps> = ({
  pkg,
  theme = "aero-glass",
  initialConfig = {},
  onConfigChange,
  onRequestResize,
  onFixWithAi,
  className = "w-full h-full",
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const configRef = useRef<Record<string, any>>(initialConfig);

  const activeTrack = useIntegrationsStore((s) => s.activeTrack);
  const gmailSummary = useIntegrationsStore((s) => s.gmailSummary);
  const snesConfig = useSnesCustomizerStore((s) => s.config);
  const snesSkin = SNES_SKINS[snesConfig.skinId] || SNES_SKINS["snes-classic"];

  // Keep configRef updated
  useEffect(() => {
    configRef.current = initialConfig;
  }, [initialConfig]);

  // Handle messages from the isolated sandbox
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: only messages from our iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const data: SandboxMessageToParent = event.data;
      if (!data || typeof data !== "object") return;

      switch (data.type) {
        case "widget:ready":
          setIsReady(true);
          setSandboxError(null);
          break;

        case "widget:set_config":
          if (data.payload && typeof data.payload.key === "string") {
            const { key, value } = data.payload;
            configRef.current[key] = value;
            if (onConfigChange) onConfigChange(key, value);
          }
          break;

        case "widget:resize":
          if (
            data.payload &&
            typeof data.payload.width === "number" &&
            typeof data.payload.height === "number"
          ) {
            if (onRequestResize) {
              onRequestResize(data.payload.width, data.payload.height);
            }
          }
          break;

        case "widget:error":
          setSandboxError(String(data.payload || "Erro de execução no widget."));
          break;

        case "media:control":
          if (data.payload?.action === "toggle") {
            useIntegrationsStore.getState().togglePlayPause();
          } else if (data.payload?.action === "next") {
            useIntegrationsStore.getState().skipTrack("next");
          } else if (data.payload?.action === "prev") {
            useIntegrationsStore.getState().skipTrack("prev");
          }
          break;

        case "widget:log":
          // Optional debug logging in sandbox
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onConfigChange, onRequestResize]);

  // Sync theme changes to child
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "theme:changed",
          payload: { theme },
        },
        "*"
      );
    }
  }, [theme]);

  // Sync media track updates
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "media:track_changed",
          payload: activeTrack,
        },
        "*"
      );
    }
  }, [activeTrack]);

  // Sync Gmail summary updates
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "gmail:summary_changed",
          payload: gmailSummary,
        },
        "*"
      );
    }
  }, [gmailSummary]);

  // Sync SNES customization skin
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "snes:skin_changed",
          payload: snesSkin,
        },
        "*"
      );
    }
  }, [snesSkin]);

  // Construct srcdoc with isolated WidgetAPI bridge
  const srcDoc = useMemo(() => {
    const safeConfigJson = JSON.stringify(initialConfig).replace(/</g, "\\u003c");
    const safeTheme = JSON.stringify(theme);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* Injected Base Styles */
    :root {
      --widget-theme: ${safeTheme};
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    /* User CSS */
    ${pkg.css || ""}
  </style>
  <script>
    (function() {
      // Secure WidgetAPI Bridge
      var _config = ${safeConfigJson};
      var _theme = ${safeTheme};
      var _mediaTrack = ${JSON.stringify(activeTrack).replace(/</g, "\\u003c")};
      var _gmailSummary = ${JSON.stringify(gmailSummary).replace(/</g, "\\u003c")};
      var _snesSkin = ${JSON.stringify(snesSkin).replace(/</g, "\\u003c")};
      var _themeListeners = [];
      var _mediaListeners = [];
      var _gmailListeners = [];
      var _snesListeners = [];

      window.WidgetAPI = {
        getConfig: function(key, defaultValue) {
          if (_config && key in _config) {
            return _config[key];
          }
          return defaultValue;
        },
        setConfig: function(key, value) {
          if (!_config) _config = {};
          _config[key] = value;
          window.parent.postMessage({
            type: "widget:set_config",
            payload: { key: key, value: value }
          }, "*");
        },
        requestResize: function(width, height) {
          window.parent.postMessage({
            type: "widget:resize",
            payload: { width: width, height: height }
          }, "*");
        },
        getTheme: function() {
          return _theme;
        },
        onThemeChange: function(callback) {
          if (typeof callback === "function") {
            _themeListeners.push(callback);
          }
        },
        media: {
          getCurrentTrack: function() {
            return _mediaTrack;
          },
          togglePlay: function() {
            window.parent.postMessage({ type: "media:control", payload: { action: "toggle" } }, "*");
          },
          nextTrack: function() {
            window.parent.postMessage({ type: "media:control", payload: { action: "next" } }, "*");
          },
          prevTrack: function() {
            window.parent.postMessage({ type: "media:control", payload: { action: "prev" } }, "*");
          },
          onTrackChange: function(callback) {
            if (typeof callback === "function") {
              _mediaListeners.push(callback);
            }
          }
        },
        gmail: {
          getSummary: function() {
            return _gmailSummary;
          },
          onSummaryChange: function(callback) {
            if (typeof callback === "function") {
              _gmailListeners.push(callback);
            }
          }
        },
        snes: {
          getSkin: function() {
            return _snesSkin;
          },
          onSkinChange: function(callback) {
            if (typeof callback === "function") {
              _snesListeners.push(callback);
            }
          }
        },
        emitReady: function() {
          window.parent.postMessage({ type: "widget:ready" }, "*");
        },
        log: function() {
          var args = Array.prototype.slice.call(arguments);
          window.parent.postMessage({
            type: "widget:log",
            payload: args
          }, "*");
        }
      };

      // Listen for parent messages
      window.addEventListener("message", function(e) {
        if (!e.data) return;
        if (e.data.type === "theme:changed") {
          _theme = e.data.payload.theme;
          document.documentElement.style.setProperty("--widget-theme", _theme);
          _themeListeners.forEach(function(fn) {
            try { fn(_theme); } catch(err) { console.error(err); }
          });
        }
        if (e.data.type === "media:track_changed") {
          _mediaTrack = e.data.payload;
          _mediaListeners.forEach(function(fn) {
            try { fn(_mediaTrack); } catch(err) { console.error(err); }
          });
        }
        if (e.data.type === "gmail:summary_changed") {
          _gmailSummary = e.data.payload;
          _gmailListeners.forEach(function(fn) {
            try { fn(_gmailSummary); } catch(err) { console.error(err); }
          });
        }
        if (e.data.type === "snes:skin_changed") {
          _snesSkin = e.data.payload;
          _snesListeners.forEach(function(fn) {
            try { fn(_snesSkin); } catch(err) { console.error(err); }
          });
        }
      });

      // Hold and drag on any non-control spot moves the widget (the host window does the move).
      var _press = null;
      var _exempt = ${JSON.stringify(DRAG_EXEMPT_SELECTOR)};
      document.addEventListener("pointerdown", function(e) {
        var t = e.target;
        _press = (e.button === 0 && !(t && t.closest && t.closest(_exempt))) ? { x: e.screenX, y: e.screenY } : null;
      }, true);
      document.addEventListener("pointermove", function(e) {
        if (!_press) return;
        if ((e.buttons & 1) === 0) { _press = null; return; }
        if (Math.abs(e.screenX - _press.x) + Math.abs(e.screenY - _press.y) >= ${DRAG_THRESHOLD_PX}) {
          _press = null;
          window.parent.postMessage({ type: "widget:drag" }, "*");
        }
      }, true);
      document.addEventListener("pointerup", function() { _press = null; }, true);

      // Capture runtime errors safely
      window.onerror = function(msg, url, line, col, error) {
        window.parent.postMessage({
          type: "widget:error",
          payload: msg + " (Linha: " + line + ")"
        }, "*");
        return false;
      };
    })();
  </script>
</head>
<body>
  ${pkg.html || ""}
  <script>
    try {
      ${pkg.js || ""}
    } catch (err) {
      window.parent.postMessage({
        type: "widget:error",
        payload: err.message
      }, "*");
    }
  </script>
</body>
</html>`;
  }, [pkg, theme, initialConfig]);

  const handleReload = () => {
    setSandboxError(null);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = srcDoc;
    }
  };

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {sandboxError && (
        <div className="absolute inset-0 z-20 bg-rose-950/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center text-rose-200">
          <AlertTriangle className="w-8 h-8 text-rose-400 mb-2 animate-bounce" />
          <h4 className="text-xs font-bold text-rose-300">Erro no Widget Personalizado</h4>
          <p className="text-[11px] text-rose-200/80 mt-1 max-w-xs break-words font-mono">
            {sandboxError}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <button
              onClick={handleReload}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow transition-all"
            >
              <RefreshCw size={12} />
              <span>Tentar Novamente</span>
            </button>
            {onFixWithAi && (
              <button
                onClick={() => onFixWithAi(sandboxError)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft transition-all active:scale-95"
              >
                <Sparkles size={13} className="text-yellow-200" />
                <span>Consertar com IA ✨</span>
              </button>
            )}
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="w-full h-full border-0 bg-transparent"
        title={pkg.manifest.name}
      />
    </div>
  );
};
