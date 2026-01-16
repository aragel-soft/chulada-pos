export interface SaleItemRequest {
  product_id: string;
  quantity: number;
  price_type: string;
}

export interface SaleRequest {
  discount_percentage: number;
  customer_id: string | null;
  user_id: string;
  cash_register_shift_id: string;
  payment_method: string;
  cash_amount: number;
  card_transfer_amount: number;
  notes: string | null;
  items: SaleItemRequest[];
}

export interface SaleResponse {
  id: string;
  folio: string;
  total: number;
  change: number;
}