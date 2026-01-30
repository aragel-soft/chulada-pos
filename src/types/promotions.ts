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

// Combo product definition for promotions
export interface ComboItemDto {
  product_id: string;
  quantity: number;
}

// Promotion with full combo details
export interface PromotionWithCombos extends Promotion {
  combo_products: ComboItemDto[];
}

// Helper type for promotion detection
export interface PromotionDef {
  id: string;
  name: string;
  combo_price: number;
  required_products: Map<string, number>; // product_id -> quantity
}

export interface PromotionInstance {
  promotionId: string;
  instanceId: string;
  promotionName: string;
  comboPrice: number;
  products: Map<string, { quantity: number; unitPrice: number }>;
}
export interface CreatePromotionDto {
  name: string;
  description?: string;
  combo_price: number;
  start_date: string; 
  end_date: string; 
  items: ComboItemDto[];
}

export interface UpdatePromotionDto extends CreatePromotionDto {
  is_active: boolean;
}

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
