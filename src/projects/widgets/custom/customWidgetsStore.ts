import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CustomWidgetPackage, CustomWidgetManifest } from "./types";
import { TEMPLATE_NEON_CLOCK, TEMPLATE_TODO_MINI } from "./templates";

interface CustomWidgetsState {
  packages: CustomWidgetPackage[];
  savePackage: (pkg: CustomWidgetPackage) => void;
  deletePackage: (id: string) => void;
  duplicatePackage: (id: string) => CustomWidgetPackage | null;
  getPackage: (id: string) => CustomWidgetPackage | undefined;
  exportPackageAsJson: (id: string) => string | null;
  importPackageFromJson: (jsonStr: string) => { success: boolean; error?: string; pkg?: CustomWidgetPackage };
}

export const useCustomWidgetsStore = create<CustomWidgetsState>()(
  persist(
    (set, get) => ({
      packages: [TEMPLATE_NEON_CLOCK, TEMPLATE_TODO_MINI],

      savePackage: (pkg: CustomWidgetPackage) => {
        set((state) => {
          const index = state.packages.findIndex((p) => p.manifest.id === pkg.manifest.id);
          const now = Date.now();
          const updatedPkg: CustomWidgetPackage = {
            ...pkg,
            updatedAt: now,
            createdAt: pkg.createdAt || now,
          };

          if (index >= 0) {
            const updated = [...state.packages];
            updated[index] = updatedPkg;
            return { packages: updated };
          } else {
            return { packages: [...state.packages, updatedPkg] };
          }
        });
      },

      deletePackage: (id: string) => {
        set((state) => ({
          packages: state.packages.filter((p) => p.manifest.id !== id),
        }));
      },

      duplicatePackage: (id: string) => {
        const original = get().packages.find((p) => p.manifest.id === id);
        if (!original) return null;

        const newId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const duplicated: CustomWidgetPackage = {
          ...original,
          manifest: {
            ...original.manifest,
            id: newId,
            name: `${original.manifest.name} (Cópia)`,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        get().savePackage(duplicated);
        return duplicated;
      },

      getPackage: (id: string) => {
        return get().packages.find((p) => p.manifest.id === id);
      },

      exportPackageAsJson: (id: string) => {
        const pkg = get().getPackage(id);
        if (!pkg) return null;
        return JSON.stringify(pkg, null, 2);
      },

      importPackageFromJson: (jsonStr: string) => {
        try {
          const parsed = JSON.parse(jsonStr);

          // Validation
          if (!parsed.manifest || !parsed.manifest.name) {
            return { success: false, error: "Manifesto inválido: campo 'name' é obrigatório." };
          }
          if (typeof parsed.html !== "string") {
            return { success: false, error: "Arquivo index.html (html) ausente ou inválido." };
          }

          const originalId = parsed.manifest.id || `custom-${Date.now()}`;
          // Ensure uniqueness if importing an existing id
          const existing = get().packages.find((p) => p.manifest.id === originalId);
          const finalId = existing ? `${originalId}-import-${Date.now()}` : originalId;

          const manifest: CustomWidgetManifest = {
            id: finalId,
            name: parsed.manifest.name,
            version: parsed.manifest.version || "1.0.0",
            author: parsed.manifest.author || "Autor Desconhecido",
            description: parsed.manifest.description || "Widget importado.",
            category: parsed.manifest.category || "utilities",
            icon: parsed.manifest.icon || "🧩",
            entry: parsed.manifest.entry || "index.html",
            defaultWidth: Number(parsed.manifest.defaultWidth) || 260,
            defaultHeight: Number(parsed.manifest.defaultHeight) || 200,
            minWidth: Number(parsed.manifest.minWidth) || 180,
            minHeight: Number(parsed.manifest.minHeight) || 120,
            resizable: parsed.manifest.resizable !== false,
            permissions: parsed.manifest.permissions || ["storage", "theme"],
            configFields: parsed.manifest.configFields || [],
            tags: parsed.manifest.tags || ["custom"],
          };

          const pkg: CustomWidgetPackage = {
            manifest,
            html: parsed.html || "",
            css: parsed.css || "",
            js: parsed.js || "",
            assets: parsed.assets || {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          get().savePackage(pkg);
          return { success: true, pkg };
        } catch (err: any) {
          return { success: false, error: err.message || "Erro ao decodificar JSON." };
        }
      },
    }),
    {
      name: "minha_esposa_custom_widgets",
    }
  )
);
