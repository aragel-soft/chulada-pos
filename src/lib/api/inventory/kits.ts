import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { CreateKitPayload, KitDetails, KitListItem, KitDefinitionWithTrigger } from "@/types/kits";

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

export const getKitDetails = async (kitId: string): Promise<KitDetails> => {
  try {
    return await invoke("get_kit_details", { kitId });
  } catch (error) {
    throw error;
  }
};

export const checkProductsInActiveKits = async (productIds: string[], excludeKitId?: string): Promise<string[]> => {
  try {
    return await invoke("check_products_in_active_kits", { productIds, excludeKitId });
  } catch (error) {
    throw error;
  }
};

export const createKit = async (payload: CreateKitPayload): Promise<void> => {
  try {
    return await invoke("create_kit", { payload });
  } catch (error) {
    throw error;
  }
};

export const updateKit = async (kitId: string, payload: CreateKitPayload): Promise<void> => {
  try {
    return await invoke("update_kit", { kitId, payload });
  } catch (error) {
    throw error;
  }
};

export const deleteKits = async (kitIds: string[]): Promise<void> => {
  try {
    return await invoke("delete_kits", { kitIds });
  } catch (error) {
    throw error;
  }
};
