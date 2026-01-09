export interface KitListItem {
  id: string;
  name: string;
  description?: string;
  triggers_count: number;
  items_summary?: string;
  is_active: boolean;
  created_at: string;
}
