import React, { useEffect, useRef, useState, useMemo } from "react";
import { CustomWidgetPackage, SandboxMessageToParent } from "./types";
import { WidgetTheme } from "../types";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DRAG_EXEMPT_SELECTOR, DRAG_THRESHOLD_PX } from "../dragLogic";

interface WidgetSandboxProps {
  pkg: CustomWidgetPackage;
  theme?: WidgetTheme;
  initialConfig?: Record<string, any>;
  onConfigChange?: (key: string, value: any) => void;
  onRequestResize?: (width: number, height: number) => void;
  className?: string;
}

export const WidgetSandbox: React.FC<WidgetSandboxProps> = ({
  pkg,
  theme = "aero-glass",
  initialConfig = {},
  onConfigChange,
  onRequestResize,
  className = "w-full h-full",
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const configRef = useRef<Record<string, any>>(initialConfig);

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
      var _themeListeners = [];

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
          <button
            onClick={handleReload}
            className="mt-3 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
          >
            <RefreshCw size={12} />
            <span>Tentar Novamente</span>
          </button>
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
