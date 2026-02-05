import { useMemo } from "react";
import { ReturnItem } from "@/types/returns";

interface ReturnValidationResult {
  validationMessages: string[];
  itemsByPromotion: Map<string | null, ReturnItem[]>;
  isValid: boolean;
}

export function useReturnValidation(returnItems: ReturnItem[]): ReturnValidationResult {
  const itemsByPromotion = useMemo(() => {
    const groups = new Map<string | null, ReturnItem[]>();
    
    returnItems.forEach((item) => {
      const key = item.promotionId || null;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    
    return groups;
  }, [returnItems]);

  const kitOptionGroups = useMemo(() => {
    const groups = new Map<string, ReturnItem[]>();
    returnItems.forEach((item) => {
      if (item.kitOptionId) {
        if (!groups.has(item.kitOptionId)) {
          groups.set(item.kitOptionId, []);
        }
        groups.get(item.kitOptionId)!.push(item);
      }
    });
    return groups;
  }, [returnItems]);

  const validationMessages = useMemo(() => {
    const messages: string[] = [];

    itemsByPromotion.forEach((items, promoId) => {
      if (promoId) {
        const selectedCount = items.filter((i) => i.isSelected).length;
        if (selectedCount > 0 && selectedCount < items.length) {
          const promoName = items[0].promotionName || "Promoción";
          messages.push(
            `"${promoName}" debe devolverse completa. Selecciona todos los productos de la promoción.`
          );
        }
      }
    });

    kitOptionGroups.forEach((items) => {
      const selectedItems = items.filter((i) => i.isSelected);
      
      if (selectedItems.length > 0) {
        const mainItems = selectedItems.filter((i) => !i.isGift);
        const giftItems = selectedItems.filter((i) => i.isGift);
        
        const totalMainQty = mainItems.reduce((sum, i) => sum + i.returnQuantity, 0);
        const totalGiftQty = giftItems.reduce((sum, i) => sum + i.returnQuantity, 0);
        
        const allMainItems = items.filter((i) => !i.isGift);
        const allGiftItems = items.filter((i) => i.isGift);
        const originalMainQty = allMainItems.reduce((sum, i) => sum + i.originalQuantity, 0);
        const originalGiftQty = allGiftItems.reduce((sum, i) => sum + i.originalQuantity, 0);
        
        if (originalMainQty > 0) {
          const giftsPerMain = originalGiftQty / originalMainQty;
          const expectedGiftQty = totalMainQty * giftsPerMain;
          
          if (totalMainQty > 0 && totalGiftQty === 0) {
               if (expectedGiftQty > 0) {
                   const mainNames = mainItems.map(i => i.productName).join(", ");
                   messages.push(
                     `Para devolver productos principales (${mainNames}), debes devolver ${expectedGiftQty} item(s) de regalo del kit.`
                   );
               }
          } else if (totalGiftQty > 0 && totalMainQty === 0) {
            messages.push(
              "No puedes devolver solo items de regalo sin devolver el producto principal del kit."
            );
          } else if (totalMainQty > 0 && totalGiftQty > 0) {
            if (Math.abs(totalGiftQty - expectedGiftQty) > 0.001) {
              const mainNames = mainItems.map(i => `${i.productName} (${i.returnQuantity})`).join(", ");
              messages.push(
                `Para devolver ${mainNames}, debes devolver exactamente ${expectedGiftQty} item(s) de regalo (actualmente: ${totalGiftQty}).`
              );
            }
          }
        }
      }
    });

    return messages;
  }, [itemsByPromotion, kitOptionGroups]);

  return {
    validationMessages,
    itemsByPromotion,
    isValid: validationMessages.length === 0
  };
}
