import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { Customer } from "@/types/customers";

export const getCustomers = async (params: PaginationParams): Promise<PaginatedResponse<Customer>> => {
  try {
    return await invoke("get_customers", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || null,
      sortBy: params.sortBy || null,
      sortOrder: params.sortOrder || null,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};