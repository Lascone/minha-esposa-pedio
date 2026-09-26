import { invoke } from "@tauri-apps/api/core";

export interface UpdateInfo {
  version: string;
  notes: string;
  pubDate?: string;
  url: string;
  fileName?: string;
  size?: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  updateInfo?: UpdateInfo;
  error?: string;
}

export interface UpdateProgress {
  status: "idle" | "downloading" | "ready" | "error";
  percent: number;
  message: string;
}

const GITHUB_REPO = "Lascone/minha-esposa-pedio";
const CURRENT_APP_FALLBACK = "1.0.0";
const DISMISSED_VERSION_KEY = "pmm_dismissed_update_version";

/**
 * Compara duas versões semânticas (v1.0.1 vs 1.0.0).
 * Retorna true se remoteVer for maior que currentVer.
 */
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  const cleanRemote = remoteVer.replace(/^v/, "").trim();
  const cleanCurrent = currentVer.replace(/^v/, "").trim();

  const rParts = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0);
  const cParts = cleanCurrent.split(".").map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(rParts.length, cParts.length);
  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Obtém a versão instalada atualmente do app.
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const ver = await invoke<string>("get_app_version");
    return ver || CURRENT_APP_FALLBACK;
  } catch {
    return CURRENT_APP_FALLBACK;
  }
}

/**
 * Checa se há atualização disponível no GitHub do projeto.
 */
export async function checkForUpdates(manual = false): Promise<UpdateCheckResult> {
  const currentVersion = await getCurrentVersion();

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-cache",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          hasUpdate: false,
          currentVersion,
          error: "Nenhuma versão lançada no GitHub ainda.",
        };
      }
      throw new Error(`GitHub API retornou status ${response.status}`);
    }

    const releaseData = await response.json();
    const tag = releaseData.tag_name || "";
    const remoteVersion = tag.replace(/^v/, "").trim();

    if (!remoteVersion) {
      return { hasUpdate: false, currentVersion };
    }

    // Se a versão remota não for mais recente, não há update
    if (!isNewerVersion(remoteVersion, currentVersion)) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: remoteVersion,
      };
    }

    // Se a usuária já dispensou este update específico e não foi checagem manual
    if (!manual) {
      const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
      if (dismissed === remoteVersion) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: remoteVersion,
        };
      }
    }

    // Encontra o instalador .exe entre os assets da release
    const assets = Array.isArray(releaseData.assets) ? releaseData.assets : [];
    const setupAsset = assets.find((a: any) =>
      a.name?.toLowerCase().endsWith(".exe") || a.name?.toLowerCase().includes("setup")
    );

    const downloadUrl = setupAsset
      ? setupAsset.browser_download_url
      : releaseData.html_url;

    const notes =
      releaseData.body ||
      "💕 Atualização especial preparada com muito amor para minha esposa! Aproveite as novidades ehehehe 💕";

    const updateInfo: UpdateInfo = {
      version: remoteVersion,
      notes,
      pubDate: releaseData.published_at,
      url: downloadUrl,
      fileName: setupAsset?.name || `Setup_v${remoteVersion}.exe`,
      size: setupAsset?.size,
    };

    return {
      hasUpdate: true,
      currentVersion,
      latestVersion: remoteVersion,
      updateInfo,
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion,
      error: err?.message || "Não foi possível verificar atualizações no momento.",
    };
  }
}

/**
 * Salva que esta versão foi dispensada temporariamente.
 */
export function dismissUpdate(version: string) {
  localStorage.setItem(DISMISSED_VERSION_KEY, version);
}

/**
 * Dispara o download e instalação automática via backend Tauri/Rust.
 */
export async function installUpdate(downloadUrl: string): Promise<void> {
  try {
    await invoke("download_and_run_installer", { url: downloadUrl });
  } catch (err) {
    // Fallback: abre no navegador se a chamada nativa falhar
    await openInBrowser(downloadUrl);
  }
}

/**
 * Abre o link da atualização no navegador padrão.
 */
export async function openInBrowser(url: string): Promise<void> {
  try {
    await invoke("open_external_url", { url });
  } catch {
    window.open(url, "_blank");
  }
}
