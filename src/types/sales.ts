import { Product } from "@/types/inventory";

export interface CartItem extends Product {
  uuid: string;
  quantity: number;
  priceType: 'retail' | 'wholesale' | 'kit_item' | 'promo';
  finalPrice: number;
  kitTriggerId?: string;
  promotionId?: string;
  promotionInstanceId?: string;
  promotionName?: string;
}

export interface Ticket {
  id: string;
  name: string;
  items: CartItem[];
  priceType: 'retail' | 'wholesale';
  discountPercentage: number;
}