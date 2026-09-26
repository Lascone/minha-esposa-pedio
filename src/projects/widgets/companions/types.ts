export type CompanionCategory = "waifus" | "cats" | "dogs" | "creatures" | "other";

export type CompanionActionState =
  | "idle"
  | "walk"
  | "sit"
  | "sleep"
  | "drag"
  | "click";

export interface CompanionAnimationFrame {
  src: string; // URL, data URI, or SVG/PNG path
  durationMs?: number;
}

export interface CompanionAnimationDef {
  frames: string[];
  frameDuration: number; // ms per frame
  loop?: boolean;
}

export interface CompanionManifest {
  id: string;
  name: string;
  category: CompanionCategory;
  author: string;
  license: string;
  sourceUrl?: string;
  description: string;
  preview: string;
  dimensions: {
    width: number;
    height: number;
  };
  defaultScale?: number;
  speed?: number; // Walking speed in px/s
  animations: {
    idle: CompanionAnimationDef;
    walk: CompanionAnimationDef;
    sit?: CompanionAnimationDef;
    sleep?: CompanionAnimationDef;
    drag?: CompanionAnimationDef;
    click?: CompanionAnimationDef;
    [key: string]: CompanionAnimationDef | undefined;
  };
}

export interface CompanionInstance {
  instanceId: string;
  companionId: string;
  customName?: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  alwaysOnTop: boolean;
  isPaused: boolean;
  facing: "left" | "right";
  currentState: CompanionActionState;
  stateTimer: number;
}

export interface CompanionsSettings {
  maxCompanions: number; // Default 5
  fpsCap: 30 | 60;
  pauseOnFullscreen: boolean;
  soundEnabled: boolean;
  boundaryMargin: number;
}
