import { CartItem } from '@/types/sales';
import { KitOptionDef } from '@/types/kits';
import { PromotionDef } from '@/types/promotions';
import * as KitService from './kitService';
import * as PromotionService from './promotionService';

/**
 * Options for processing cart items through the unified pipeline
 */
export interface ProcessCartOptions {
  kitDefs: Record<string, KitOptionDef>;
  promotionDefs: PromotionDef[];
  ticketPriceType: 'retail' | 'wholesale';
  discountPercentage: number;
}

/**
 * Main cart processor that orchestrates the processing pipeline in strict order:
 * 1. Kits - Convert eligible items to kit gifts
 * 2. Promotions - Apply promotional pricing to eligible items
 * 3. Wholesale - Apply wholesale pricing if ticket is in wholesale mode
 * 4. Discount - Applied at total calculation (not item level)
 * 
 * This ensures a consistent, predictable order and prevents conflicts between systems.
 */
export function processCart(
  items: CartItem[], 
  options: ProcessCartOptions
): CartItem[] {
  if (items.length === 0) {
    return items;
  }

  // Stage 1: Process Kits
  let processedItems = processKits(items, options.kitDefs);

  // Stage 2: Apply Promotions  
  processedItems = applyPromotions(
    processedItems, 
    options.promotionDefs,
    options.ticketPriceType
  );

  // Stage 3: Apply Wholesale Pricing
  processedItems = applyWholesalePricing(
    processedItems, 
    options.ticketPriceType
  );

  return finalizeCart(processedItems, options.kitDefs);
}

/**
 * Finalizes cart by merging duplicates and sorting for display.
 */
function finalizeCart(items: CartItem[], kitDefs: Record<string, KitOptionDef>): CartItem[] {
  const map = new Map<string, CartItem>();

  for (const item of items) {
    if (item.quantity <= 0) continue;

    const key = `${item.id}|${item.priceType}|${item.kitOptionId || ''}|${item.promotionId || ''}`;

    if (map.has(key)) {
       const existing = map.get(key)!;
       existing.quantity += item.quantity;
    } else {
       map.set(key, { ...item });
    }
  }

  const mergedItems = Array.from(map.values());

  const getKitId = (item: CartItem): string | null => {
    if (item.kitOptionId) return item.kitOptionId;
    if (item.priceType !== 'kit_item' && kitDefs[item.id]) return kitDefs[item.id].id;
    return null;
  };

  return mergedItems.sort((a, b) => {
    const kitA = getKitId(a);
    const kitB = getKitId(b);

    if (kitA && kitB) {
      if (kitA !== kitB) return kitA.localeCompare(kitB);
      const isGiftA = a.priceType === 'kit_item';
      const isGiftB = b.priceType === 'kit_item';
      if (isGiftA !== isGiftB) return isGiftA ? 1 : -1; 
      return 0; 
    }

    if (kitA) return -1; 
    if (kitB) return 1;

    return 0; 
  });
}

function processKits(
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  return KitService.processAllKits(items, kitDefs);
}

function applyPromotions(
  items: CartItem[],
  promotionDefs: PromotionDef[],
  defaultPriceType: 'retail' | 'wholesale'
): CartItem[] {
  if (promotionDefs.length === 0) {
    return items;
  }

  const result = PromotionService.detectAndApplyPromotions(
    items,
    promotionDefs,
    defaultPriceType
  );

  return result.items;
}

function applyWholesalePricing(
  items: CartItem[],
  ticketPriceType: 'retail' | 'wholesale'
): CartItem[] {
  return items.map(item => {
    if (item.priceType === 'kit_item' || item.priceType === 'promo') {
      return item;
    }

    if (ticketPriceType === 'wholesale' && item.priceType === 'retail') {
      const wholesalePrice = item.wholesale_price !== null 
        && item.wholesale_price !== undefined 
        && item.wholesale_price !== 0
        ? item.wholesale_price
        : item.retail_price;

      return {
        ...item,
        priceType: 'wholesale' as const,
        finalPrice: wholesalePrice
      };
    }

    if (ticketPriceType === 'retail' && item.priceType === 'wholesale') {
      return {
        ...item,
        priceType: 'retail' as const,
        finalPrice: item.retail_price
      };
    }

    return item;
  });
}
