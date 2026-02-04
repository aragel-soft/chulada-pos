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
  productImage?: string;
  promotionId?: string;
  promotionName?: string;
  kitOptionId?: string;
}
