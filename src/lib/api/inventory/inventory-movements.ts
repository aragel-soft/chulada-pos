import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { InventoryMovement, MovementsFilter, CreateInventoryMovementPayload } from "@/types/inventory-movements";

export const getInventoryMovements = async (params: PaginationParams, filters?: MovementsFilter): Promise<PaginatedResponse<InventoryMovement>> => {
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

export const createInventoryMovement = async (payload: CreateInventoryMovementPayload): Promise<void> => {
  try {
    await invoke("create_inventory_movement", { payload });
  } catch (error) {
    throw error;
  }
};
