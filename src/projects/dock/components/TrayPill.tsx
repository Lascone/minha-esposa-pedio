import React, { useEffect, useState } from "react";
import {
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  ChevronUp,
  Globe,
  SignalHigh,
  SlidersHorizontal,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  WifiHigh,
  WifiLow,
  WifiOff,
  WifiZero,
} from "lucide-react";
import { DockAppearance, DockTrayItems } from "../types";
import { DockShellAction, TrayState } from "../dockService";
import { networkIcon, NetworkIcon, volumeIcon } from "../logic";
import { dockBarBackground } from "./DockBar";
import { contrastText, hexToRgba } from "../themes";

interface TrayPillProps {
  appearance: DockAppearance;
  /** null while loading or outside the installed app: only the clock is shown. */
  state: TrayState | null;
  onAction?: (action: DockShellAction | "peek") => void;
  /** Mouse wheel over the network/volume button (+ up, - down), in volume points. */
  onVolumeWheel?: (delta: number) => void;
  nativeGlass?: boolean;
  items?: DockTrayItems;
}

const ALL_ITEMS: DockTrayItems = { chevron: true, language: true, quick: true, seconds: true, date: false };

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

/** Monitor with a cable, the icon Windows 11 uses for a wired connection. */
const EthernetIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M12 16v3" />
    <path d="M8 20h8" />
  </svg>
);

const NetworkGlyph: React.FC<{ kind: NetworkIcon; size: number; limited: boolean }> = ({ kind, size, limited }) => {
  const style = limited ? { opacity: 0.55 } : undefined;
  switch (kind) {
    case "ethernet":
      return <span style={style} className="flex"><EthernetIcon size={size} /></span>;
    case "wifi-4":
      return <Wifi size={size} style={style} />;
    case "wifi-3":
      return <WifiHigh size={size} style={style} />;
    case "wifi-2":
      return <WifiLow size={size} style={style} />;
    case "wifi-1":
      return <WifiZero size={size} style={style} />;
    case "cellular":
      return <SignalHigh size={size} style={style} />;
    case "offline":
      return <WifiOff size={size} />;
    case "generic":
      return <Globe size={size} style={style} />;
    default:
      return null;
  }
};

const TrayButton: React.FC<{
  title: string;
  onClick: () => void;
  onWheel?: (e: React.WheelEvent) => void;
  text: string;
  vertical: boolean;
  size: number;
  font: number;
  children: React.ReactNode;
}> = ({ title, onClick, onWheel, text, vertical, size, font, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    onWheel={onWheel}
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
export const TrayPill: React.FC<TrayPillProps> = ({ appearance: a, state, onAction, onVolumeWheel, nativeGlass = false, items = ALL_ITEMS }) => {
  const now = useSeconds();
  const vertical = a.edge === "left" || a.edge === "right";
  const text = contrastText(a.bgColor, a.bgOpacity);
  const thickness = trayPillThickness(a);
  const font = Math.max(11, Math.min(14, Math.round(a.iconSize * 0.36)));
  const icon = Math.max(14, Math.min(18, Math.round(a.iconSize * 0.46)));
  const time = now.toLocaleTimeString("pt-BR", items.seconds && !vertical ? { hour: "2-digit", minute: "2-digit", second: "2-digit" } : { hour: "2-digit", minute: "2-digit" });
  const shortDate = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const twoLines = items.date && !vertical && a.iconSize >= 30;

  const btn = (action: DockShellAction | "peek") => ({
    onClick: () => onAction?.(action),
    text,
    vertical,
    size: a.iconSize,
    font,
  });

  const network = state?.network ?? null;
  const net = state ? networkIcon(state) : null;
  const volume = state?.volume ?? null;
  const vol = volume ? volumeIcon(volume) : null;
  const VolumeGlyph = vol === "muted" ? VolumeX : vol === "low" ? Volume : vol === "mid" ? Volume1 : Volume2;
  const battery = state?.battery;
  const BatteryIcon = battery ? (battery.charging ? BatteryCharging : battery.percent <= 20 ? BatteryLow : battery.percent <= 60 ? BatteryMedium : BatteryFull) : null;

  const connectionName =
    state?.connection === "wifi"
      ? `Wi-Fi${state.wifiSignal != null ? ` (sinal ${state.wifiSignal}%)` : ""}`
      : state?.connection === "ethernet"
        ? "Cabo de rede"
        : state?.connection === "cellular"
          ? "Rede celular"
          : "Rede";
  const networkTitle =
    network === "internet" ? `${connectionName}: conectado à internet` : network === "local" ? `${connectionName}: sem acesso à internet` : network === "none" ? "Sem conexão" : "";
  const volumeTitle = volume ? (volume.muted ? "Som mudo" : `Volume ${volume.percent}%`) : "";

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
      {items.chevron && (
        <TrayButton title="Mostrar ícones ocultos da bandeja" {...btn("peek")}>
          <ChevronUp size={icon} />
        </TrayButton>
      )}
      {items.language && state?.language && (
        <TrayButton title="Idioma do teclado (Win + Espaço)" {...btn("language")}>
          <span style={{ fontWeight: 600, letterSpacing: 0.3 }}>{state.language}</span>
        </TrayButton>
      )}
      {items.quick && (
        <TrayButton
          title={[
            networkTitle,
            volumeTitle,
            battery ? `Bateria ${battery.percent}%${battery.charging ? " (carregando)" : ""}` : "",
            volume ? "Role o mouse aqui para mudar o volume" : "",
            "Clique para as configurações rápidas (Win + A)",
          ]
            .filter(Boolean)
            .join("\n")}
          onWheel={volume && onVolumeWheel ? (e) => onVolumeWheel(e.deltaY < 0 ? 2 : -2) : undefined}
          {...btn("quicksettings")}
        >
          <NetworkGlyph kind={net} size={icon} limited={network === "local"} />
          {vol && <VolumeGlyph size={icon} />}
          {BatteryIcon && (
            <span className="flex items-center gap-0.5">
              <BatteryIcon size={icon} />
              <span style={{ fontSize: font - 1 }}>{battery!.percent}%</span>
            </span>
          )}
          {!net && !vol && !BatteryIcon && <SlidersHorizontal size={icon} />}
        </TrayButton>
      )}
      <TrayButton title={`${date} · Notificações e calendário (Win + N)`} {...btn("notifications")}>
        {twoLines ? (
          <span className="flex flex-col items-end leading-tight">
            <span style={{ fontWeight: 500 }}>{time}</span>
            <span style={{ fontSize: font - 2, opacity: 0.8 }}>{shortDate}</span>
          </span>
        ) : (
          <span style={{ fontWeight: 500 }}>{time}</span>
        )}
      </TrayButton>
    </div>
  );
};
