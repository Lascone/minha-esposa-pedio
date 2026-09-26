import React, { useEffect, useMemo, useRef, useState } from "react";
import { WidgetDefinition, WidgetInstance } from "../types";
import { useWidgetsStore } from "../store/widgetsStore";
import { WidgetRenderer } from "./WidgetRenderer";

interface WidgetThumbnailProps {
  def: WidgetDefinition;
  height?: number;
}

const PADDING = 12;

/** Live, non-interactive miniature of a widget for gallery cards. Mounted only while on screen. */
export const WidgetThumbnail: React.FC<WidgetThumbnailProps> = ({ def, height = 150 }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);
  const theme = useWidgetsStore((s) => s.globalTheme);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "200px" });
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    io.observe(el);
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const instance: WidgetInstance = useMemo(
    () => ({
      id: `preview-${def.type}`,
      type: def.type,
      title: def.name,
      enabled: true,
      visible: true,
      x: 0,
      y: 0,
      width: def.defaultWidth,
      height: def.defaultHeight,
      scale: 1,
      opacity: 1,
      theme: theme || "aero-glass",
      alwaysOnTop: false,
      locked: false,
      settings: { __preview: true },
    }),
    [def.type, def.name, def.defaultWidth, def.defaultHeight, theme]
  );

  const scale = Math.min(
    (boxWidth - PADDING * 2) / def.defaultWidth,
    (height - PADDING * 2) / def.defaultHeight,
    1
  );

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="relative w-full rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-sky-500/10 via-pink-500/5 to-purple-500/10 flex items-center justify-center pointer-events-none select-none"
      style={{ height }}
    >
      {onScreen && scale > 0 ? (
        <div style={{ width: def.defaultWidth * scale, height: def.defaultHeight * scale }}>
          <div
            style={{
              width: def.defaultWidth,
              height: def.defaultHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <WidgetRenderer widget={instance} thumbnail />
          </div>
        </div>
      ) : (
        <span className="text-4xl opacity-60">{def.icon}</span>
      )}
    </div>
  );
};
