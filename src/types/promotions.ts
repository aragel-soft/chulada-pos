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
