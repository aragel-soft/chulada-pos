import { KitOptionDef } from '@/types/kits';
import { CartItem } from '@/types/sales';
import { v4 as uuidv4 } from 'uuid';

/**
 * Processes all kits using pool-based credit logic:
 * - Triggers provide credits (Qty × MaxSelections)
 * - Gifts consume credits
 * - Candidates convert to gifts when credits available
 * - Excess gifts revert to retail when credits insufficient
 */
export function processAllKits(
  items: CartItem[],
  kitDefs: Record<string, KitOptionDef>
): CartItem[] {
  let currentItems = items.map(i => ({ ...i }));
  
  const activeKitIds = new Set<string>();
  currentItems.forEach(i => {
      if (i.priceType !== 'kit_item' && kitDefs[i.id]) {
          activeKitIds.add(kitDefs[i.id].id);
      }
      if (i.kitOptionId) {
          activeKitIds.add(i.kitOptionId);
      }
  });
  
  for (const kitId of activeKitIds) {
      currentItems = processKitPool(kitId, currentItems, kitDefs);
  }
  
  return currentItems;
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
  
  const totalCredits = items
    .filter(i => i.priceType !== 'kit_item' && kitDefs[i.id]?.id === kit.id)
    .reduce((sum, i) => sum + (i.quantity * kit.max_selections), 0);
    
  const totalConsumed = items
    .filter(i => i.kitOptionId === kit.id && i.priceType === 'kit_item')
    .reduce((sum, i) => sum + i.quantity, 0);

  return totalCredits - totalConsumed;
}

/**
 * Internal logic to process a specific Kit Pool.
 */
function processKitPool(
   kitId: string,
   items: CartItem[],
   kitDefs: Record<string, KitOptionDef>
): CartItem[] {
    const kit = Object.values(kitDefs).find(k => k.id === kitId);
    if (!kit) return items;

    // 1. Calculate discrete credits available
    const triggers = items.filter(i => i.priceType !== 'kit_item' && kitDefs[i.id]?.id === kitId);
    const totalDiscreteCredits = triggers.reduce((sum, i) => sum + (i.quantity * kit.max_selections), 0);
       
    // 2. Identify existing gifts
    const gifts = items.filter(i => i.kitOptionId === kitId && i.priceType === 'kit_item');
    
    // Calculate total discrete credits used
    let totalUsedDiscreteCredits = 0;
    const freeSpaceMap: Record<string, number> = {};
    
    const giftsByProduct: Record<string, number> = {};
    gifts.forEach(g => {
        giftsByProduct[g.id] = (giftsByProduct[g.id] || 0) + g.quantity;
    });

    for (const [productId, qty] of Object.entries(giftsByProduct)) {
        const kitDefItem = kit.items.find(kItem => kItem.product_id === productId);
        const ratio = kitDefItem && kitDefItem.quantity > 0 ? kitDefItem.quantity : 1;
        
        const discreteCreditsUsed = Math.ceil(qty / ratio);
        totalUsedDiscreteCredits += discreteCreditsUsed;
        
        freeSpaceMap[productId] = (discreteCreditsUsed * ratio) - qty;
    }
    
    // 3. Identify candidates (Retail items eligible for kit conversion)
    const candidates = items.filter(i => 
        i.priceType !== 'kit_item' && 
        kit.items.some(kItem => kItem.product_id === i.id)
    );

    // 4. Reconciliation
    
    // Case A: Surplus of Discrete Credits
    if (totalDiscreteCredits >= totalUsedDiscreteCredits) {
        let remainingDiscreteCredits = totalDiscreteCredits - totalUsedDiscreteCredits;
        
        for (const candidate of candidates) {
            let qtyToConvert = 0;
            const kitDefItem = kit.items.find(kItem => kItem.product_id === candidate.id);
            const ratio = kitDefItem && kitDefItem.quantity > 0 ? kitDefItem.quantity : 1;
            const freeSpace = freeSpaceMap[candidate.id] || 0;
            
            if (candidate.quantity > 0 && freeSpace > 0) {
                const spaceToUse = Math.min(candidate.quantity, freeSpace);
                qtyToConvert += spaceToUse;
                candidate.quantity -= spaceToUse;
                freeSpaceMap[candidate.id] -= spaceToUse;
            }
            
            if (candidate.quantity > 0 && remainingDiscreteCredits > 0) {
                const creditsNeeded = Math.ceil(candidate.quantity / ratio);
                const creditsToUse = Math.min(creditsNeeded, remainingDiscreteCredits);
                
                const spaceProvided = creditsToUse * ratio;
                const spaceToUse = Math.min(candidate.quantity, spaceProvided);
                
                qtyToConvert += spaceToUse;
                candidate.quantity -= spaceToUse;
                remainingDiscreteCredits -= creditsToUse;
                
                freeSpaceMap[candidate.id] = (freeSpaceMap[candidate.id] || 0) + (spaceProvided - spaceToUse);
            }
            
            if (qtyToConvert <= 0) continue;
            
            const existingGift = items.find(i => 
                i.id === candidate.id && 
                i.priceType === 'kit_item' && 
                i.kitOptionId === kitId
            );
            
            if (existingGift) {
                existingGift.quantity += qtyToConvert;
            } else {
                if (candidate.quantity === 0) {
                    candidate.quantity = qtyToConvert;
                    candidate.priceType = 'kit_item';
                    candidate.finalPrice = 0;
                    candidate.kitOptionId = kitId;
                } else {
                    items.push({
                        ...candidate,
                        uuid: uuidv4(),
                        quantity: qtyToConvert,
                        priceType: 'kit_item',
                        finalPrice: 0,
                        kitOptionId: kitId
                    });
                }
            }
        }
    }
    
    // Case B: Deficit of Discrete Credits
    else if (totalUsedDiscreteCredits > totalDiscreteCredits) {
        let deficitDiscreteCredits = totalUsedDiscreteCredits - totalDiscreteCredits;
        
        const scoredGifts = gifts.map(gift => {
            const kitDefItem = kit.items.find(kItem => kItem.product_id === gift.id);
            const ratio = kitDefItem && kitDefItem.quantity > 0 ? kitDefItem.quantity : 1;
            const remainder = gift.quantity % ratio;
            const score = remainder === 0 ? 1.0 : (remainder / ratio);
            return { gift, ratio, score };
        });

        scoredGifts.sort((a, b) => a.score - b.score);
        
        for (const { gift, ratio } of scoredGifts) {
            if (deficitDiscreteCredits <= 0) break;
            
            const discreteCreditsUsed = Math.ceil(gift.quantity / ratio);
            const creditsToRevert = Math.min(discreteCreditsUsed, deficitDiscreteCredits);
            
            if (creditsToRevert <= 0) continue;
            
            const newDiscreteCredits = discreteCreditsUsed - creditsToRevert;
            const maxPhysicalAllowed = newDiscreteCredits * ratio;
            const revertQty = gift.quantity - Math.min(gift.quantity, maxPhysicalAllowed);
            
            if (revertQty > 0) {
                gift.quantity -= revertQty;
                
                const existingRetail = items.find(i => 
                    i.id === gift.id && 
                    i.priceType !== 'kit_item'
                );
                
                if (existingRetail) {
                    existingRetail.quantity += revertQty;
                } else {
                    items.push({
                        ...gift,
                        uuid: uuidv4(),
                        quantity: revertQty,
                        priceType: 'retail',
                        finalPrice: gift.retail_price,
                        kitOptionId: undefined
                    });
                }
            }
            
            deficitDiscreteCredits -= creditsToRevert;
        }
    }
    
    return items.filter(i => i.quantity > 0);
}
