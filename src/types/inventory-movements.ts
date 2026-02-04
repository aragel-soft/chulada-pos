export interface InventoryMovement {
  id: string;
  product_name: string;
  user_name: string;
  type: 'IN' | 'OUT';
  reason: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  formatted_date: string;
  notes?: string;
  reference?: string;
}

export interface MovementsFilter {
  search?: string;
  movement_type?: 'IN' | 'OUT' | null;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
}

export interface CreateInventoryMovementPayload {
  product_id: string;
  user_id: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  notes?: string;
}
