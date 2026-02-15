export interface SalesHistoryFilter {
  page: number;
  page_size: number;
  start_date?: string | null;
  end_date?: string | null;
  status?: string[] | null;
  payment_method?: string | null;
  user_id?: string | null;
  customer_id?: string | null;
  folio?: string | null;
  product_search?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SaleMaster {
  id: string;
  folio: string;
  sale_date: string;
  status: 'completed' | 'cancelled' | 'partial_return' | 'fully_returned';
  payment_method: 'cash' | 'card_transfer' | 'credit' | 'mixed';
  total: number;
  user_name: string;
  has_discount: boolean;
  is_credit: boolean;
}


export interface PaginatedSalesHistory {
  data: SaleMaster[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SaleDetail extends SaleMaster {
  subtotal: number;
  discount_global_percent: number;
  discount_global_amount: number;
  cash_amount: number;
  card_amount: number;
  voucher_amount: number;
  change_returned: number;
  notes?: string;
  user_avatar?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  items: SaleHistoryItem[];
  returns: ReturnSummary[];
  voucher?: VoucherInfo;
}

export interface ReturnSummary {
  id: string;
  folio: number;
  return_date: string;
  total: number;
  reason: string;
  notes?: string;
}

export interface VoucherInfo {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  is_used: boolean;
  is_expired: boolean;
  created_at: string;
  expires_at?: string;
}

export interface SaleHistoryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  price_type: 'retail' | 'wholesale' | 'promo' | 'kit_item';
  kit_option_id?: string;
  is_gift: boolean;
  product_image?: string;
  promotion_id?: string;
  promotion_name?: string;
  quantity_returned: number;
  quantity_available: number;
}
