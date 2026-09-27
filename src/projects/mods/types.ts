export interface WindhawkModMetadata {
  name: string;
  description: string;
  author: string;
  version: string;
  github?: string;
  include?: string[];
  compilerOptions?: string;
  architecture?: string[];
}

export interface WindhawkModDetails {
  users?: number;
  rating?: number;
  ratingBreakdown?: number[];
  ratingUsers?: number;
  published?: number;
  updated?: number;
  defaultSorting?: number;
}

export interface WindhawkCatalogEntry {
  metadata: WindhawkModMetadata;
  details: WindhawkModDetails;
}

export type ModCategory =
  | "all"
  | "taskbar"
  | "startmenu"
  | "explorer"
  | "windows"
  | "aesthetics"
  | "system"
  | "installed"
  | "favorites";

export type ModSortOption = "popular" | "rating" | "recent" | "name";

export interface WindhawkMod {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  githubUrl: string;
  targetProcesses: string[];
  users: number;
  rating: number;
  ratingUsers: number;
  updatedAt: number;
  category: ModCategory;
  isInstalled: boolean;
  isEnabled: boolean;
  isFavorite: boolean;
  sourceCodeUrl: string;
  previewImageUrl?: string;
}

export interface WindhawkStatus {
  is_installed: boolean;
  is_running: boolean;
  executable_path: string | null;
  data_path: string | null;
  version: string | null;
  running_process_id: number | null;
  engine_status: "running" | "stopped" | "not_installed" | "integrated_active";
  engine_type?: "integrated_native" | "windhawk_core";
  total_local_mods?: number;
  active_local_mods?: number;
}

export interface LocalModState {
  id: string;
  name: string;
  enabled: boolean;
  version: string | null;
  path: string | null;
  is_custom?: boolean;
}

export interface CustomModInput {
  id: string;
  name: string;
  description: string;
  targetProcess: string;
  sourceCode?: string;
}
