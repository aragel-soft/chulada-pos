import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { InventoryMovement, MovementsFilter } from "@/types/inventory-movements";

export const getAll = async (params: PaginationParams, filters?: MovementsFilter): Promise<PaginatedResponse<InventoryMovement>> => {
  try {
    return await invoke("get_inventory_movements", {
      page: params.page,
      pageSize: params.pageSize,
      filters: filters || null,
      sortBy: params.sortBy || null,
      sortOrder: params.sortOrder || null,
    });
  } catch (error) {
    throw error;
  }
};
