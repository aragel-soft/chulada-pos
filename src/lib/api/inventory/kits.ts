import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { CreateKitPayload, KitListItem, KitDefinitionWithTrigger } from "@/types/kits";

export const getKits = async (params: PaginationParams): Promise<PaginatedResponse<KitListItem>> => {
  try {
    return await invoke("get_kits", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || null,
      sortBy: params.sortBy || null,
      sortOrder: params.sortOrder || null,
    });
  } catch (error) {
    console.error("Error fetching kits:", error);
    throw error;
  }
};

export const checkProductsInActiveKits = async (productIds: string[]): Promise<string[]> => {
  try {
    return await invoke("check_products_in_active_kits", { productIds });
  } catch (error) {
    console.error("Error checking active kits conflicts:", error);
    throw error;
  }
};

export const createKit = async (payload: CreateKitPayload): Promise<void> => {
  try {
    return await invoke("create_kit", { payload });
  } catch (error) {
    console.error("Error creating kit:", error);
    throw error;
  }
};

export const getAllKits = async (): Promise<KitDefinitionWithTrigger[]> => {
  try {
    return await invoke("get_all_kits");
  } catch (error) {
    return [];
  }
};
