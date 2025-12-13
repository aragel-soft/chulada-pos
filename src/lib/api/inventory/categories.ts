import { invoke } from "@tauri-apps/api/core";
import { CategoryListDto, CreateCategoryDto, UpdateCategoryDto } from "@/types/categories";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";


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

export async function createCategory(data: CreateCategoryDto): Promise<void> {
  return await invoke("create_category", { data });
}

export async function updateCategory(data: UpdateCategoryDto): Promise<void> {
  return await invoke("update_category", { data });
}

export async function deleteCategories(ids: string[]): Promise<void> {
  return await invoke("delete_categories", { ids });
}
