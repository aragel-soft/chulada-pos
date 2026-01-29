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
  is_active?: boolean;
  trigger_product_ids: string[];
  included_items: KitItem[];
}

export interface KitProductDetail {
  id: string;
  code: string;
  name: string;
  retail_price: number;
}

export interface KitIncludedItem {
  product: KitProductDetail;
  quantity: number;
}

export interface KitDetails {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
  is_active: boolean;
  triggers: KitProductDetail[]; 
  items: KitIncludedItem[]; 
}
