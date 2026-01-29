import { v4 as uuidv4 } from 'uuid';
import { CartItem } from '@/types/sales';
import { PromotionDef, PromotionInstance } from '@/types/promotions';

export interface PromotionDetectionResult {
  items: CartItem[];
  appliedPromotionCount: number;
}

/**
 * Builds an inventory map from cart items (product_id -> total quantity)
 */
function buildInventoryMap(items: CartItem[]): Map<string, number> {
  const inventory = new Map<string, number>();
  items.forEach(item => {
    const current = inventory.get(item.id) || 0;
    inventory.set(item.id, current + item.quantity);
  });
  return inventory;
}

/**
 * Sorts promotions by total quantity required (descending)
 */
function sortPromotionsByPriority(promotions: PromotionDef[]): PromotionDef[] {
  return [...promotions].sort((a, b) => {
    const totalA = Array.from(a.required_products.values()).reduce((sum, qty) => sum + qty, 0);
    const totalB = Array.from(b.required_products.values()).reduce((sum, qty) => sum + qty, 0);
    return totalB - totalA;
  });
}

/**
 * Detects all possible promotion instances using greedy algorithm
 */
function detectPromotionInstances(
  inventory: Map<string, number>,
  promotions: PromotionDef[],
  eligibleItems: CartItem[]
): PromotionInstance[] {
  const promotionInstances: PromotionInstance[] = [];
  const assignedToPromo = new Map<string, number>();

  const sortedPromotions = sortPromotionsByPriority(promotions);
  for (const promotion of sortedPromotions) {
    while (true) {
      let canCreate = true;
      for (const [productId, requiredQty] of promotion.required_products.entries()) {
        const available = inventory.get(productId) || 0;
        const alreadyUsed = assignedToPromo.get(productId) || 0;
        if (available - alreadyUsed < requiredQty) {
          canCreate = false;
          break;
        }
      }

      if (!canCreate) break;

      const instance = calculateProportionalPricing(promotion, eligibleItems);
      if (!instance) break;

      for (const [productId, requiredQty] of promotion.required_products.entries()) {
        const used = assignedToPromo.get(productId) || 0;
        assignedToPromo.set(productId, used + requiredQty);
      }

      promotionInstances.push(instance);
    }
  }

  return promotionInstances;
}

/**
 * Calculates proportional pricing for a promotion instance
 */
function calculateProportionalPricing(
  promotion: PromotionDef,
  eligibleItems: CartItem[]
): PromotionInstance | null {
  let totalRetailValue = 0;
  const retailPrices = new Map<string, number>();

  for (const [productId] of promotion.required_products.entries()) {
    const item = eligibleItems.find(i => i.id === productId);
    if (!item) continue;
    const retailPrice = item.retail_price;
    retailPrices.set(productId, retailPrice);
    totalRetailValue += retailPrice * promotion.required_products.get(productId)!;
  }

  if (totalRetailValue === 0) return null;

  const instance: PromotionInstance = {
    promotionId: promotion.id,
    instanceId: uuidv4(),
    promotionName: promotion.name,
    comboPrice: promotion.combo_price,
    products: new Map(),
  };

  for (const [productId, requiredQty] of promotion.required_products.entries()) {
    const retailPrice = retailPrices.get(productId) || 0;
    const proportion = (retailPrice * requiredQty) / totalRetailValue;
    const allocatedPrice = promotion.combo_price * proportion;
    const unitPrice = allocatedPrice / requiredQty;

    instance.products.set(productId, { quantity: requiredQty, unitPrice });
  }

  return instance;
}

/**
 * Groups cart items by promotion and creates result map
 */
function groupCartItemsByPromotion(
  inventory: Map<string, number>,
  promotionInstances: PromotionInstance[],
  eligibleItems: CartItem[],
  defaultPriceType: 'retail' | 'wholesale' = 'retail'
): Map<string, CartItem> {
  const resultMap = new Map<string, CartItem>();
  const assignedToPromo = new Map<string, number>();

  for (const instance of promotionInstances) {
    for (const [productId, productInfo] of instance.products.entries()) {
      const current = assignedToPromo.get(productId) || 0;
      assignedToPromo.set(productId, current + productInfo.quantity);
    }
  }

  for (const [productId, totalQty] of inventory.entries()) {
    const promoQty = assignedToPromo.get(productId) || 0;
    const normalQty = totalQty - promoQty;

    const sampleItem = eligibleItems.find(i => i.id === productId);
    if (!sampleItem) continue;

    const promoByPrice = new Map<number, { qty: number; instance: PromotionInstance }>();

    for (const instance of promotionInstances) {
      const productInfo = instance.products.get(productId);
      if (!productInfo) continue;

      const key = productInfo.unitPrice;
      const existing = promoByPrice.get(key);
      if (existing) {
        existing.qty += productInfo.quantity;
      } else {
        promoByPrice.set(key, {
          qty: productInfo.quantity,
          instance
        });
      }
    }

    for (const [unitPrice, { qty, instance }] of promoByPrice.entries()) {
      const key = `${productId}-promo-${unitPrice.toFixed(2)}`;
      resultMap.set(key, {
        ...sampleItem,
        uuid: uuidv4(),
        quantity: qty,
        priceType: 'promo',
        finalPrice: unitPrice,
        promotionId: instance.promotionId,
        promotionInstanceId: instance.instanceId,
        promotionName: instance.promotionName,
      });
    }

    if (normalQty > 0) {
      const key = `${productId}-normal`;
      
      const finalPrice = defaultPriceType === 'wholesale' 
        ? (sampleItem.wholesale_price || sampleItem.retail_price) 
        : sampleItem.retail_price;

      resultMap.set(key, {
        ...sampleItem,
        uuid: uuidv4(),
        quantity: normalQty,
        priceType: defaultPriceType,
        finalPrice: finalPrice,
        promotionId: undefined,
        promotionInstanceId: undefined,
        promotionName: undefined,
      });
    }
  }

  return resultMap;
}

export function detectAndApplyPromotions(
  cartItems: CartItem[],
  promotionDefs: PromotionDef[],
  defaultPriceType: 'retail' | 'wholesale' = 'retail'
): PromotionDetectionResult {

  const kitTriggerIds = new Set(
    cartItems
      .filter(item => item.priceType === 'kit_item' && item.kitTriggerId)
      .map(item => item.kitTriggerId)
  );
  
  const eligibleItems = cartItems.filter(
    item => item.priceType !== 'kit_item' && !kitTriggerIds.has(item.uuid)
  );

  if (eligibleItems.length === 0) {
    return { items: cartItems, appliedPromotionCount: 0 };
  }

  const inventory = buildInventoryMap(eligibleItems);

  const promotionInstances = detectPromotionInstances(inventory, promotionDefs, eligibleItems);

  if (promotionInstances.length === 0) {
    return { items: cartItems, appliedPromotionCount: 0 };
  }

  const resultMap = groupCartItemsByPromotion(inventory, promotionInstances, eligibleItems, defaultPriceType);

  const ignoredItems = cartItems.filter(
     item => item.priceType === 'kit_item' || kitTriggerIds.has(item.uuid)
  );
  
  const newItems = [...ignoredItems, ...Array.from(resultMap.values())];

  return {
    items: newItems,
    appliedPromotionCount: promotionInstances.length
  };
}
