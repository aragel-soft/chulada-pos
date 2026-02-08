import { z } from "zod";
import { ReturnItem } from "@/types/returns";

// Validation Logic Helper
const validateReturnItems = (items: ReturnItem[], ctx: z.RefinementCtx) => {
  const selectedItems = items.filter((i) => i.isSelected && i.returnQuantity > 0);

  if (selectedItems.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debes seleccionar al menos un producto para devolver.",
    });
    return;
  }

  // 1. Validate Promotions (All or Nothing)
  const itemsByPromo = new Map<string, ReturnItem[]>();
  items.forEach((item) => {
    if (item.promotionId) {
      if (!itemsByPromo.has(item.promotionId)) itemsByPromo.set(item.promotionId, []);
      itemsByPromo.get(item.promotionId)!.push(item);
    }
  });

  itemsByPromo.forEach((promoItems) => {
    
     const hasAnySelected = promoItems.some(i => i.isSelected && i.returnQuantity > 0);
     const hasAllSelectedWithQty = promoItems.every(i => i.isSelected && i.returnQuantity > 0);

     if (hasAnySelected && !hasAllSelectedWithQty) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La promoción "${promoItems[0].promotionName}" está incompleta. Debes devolver todos los productos del paquete.`,
         });
     }
  });

  const itemsByKit = new Map<string, ReturnItem[]>();
  items.forEach((item) => {
    if (item.kitOptionId) {
      if (!itemsByKit.has(item.kitOptionId)) itemsByKit.set(item.kitOptionId, []);
      itemsByKit.get(item.kitOptionId)!.push(item);
    }
  });

  itemsByKit.forEach((kitItems) => {
    const selectedKitItems = kitItems.filter(i => i.isSelected && i.returnQuantity > 0);
    if (selectedKitItems.length === 0) return;

    const mainItems = selectedKitItems.filter(i => !i.isGift);
    const giftItems = selectedKitItems.filter(i => i.isGift);

    const totalMainQty = mainItems.reduce((sum, i) => sum + i.returnQuantity, 0);
    const totalGiftQty = giftItems.reduce((sum, i) => sum + i.returnQuantity, 0);

    const allMainOriginal = kitItems.filter(i => !i.isGift).reduce((sum, i) => sum + i.originalQuantity, 0);
    const allGiftOriginal = kitItems.filter(i => i.isGift).reduce((sum, i) => sum + i.originalQuantity, 0);
    
    if (allMainOriginal > 0) {
      const ratio = allGiftOriginal / allMainOriginal;
      const expectedGiftQty = totalMainQty * ratio;

      if (totalMainQty > 0 && Math.abs(totalGiftQty - expectedGiftQty) > 0.001) {
           ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Regalos incorrectos en Kit: Por cada ${totalMainQty} pzas compradas, corresponden ${expectedGiftQty} regalos.`,
          });
      }
      
      if (totalMainQty === 0 && totalGiftQty > 0) {
           ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `No se pueden devolver regalos de un Kit sin el producto principal.`,
          });
      }
    }
  });
};


const returnItemSchema = z.object({
  saleItemId: z.string(),
  productId: z.string(),
  productName: z.string(),
  originalQuantity: z.number(), 
  returnQuantity: z.number().min(0),
  isSelected: z.boolean(),
  unitPrice: z.number(),
  priceType: z.string(),
  alreadyReturnedQuantity: z.number(),
  availableQuantity: z.number(),

  promotionId: z.string().nullish(),
  promotionName: z.string().nullish(),
  kitOptionId: z.string().nullish(),
  isGift: z.boolean(),
  productImage: z.string().nullish(),
}).passthrough();

export const returnValidationSchema = z.object({
  reason: z.string().min(1, "Selecciona un motivo."),
  notes: z.string().optional(),
  items: z.array(returnItemSchema).superRefine(validateReturnItems),
});
