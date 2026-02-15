export interface SaleItemRequest {
  id?: string;
  product_id: string;
  quantity: number;
  price_type: string;
  kit_option_id?: string;
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
  should_print: boolean;
  voucher_code?: string;
}

export interface SaleResponse {
  id: string;
  folio: string;
  total: number;
  change: number;
  voucher_used: number;
}

export interface VoucherValidationResponse {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  expires_at: string | null;
}