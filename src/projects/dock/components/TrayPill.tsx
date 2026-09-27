import React, { useEffect, useState } from "react";
import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, ChevronUp, Globe, Network, SlidersHorizontal, WifiOff } from "lucide-react";
import { DockAppearance } from "../types";
import { DockShellAction, TrayState } from "../dockService";
import { dockBarBackground } from "./DockBar";
import { contrastText, hexToRgba } from "../themes";

interface TrayPillProps {
  appearance: DockAppearance;
  /** null while loading or outside the installed app: only the clock is shown. */
  state: TrayState | null;
  onAction?: (action: DockShellAction | "peek") => void;
  nativeGlass?: boolean;
}

export function trayPillThickness(a: DockAppearance): number {
  return a.iconSize + a.padding * 2 + (a.indicator === "none" ? 0 : 4);
}

function useSeconds(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const TrayButton: React.FC<{
  title: string;
  onClick: () => void;
  text: string;
  vertical: boolean;
  size: number;
  font: number;
  children: React.ReactNode;
}> = ({ title, onClick, text, vertical, size, font, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="flex items-center justify-center gap-1.5 rounded-md transition-colors hover:[background:var(--tray-hover)]"
    style={{
      color: text,
      padding: vertical ? "6px 4px" : "4px 7px",
      flexDirection: vertical ? "column" : "row",
      height: vertical ? undefined : size,
      width: vertical ? size : undefined,
      fontSize: font,
      ["--tray-hover" as any]: hexToRgba(text, 0.1),
    }}
  >
    {children}
  </button>
);

/** Floating pill with the real clock and system indicators; each button opens the native Windows flyout. */
export const TrayPill: React.FC<TrayPillProps> = ({ appearance: a, state, onAction, nativeGlass = false }) => {
  const now = useSeconds();
  const vertical = a.edge === "left" || a.edge === "right";
  const text = contrastText(a.bgColor, a.bgOpacity);
  const thickness = trayPillThickness(a);
  const font = Math.max(11, Math.min(14, Math.round(a.iconSize * 0.36)));
  const icon = Math.max(14, Math.min(18, Math.round(a.iconSize * 0.46)));
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const btn = (action: DockShellAction | "peek") => ({
    onClick: () => onAction?.(action),
    text,
    vertical,
    size: a.iconSize,
    font,
  });

  const network = state?.network;
  const battery = state?.battery;
  const BatteryIcon = battery ? (battery.charging ? BatteryCharging : battery.percent <= 20 ? BatteryLow : battery.percent <= 60 ? BatteryMedium : BatteryFull) : null;
  const networkTitle = network === "internet" ? "Conectado à internet" : network === "local" ? "Rede sem acesso à internet" : network === "none" ? "Sem conexão" : "";

  return (
    <div
      style={{
        ...dockBarBackground(a, nativeGlass),
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: 2,
        padding: vertical ? `${a.padding}px 0` : `0 ${a.padding}px`,
        [vertical ? "width" : "height"]: thickness,
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        userSelect: "none",
      }}
    >
      <TrayButton title="Mostrar ícones da bandeja (bandeja verdadeira do Windows)" {...btn("peek")}>
        <ChevronUp size={icon} />
      </TrayButton>
      {state?.language && (
        <TrayButton title="Idioma do teclado (Win + Espaço)" {...btn("language")}>
          <span style={{ fontWeight: 600, letterSpacing: 0.3 }}>{state.language}</span>
        </TrayButton>
      )}
      <TrayButton
        title={[networkTitle, battery ? `Bateria ${battery.percent}%${battery.charging ? " (carregando)" : ""}` : "", "Configurações rápidas (Win + A)"].filter(Boolean).join(" · ")}
        {...btn("quicksettings")}
      >
        {network === "internet" ? <Globe size={icon} /> : network === "local" ? <Network size={icon} /> : network === "none" ? <WifiOff size={icon} /> : null}
        {BatteryIcon && (
          <span className="flex items-center gap-0.5">
            <BatteryIcon size={icon} />
            <span style={{ fontSize: font - 1 }}>{battery!.percent}%</span>
          </span>
        )}
        {!network && !BatteryIcon && <SlidersHorizontal size={icon} />}
      </TrayButton>
      <TrayButton title={`${date} · Notificações e calendário (Win + N)`} {...btn("notifications")}>
        <span style={{ fontWeight: 500 }}>{vertical ? time.slice(0, 5) : time}</span>
      </TrayButton>
    </div>
  );
};
