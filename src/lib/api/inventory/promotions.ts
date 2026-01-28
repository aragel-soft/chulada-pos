import { invoke } from '@tauri-apps/api/core';
import { Promotion, PromotionWithCombos } from '@/types/promotions';
import { PaginationParams, PaginatedResponse } from "@/types/pagination";


export const getPromotions = async (params: PaginationParams): Promise<PaginatedResponse<Promotion>> => {
  try {
    return invoke('get_promotions', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || null,
      sortBy: params.sortBy || null,
      sortOrder: params.sortOrder || null,
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    throw error;
  }
};

export const getAllActivePromotions = async (): Promise<PromotionWithCombos[]> => {
  try {
    return await invoke('get_all_active_promotions');
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    return [];
  }
};
