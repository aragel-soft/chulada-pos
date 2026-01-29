import { Product } from '@/types/inventory';
import { KitOptionDef } from '@/types/kits';
import { CartItem } from '@/types/sales';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gets the total count of gifts already linked to a trigger item.
 */
function getLinkedGiftCount(triggerId: string, items: CartItem[]): number {
  return items
    .filter(i => i.kitTriggerId === triggerId && i.priceType === 'kit_item')
    .reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Main entry point for kit processing in the cart pipeline.
 */
export function processAllKits(
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  let currentItems = [...items];
  
  const potentialTriggers = items.filter(item => item.priceType !== 'kit_item');
  
  for (const item of potentialTriggers) {
    const kit = kitDefs[item.id];
    if (kit && kit.is_required) {
      currentItems = processKitTrigger(item, currentItems, kitDefs);
      
      currentItems = reconcileKitGifts(item, currentItems, kitDefs);
    }
  }
  
  currentItems = reconcileOrphanGifts(currentItems);
  
  return currentItems;
}

/**
 * Reconciles kit gifts when a trigger item's quantity changes.
 */
function reconcileKitGifts(
  triggerItem: CartItem,
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  const kit = kitDefs[triggerItem.id];
  if (!kit || !kit.is_required) return items;

  let currentItems = items.map(i => ({ ...i }));

  const maxAllowed = kit.max_selections * triggerItem.quantity;

  const linkedGifts = currentItems.filter(
    i => i.kitTriggerId === triggerItem.uuid && i.priceType === 'kit_item'
  );
  const currentTotalGifts = linkedGifts.reduce((sum, i) => sum + i.quantity, 0);

  if (currentTotalGifts > maxAllowed) {
    let excess = currentTotalGifts - maxAllowed;

    for (const gift of linkedGifts) {
      if (excess <= 0) break;

      const reduceBy = Math.min(gift.quantity, excess);

      const giftInArray = currentItems.find(i => i.uuid === gift.uuid);
      if (giftInArray) {
        if (giftInArray.quantity === reduceBy) {
          giftInArray.quantity = 0;
        } else {
          giftInArray.quantity -= reduceBy;
        }
      }

      const existingRetail = currentItems.find(
        i => i.id === gift.id && i.priceType === 'retail'
      );
      if (existingRetail) {
        existingRetail.quantity += reduceBy;
      } else {
        currentItems.push({
          ...gift,
          uuid: uuidv4(),
          priceType: 'retail',
          finalPrice: gift.retail_price,
          kitTriggerId: undefined,
          quantity: reduceBy,
        });
      }

      excess -= reduceBy;
    }
  }
  return currentItems.filter(i => i.quantity > 0);
}

/**
 * Cleanup function to remove/convert kit items whose trigger item has been removed from cart.
 */
function reconcileOrphanGifts(items: CartItem[]): CartItem[] {
  const triggerIds = new Set(items.map(i => i.uuid));
  
  const orphans: CartItem[] = [];
  const result: CartItem[] = [];

  for (const item of items) {
    if (item.priceType === 'kit_item' && item.kitTriggerId && !triggerIds.has(item.kitTriggerId)) {
      orphans.push(item);
    } else {
      result.push(item);
    }
  }

  if (orphans.length === 0) return items;

  for (const orphan of orphans) {
    const existing = result.find(i => i.id === orphan.id && i.priceType === 'retail' && !i.kitTriggerId);
    
    if (existing) {
      existing.quantity += orphan.quantity;
    } else {
      result.push({
        ...orphan,
        uuid: uuidv4(),
        priceType: 'retail',
        finalPrice: orphan.retail_price,
        kitTriggerId: undefined,
        quantity: orphan.quantity
      });
    }
  }
  
  return result;
}

/**
 * Calculates remaining kit quota for a trigger item.
 */
export function getRemainingKitQuota(
  triggerItem: CartItem,
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): number | null {
  const kit = kitDefs[triggerItem.id];
  if (!kit) return null;
  
  const maxQuota = kit.max_selections * triggerItem.quantity;
  const used = getLinkedGiftCount(triggerItem.uuid, items);
  
  return maxQuota - used;
}


/**
 * Processes a trigger product and automatically links eligible products as gifts.
 */
function processKitTrigger(
  triggerProduct: Product,
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  const kit = kitDefs[triggerProduct.id];

  if (!kit || !kit.is_required) return items;

  let currentItems = items.map(i => ({ ...i }));

  const triggerItems = currentItems.filter(
    i => i.id === triggerProduct.id && i.priceType !== 'kit_item'
  );
  if (triggerItems.length === 0) return currentItems;

  const candidates = currentItems.filter(
    i =>
      i.priceType !== 'kit_item' &&
      kit!.items.some(k => k.product_id === i.id)
  );

  if (candidates.length === 0) return currentItems;

  const candidateUsage: Record<string, number> = {};

  for (const triggerItem of triggerItems) {
    const neededTotal = kit.max_selections * triggerItem.quantity;
    const linkedCount = currentItems
      .filter(i => i.kitTriggerId === triggerItem.uuid)
      .reduce((sum, i) => sum + i.quantity, 0);

    let stillNeeded = neededTotal - linkedCount;
    if (stillNeeded <= 0) continue;

    for (const candidate of candidates) {
      if (stillNeeded <= 0) break;

      const usedSoFar = candidateUsage[candidate.uuid] || 0;
      const available = candidate.quantity - usedSoFar;

      if (available <= 0) continue;

      const take = Math.min(available, stillNeeded);

      if (candidate.quantity === take) {
        candidate.quantity = 0;
      } else {
        candidate.quantity -= take;
      }
      candidateUsage[candidate.uuid] = usedSoFar + take;

      const giftIndex = currentItems.findIndex(
        i =>
          i.id === candidate.id &&
          i.priceType === 'kit_item' &&
          i.kitTriggerId === triggerItem.uuid
      );
      if (giftIndex >= 0) {
        currentItems[giftIndex].quantity += take;
      } else {
        currentItems.push({
          ...candidate,
          uuid: uuidv4(),
          priceType: 'kit_item',
          finalPrice: 0,
          quantity: take,
          kitTriggerId: triggerItem.uuid,
        });
      }

      stillNeeded -= take;
    }
  }

  return currentItems.filter(i => i.quantity > 0);
}
