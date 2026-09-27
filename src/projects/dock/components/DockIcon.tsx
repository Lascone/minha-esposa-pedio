import React, { useEffect, useState } from "react";
import { AlertTriangle, AppWindow, File, Folder, Globe, LucideIcon } from "lucide-react";
import { loadIcon } from "../dockService";
import { DockItemKind } from "../types";

export function useDockIcon(path: string | null | undefined, custom?: string | null): string | null {
  const [src, setSrc] = useState<string | null>(custom || null);
  useEffect(() => {
    if (custom) {
      setSrc(custom);
      return;
    }
    let alive = true;
    setSrc(null);
    if (path && !/^https?:\/\//i.test(path)) {
      loadIcon(path).then((s) => alive && setSrc(s));
    }
    return () => {
      alive = false;
    };
  }, [path, custom]);
  return src;
}

const FALLBACK: Record<DockItemKind, LucideIcon> = {
  app: AppWindow,
  file: File,
  folder: Folder,
  url: Globe,
  missing: AlertTriangle,
};

const FALLBACK_COLORS: Record<DockItemKind, [string, string]> = {
  app: ["#8e8e93", "#48484a"],
  file: ["#c7c7cc", "#7c7c80"],
  folder: ["#6ac4ff", "#1a8cff"],
  url: ["#5ad07a", "#1fa34a"],
  missing: ["#ffb340", "#ff7a00"],
};

interface DockIconProps {
  path?: string | null;
  customIcon?: string | null;
  kind?: DockItemKind;
  size: number;
  className?: string;
}

export const DockIcon: React.FC<DockIconProps> = ({ path, customIcon, kind = "app", size, className = "" }) => {
  const src = useDockIcon(path, customIcon);
  if (src) {
    return <img src={src} alt="" draggable={false} className={`select-none object-contain ${className}`} style={{ width: size, height: size }} />;
  }
  const Icon = FALLBACK[kind] || AppWindow;
  const [from, to] = FALLBACK_COLORS[kind] || FALLBACK_COLORS.app;
  return (
    <div
      className={`flex items-center justify-center text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        background: `linear-gradient(180deg, ${from}, ${to})`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.25)",
      }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </div>
  );
};
