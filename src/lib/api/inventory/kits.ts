import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { KitListItem } from "@/types/kits";

export const getKits = async (params: PaginationParams): Promise<PaginatedResponse<KitListItem>> => {
  try {
    return await invoke("get_kits", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || null,
    });
  } catch (error) {
    console.error("Error fetching kits:", error);
    throw error;
  }
};
