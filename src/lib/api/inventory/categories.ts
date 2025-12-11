import { invoke } from "@tauri-apps/api/core";
import { CategoryListDto } from "@/types/categories";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getAllCategories(): Promise<CategoryListDto[]> {
  return await invoke("get_all_categories");
}

export async function getCategories(params: PaginationParams): Promise<PaginatedResponse<CategoryListDto>> {
  return await invoke("get_categories", {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}
