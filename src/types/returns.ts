export interface ReturnItem {
  saleItemId: string;
  productId: string;
  productName: string;
  originalQuantity: number;
  alreadyReturnedQuantity: number;
  availableQuantity: number;
  unitPrice: number;
  returnQuantity: number;
  isSelected: boolean;
  priceType: string;
  isGift: boolean;
  productImage?: string | null;
  promotionId?: string | null;
  promotionName?: string | null;
  kitOptionId?: string | null;
}

// Request/Response types for backend communication
export interface ReturnItemRequest {
  sale_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface ProcessReturnRequest {
  sale_id: string;
  reason: string;
  notes: string;
  user_id: string;
  items: ReturnItemRequest[];
}

export interface ReturnResponse {
  return_id: string;
  voucher_code: string;
  total: number;
}
