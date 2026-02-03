// ============================================
// TYPES FOR RETURNS API
// ============================================

export interface ReturnInfo {
  id: string;
  folio: number;
  return_date: string;
  total: number;
  reason: string;
  user_name?: string;
}

export interface SaleItemWithReturnInfo {
  // Original sale item data
  id: string;
  product_name: string;
  product_code: string;
  quantity_sold: number;
  unit_price: number;
  subtotal: number;
  price_type: 'retail' | 'wholesale' | 'promo' | 'kit_item';
  kit_option_id?: string;
  is_gift: boolean;
  product_image?: string;
  promotion_id?: string;
  promotion_name?: string;
  // Return tracking data
  quantity_returned: number;
  quantity_available: number;
}

export interface SaleHeader {
  id: string;
  folio: string;
  sale_date: string;
  status: string;
  payment_method: string;
  subtotal: number;
  discount_global_percent: number;
  discount_global_amount: number;
  total: number;
  cash_amount: number;
  card_amount: number;
  change_returned: number;
  notes?: string;
  user_name: string;
  user_avatar?: string;
}

export interface SaleWithReturnInfo {
  sale: SaleHeader;
  items: SaleItemWithReturnInfo[];
  return_history: ReturnInfo[];
}
