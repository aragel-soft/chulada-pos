import { invoke } from '@tauri-apps/api/core';
import { 
  Promotion, 
  PromotionWithCombos, 
  CreatePromotionDto, 
  UpdatePromotionDto,
  PromotionDetailsResponse,
  PromotionWithDetails 
} from '@/types/promotions';
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { Product } from '@/types/inventory';


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
export const createPromotion = async (promotion: CreatePromotionDto): Promise<void> => {
  try {
    await invoke('create_promotion', { promotion });
  } catch (error) {
    throw error;
  }
};

export const getPromotionDetails = async (id: string): Promise<PromotionWithDetails> => {
  try {
    const rawData = await invoke<PromotionDetailsResponse>('get_promotion_details', { id });

    const mappedItems = rawData.items.map((item) => ({
      quantity: item.quantity,
        product: {
        id: item.product_id,
        name: item.name,
        code: item.code,
        retail_price: item.sale_price, 
        wholesale_price: 0,
        stock: 0,
        min_stock: 0,
        category_id: "",
        is_active: true,
        created_at: new Date().toISOString()
      } as unknown as Product
    }));

    return {
      ...rawData,
      items: mappedItems
    };

  } catch (error) {
    throw error;
  }
};

export const updatePromotion = async (id: string, promotion: UpdatePromotionDto): Promise<void> => {
  try {
    await invoke('update_promotion', { id, promotion });
  } catch (error) {
    throw error;
  }
};

export const deletePromotions = async (ids: string[]): Promise<void> => {
  try {
    await invoke('delete_promotions', { ids });
  } catch (error) {
    console.error('Error deleting promotions:', error);
    throw error;
  }
};
