import { Product } from '@/types/inventory';
import { KitOptionDef } from '@/types/kits';
import { CartItem } from '@/types/sales';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

/**
 * Gets the total count of gifts already linked to a trigger item.
 * @internal - Used internally by getRemainingKitQuota
 */
function getLinkedGiftCount(triggerId: string, items: CartItem[]): number {
  return items
    .filter(i => i.kitTriggerId === triggerId && i.priceType === 'kit_item')
    .reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Main entry point for kit processing in the cart pipeline.
 * Processes all kit triggers in the cart and automatically links eligible items as gifts.
 * Also reconciles gifts when trigger quantities decrease.
 * This is called by CartProcessor as Stage 1 of the processing pipeline.
 */
export function processAllKits(
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  let currentItems = [...items];
  
  // Process each potential trigger item
  const potentialTriggers = items.filter(item => item.priceType !== 'kit_item');
  
  for (const item of potentialTriggers) {
    const kit = kitDefs[item.id];
    if (kit && kit.is_required) {
      // First, process kit trigger to add gifts
      currentItems = processKitTrigger(item, currentItems, kitDefs);
      
      // Then, reconcile to remove excess gifts if trigger quantity decreased
      currentItems = reconcileKitGifts(item, currentItems, kitDefs);
    }
  }
  
  return currentItems;
}

/**
 * Reconciles kit gifts when a trigger item's quantity changes.
 * Converts excess gifts back to regular priced items.
 * @internal - Used internally by processAllKits
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

      toast.success(`Regresado a precio normal: ${gift.name}`);

      excess -= reduceBy;
    }
  }
  return currentItems.filter(i => i.quantity > 0);
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
 * @internal - Used internally by processAllKits
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
      toast.success(`Producto vinculado como regalo: ${candidate.name}`);
    }
  }

  return currentItems.filter(i => i.quantity > 0);
}


