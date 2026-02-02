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

    // 1. Calculate Credits
    const triggers = items.filter(i => i.priceType !== 'kit_item' && kitDefs[i.id]?.id === kitId);
    const totalCredits = triggers.reduce((sum, i) => sum + (i.quantity * kit.max_selections), 0);
       
    // 2. Identification of existing gifts
    const gifts = items.filter(i => i.kitOptionId === kitId && i.priceType === 'kit_item');
    const currentConsumed = gifts.reduce((sum, i) => sum + i.quantity, 0);
    
    // 3. Candidates (Items that can be gifts but are currently Retail)
    // Must match one of the kit.items
    const candidates = items.filter(i => 
        i.priceType !== 'kit_item' && 
        kit.items.some(kItem => kItem.product_id === i.id)
    );

    // 4. Reconciliation
    
    // Case A: Surplus of Credits (Try to convert Candidates -> Gifts)
    if (totalCredits > currentConsumed) {
        let creditsRemaining = totalCredits - currentConsumed;
        
        for (const candidate of candidates) {
            if (creditsRemaining <= 0) break;
            
            // We can convert up to 'candidate.quantity' or 'creditsRemaining'
            const convertQty = Math.min(candidate.quantity, creditsRemaining);
            
            // If converting ALL
            if (convertQty === candidate.quantity) {
                candidate.priceType = 'kit_item';
                candidate.finalPrice = 0;
                candidate.kitOptionId = kitId;
            } else {
                // Split item
                // Reduce candidate
                candidate.quantity -= convertQty;
                
                // Create new Gift Item
                // Check if we can merge with existing gift of same type?
                const existingGift = items.find(i => 
                    i.id === candidate.id && 
                    i.priceType === 'kit_item' && 
                    i.kitOptionId === kitId
                );
                
                if (existingGift) {
                    existingGift.quantity += convertQty;
                } else {
                    items.push({
                        ...candidate,
                        uuid: uuidv4(),
                        quantity: convertQty,
                        priceType: 'kit_item',
                        finalPrice: 0,
                        kitOptionId: kitId
                    });
                }
            }
            
            creditsRemaining -= convertQty;
        }
    }
    
    else if (currentConsumed > totalCredits) {
        let deficit = currentConsumed - totalCredits;
        
        for (const gift of gifts) {
            if (deficit <= 0) break;
            
            const revertQty = Math.min(gift.quantity, deficit);
            
            if (revertQty === gift.quantity) {
                 const existingRetail = items.find(i => 
                    i.id === gift.id && 
                    i.priceType !== 'kit_item' && 
                    i.priceType !== 'promo'
                );
                
                if (existingRetail) {
                    existingRetail.quantity += revertQty;
                    gift.quantity = 0;
                } else {
                    gift.priceType = 'retail';
                    gift.finalPrice = gift.retail_price;
                    gift.kitOptionId = undefined;
                }
            } else {
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
            
            deficit -= revertQty;
        }
    }
    
    return items.filter(i => i.quantity > 0);
}
