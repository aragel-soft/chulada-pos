export interface KitListItem {
  id: string;
  name: string;
  description?: string;
  triggers_count: number;
  items_summary?: string;
  is_active: boolean;
  created_at: string;
}

export interface KitItem {
  product_id: string;
  quantity: number;
}

export interface CreateKitPayload {
  name: string;
  description?: string;
  is_required: boolean;
  trigger_product_ids: string[];
  included_items: KitItem[];
}
