import { invoke } from "@tauri-apps/api/core";
import { Category } from "@/types/inventory";

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    return await invoke("get_all_categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};
