import { invoke } from "@tauri-apps/api/core";
import { PaginationParams } from "@/types/pagination";
import { Product, PaginatedResponse, CreateProductPayload, ProductDetail, UpdateProductPayload } from "@/types/inventory";
import { BulkUpdateProductsPayload } from "@/types/inventory";

export const getProducts = async (params: PaginationParams): Promise<PaginatedResponse<Product>> => {
  try {
    return await invoke("get_products", {
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

export const getProductById = async (id: string): Promise<ProductDetail> => {
  try {
    return await invoke("get_product_by_id", { id });
  } catch (error) {
    console.error("Error fetching product details:", error);
    throw error;
  }
};

export const createProduct = async (data: CreateProductPayload): Promise<Product> => {
  try {
    return await invoke("create_product", { payload: data });
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

export const saveProductImage = async (fileData: number[], fileName: string): Promise<string> => {
  return await invoke("save_product_image", {
    fileData,
    fileName
  });
};

export const updateProduct = async (payload: UpdateProductPayload): Promise<Product> => {
  try {
    return await invoke("update_product", { payload });
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

export const getAllTags = async (): Promise<string[]> => {
  try {
    return await invoke("get_all_tags");
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
};

export const deleteProducts = async (productIds: string[]): Promise<void> => {
  try {
    await invoke("delete_products", { ids: productIds });
  } catch (error) {
    console.error("Error deleting products:", error);
    throw error;
  }
};

export const bulkUpdateProducts = async (payload: BulkUpdateProductsPayload): Promise<string> => {
  try {
    const result = await invoke<string>("bulk_update_products", { payload });
    return result;
  } catch (error) {
    console.error("Error updating products:", error);
    throw new Error(String(error));
  }
};