export interface SalesHistoryFilter {
  page: number;
  page_size: number;
  start_date?: string | null;      // YYYY-MM-DD
  end_date?: string | null;        // YYYY-MM-DD
  status?: string[] | null;        // ['completed', 'cancelled', etc]
  payment_method?: string | null;  // 'cash', 'card', 'mixed', 'all'
  user_id?: string | null;
  folio?: string | null;        
  product_search?: string | null;  
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
  change_returned: number;
  notes?: string;
  user_avatar?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  items: SaleHistoryItem[];
}

export interface SaleHistoryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  price_type: 'retail' | 'wholesale' | 'promo';
  is_kit_item: boolean;
  is_gift: boolean; // quantity > 0 && price == 0
  product_image?: string;
  promotion_name?: string;
}
