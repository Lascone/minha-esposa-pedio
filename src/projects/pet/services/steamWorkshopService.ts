/**
 * Serviço de Integração com a Oficina Steam (Steam Workshop) do VPet Simulator
 * AppID Oficial do VPet: 1920960
 * Utiliza a Steam Web API oficial para buscar, filtrar e inspecionar mods e personagens.
 */

export interface SteamWorkshopMod {
  id: string;
  title: string;
  description: string;
  previewUrl: string;
  authorId: string;
  subscriptions: number;
  favorites: number;
  views: number;
  tags: string[];
  timeCreated: number;
  timeUpdated: number;
  steamUrl: string;
  fileSize: number;
}

export type WorkshopSortType = "popular" | "recent" | "subscriptions" | "trending";

const STEAM_APP_ID = "1920960";
const DEFAULT_STEAM_KEY = "21316D4AD610F9DA16F10C3E6F8518DF";

export class SteamWorkshopService {
  private static getApiKey(): string {
    return (
      localStorage.getItem("pmm_steam_api_key") ||
      DEFAULT_STEAM_KEY
    );
  }

  public static setApiKey(key: string): void {
    localStorage.setItem("pmm_steam_api_key", key.trim());
  }

  /**
   * Consulta os itens publicados da Oficina Steam do VPet
   */
  public static async queryWorkshopItems(options: {
    searchText?: string;
    tag?: string;
    sort?: WorkshopSortType;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SteamWorkshopMod[]; total: number }> {
    const key = this.getApiKey();
    const page = options.page || 1;
    const pageSize = options.pageSize || 24;

    // Mapeamento dos query_types da Steam Web API
    // 1: RankedByVote (Popular)
    // 0: RankedByPublicationDate (Mais Recente)
    // 3: RankedByTotalUniqueSubscriptions (Mais Inscritos)
    // 9: RankedByTrend (Em Alta)
    let queryType = 1;
    if (options.sort === "recent") queryType = 0;
    else if (options.sort === "subscriptions") queryType = 3;
    else if (options.sort === "trending") queryType = 9;

    const params = new URLSearchParams({
      key,
      appid: STEAM_APP_ID,
      query_type: queryType.toString(),
      page: page.toString(),
      numperpage: pageSize.toString(),
      return_details: "true",
      return_short_description: "true",
      return_tags: "true",
    });

    if (options.searchText && options.searchText.trim()) {
      params.append("search_text", options.searchText.trim());
    }

    if (options.tag && options.tag !== "all") {
      params.append("requiredtags[0]", options.tag);
    }

    const endpoint = `https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?${params.toString()}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Steam API retornou status HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawItems = data?.response?.publishedfiledetails || [];
      const total = data?.response?.total || rawItems.length;

      const items: SteamWorkshopMod[] = rawItems
        .filter((item: any) => item.result === 1)
        .map((item: any) => {
          const tags: string[] = Array.isArray(item.tags)
            ? item.tags.map((t: any) => t.display_name || t.tag || "")
            : [];

          return {
            id: item.publishedfileid,
            title: item.title || "Mod sem título",
            description: item.short_description || "",
            previewUrl: item.preview_url || "/vpet/vup/idle/idle_0.png",
            authorId: item.creator || "",
            subscriptions: item.subscriptions || item.lifetime_subscriptions || 0,
            favorites: item.favorited || item.lifetime_favorited || 0,
            views: item.views || 0,
            tags,
            timeCreated: item.time_created || 0,
            timeUpdated: item.time_updated || 0,
            steamUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
            fileSize: parseInt(item.file_size || "0", 10),
          };
        });

      return { items, total };
    } catch (error) {
      console.error("[SteamWorkshopService] Erro ao consultar itens:", error);
      throw error;
    }
  }

  /**
   * Busca detalhes aprofundados de um item específico
   */
  public static async getItemDetails(publishedFileId: string): Promise<SteamWorkshopMod | null> {
    const key = this.getApiKey();
    const endpoint = `https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/`;

    const formData = new FormData();
    formData.append("itemcount", "1");
    formData.append("publishedfileids[0]", publishedFileId);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) return null;
      const data = await response.json();
      const detail = data?.response?.publishedfiledetails?.[0];
      if (!detail || detail.result !== 1) return null;

      const tags: string[] = Array.isArray(detail.tags)
        ? detail.tags.map((t: any) => t.tag || "")
        : [];

      return {
        id: detail.publishedfileid,
        title: detail.title || "Mod",
        description: detail.description || "",
        previewUrl: detail.preview_url || "/vpet/vup/idle/idle_0.png",
        authorId: detail.creator || "",
        subscriptions: detail.subscriptions || detail.lifetime_subscriptions || 0,
        favorites: detail.favorited || detail.lifetime_favorited || 0,
        views: detail.views || 0,
        tags,
        timeCreated: detail.time_created || 0,
        timeUpdated: detail.time_updated || 0,
        steamUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${detail.publishedfileid}`,
        fileSize: parseInt(detail.file_size || "0", 10),
      };
    } catch (e) {
      console.error("[SteamWorkshopService] Erro ao buscar detalhes:", e);
      return null;
    }
  }
}
