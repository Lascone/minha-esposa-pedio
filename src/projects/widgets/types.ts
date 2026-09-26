export type WidgetType =
  | "analog-clock"
  | "digital-clock"
  | "calendar"
  | "weather"
  | "sticky-notes"
  | "shortcuts"
  | "cpu-meter"
  | "ram-meter"
  | "storage-meter"
  | "battery-meter";

export type WidgetTheme =
  | "aero-glass"
  | "dark-modern"
  | "cute-pastel"
  | "cyber-neon"
  | "minimal-white";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  title: string;
  enabled: boolean;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  opacity: number;
  theme: WidgetTheme;
  alwaysOnTop: boolean;
  locked: boolean;
  settings: Record<string, any>;
}

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  category: "time" | "system" | "productivity" | "utilities";
  icon: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  tags: string[];
}

export interface DiskMetric {
  drive: string;
  total_gb: number;
  free_gb: number;
  used_gb: number;
  used_percent: number;
}

export interface BatteryMetric {
  has_battery: boolean;
  is_on_battery: boolean;
  is_charging: boolean;
  percentage: number;
}

export interface RamMetric {
  total_mb: number;
  used_mb: number;
  free_mb: number;
  used_percent: number;
}

export interface SystemMetrics {
  cpu_percent: number;
  cpu_name: string;
  ram: RamMetric;
  disks: DiskMetric[];
  battery: BatteryMetric;
}
