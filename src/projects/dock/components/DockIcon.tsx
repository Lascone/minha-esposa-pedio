import React, { useEffect, useState } from "react";
import { AlertTriangle, AppWindow, File, Folder, Globe } from "lucide-react";
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

const FALLBACK: Record<DockItemKind, React.ComponentType<{ size?: number; className?: string }>> = {
  app: AppWindow,
  file: File,
  folder: Folder,
  url: Globe,
  missing: AlertTriangle,
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
  return (
    <div
      className={`flex items-center justify-center rounded-[22%] bg-gradient-to-br from-white/30 to-white/10 text-white/90 shadow-inner ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} />
    </div>
  );
};
