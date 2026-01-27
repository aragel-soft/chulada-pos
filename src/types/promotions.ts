import { Product } from "./inventory";

export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  type_field: string; 
  combo_price: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: PromotionStatus;
  items_summary: string;
  created_at: string;
}

export interface ComboItemDto {
  product_id: string;
  quantity: number;
}

export interface CreatePromotionDto {
  name: string;
  description?: string;
  combo_price: number;
  start_date: string; 
  end_date: string; 
  items: ComboItemDto[];
}

export interface UpdatePromotionDto extends CreatePromotionDto {}

export interface PromotionItemDetailRaw {
  product_id: string;
  name: string;
  code: string;
  sale_price: number;
  quantity: number;
}

export interface PromotionDetailsResponse {
  id: string;
  name: string;
  description?: string;
  combo_price: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  items: PromotionItemDetailRaw[];
}

export interface PromotionWithDetails {
  id: string;
  name: string;
  description?: string;
  combo_price: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  items: {
    product: Product; 
    quantity: number;
  }[];
}
