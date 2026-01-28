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
  // Kit processing detects trigger items and automatically links eligible items as gifts
  let processedItems = processKits(items, options.kitDefs);

  // Stage 2: Apply Promotions  
  // Promotions only apply to items NOT involved in kits (neither triggers nor gifts)
  processedItems = applyPromotions(
    processedItems, 
    options.promotionDefs,
    options.ticketPriceType
  );

  // Stage 3: Apply Wholesale Pricing
  // Wholesale pricing only applies to regular items (not kit gifts, not promo items)
  processedItems = applyWholesalePricing(
    processedItems, 
    options.ticketPriceType
  );

  // Stage 4: Discount
  // Discount is applied at the total calculation level, not at item level
  // See getTicketTotal() in cartStore.ts

  return processedItems;
}

/**
 * Stage 1: Process all kit triggers and link eligible items as gifts
 */
function processKits(
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  return KitService.processAllKits(items, kitDefs);
}

/**
 * Stage 2: Detect and apply promotional pricing
 * Only processes items that are NOT part of kits
 */
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

/**
 * Stage 3: Apply wholesale pricing to eligible items
 * Converts between retail and wholesale based on ticket price type
 */
function applyWholesalePricing(
  items: CartItem[],
  ticketPriceType: 'retail' | 'wholesale'
): CartItem[] {
  return items.map(item => {
    // Don't touch kit items or promo items
    if (item.priceType === 'kit_item' || item.priceType === 'promo') {
      return item;
    }

    // Convert to wholesale if ticket is in wholesale mode
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

    // Convert back to retail if ticket is in retail mode
    if (ticketPriceType === 'retail' && item.priceType === 'wholesale') {
      return {
        ...item,
        priceType: 'retail' as const,
        finalPrice: item.retail_price
      };
    }

    // No change needed
    return item;
  });
}
