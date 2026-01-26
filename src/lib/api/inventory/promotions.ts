import { invoke } from '@tauri-apps/api/core';
import { Promotion, CreatePromotionDto } from '@/types/promotions';
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

export const createPromotion = async (promotion: CreatePromotionDto): Promise<void> => {
  try {
    await invoke('create_promotion', { promotion });
  } catch (error) {
    console.error('Error creating promotion:', error);
    throw error;
  }
};
