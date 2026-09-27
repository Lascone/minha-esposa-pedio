import { WidgetTheme } from "../types";

export interface CustomWidgetConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "color" | "select";
  defaultValue: any;
  options?: { label: string; value: any }[];
  description?: string;
}

export interface CustomWidgetManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: "time" | "system" | "productivity" | "utilities";
  icon: string; // Emoji or SVG string
  entry: string; // Default "index.html"
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  permissions?: ("storage" | "resize" | "theme" | "audio")[];
  configFields?: CustomWidgetConfigField[];
  tags?: string[];
  website?: string;
}

export interface CustomWidgetPackage {
  manifest: CustomWidgetManifest;
  html: string;
  css: string;
  js: string;
  assets?: Record<string, string>; // Filename -> Data URI
  createdAt: number;
  updatedAt: number;
}

export interface SandboxMessageToParent {
  type: "widget:ready" | "widget:resize" | "widget:set_config" | "widget:log" | "widget:error" | "widget:drag" | "media:control";
  payload?: any;
}

export interface SandboxMessageToChild {
  type: "theme:changed" | "config:changed" | "init";
  payload?: {
    theme?: WidgetTheme;
    config?: Record<string, any>;
  };
}
