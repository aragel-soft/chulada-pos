import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { Customer } from "@/types/customers";

export const customersApi = {
  getAll: async (params: PaginationParams): Promise<PaginatedResponse<Customer>> => {
    return await invoke("get_customers", {
      search: params.search,
      page: params.page,
      page_size: params.pageSize,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
    });
  },
};