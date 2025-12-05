import { invoke } from "@tauri-apps/api/core";
import { Product, PaginatedResponse } from "@/types/inventory";

export interface GetProductsParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const getProducts = async (params: GetProductsParams): Promise<PaginatedResponse<Product>> => {
  try {
    return await invoke("get_products", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || null, 
      sortBy: params.sortBy || null,
      sortOrder: params.sortOrder || null,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};
