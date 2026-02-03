import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SaleDetail } from "@/types/sales-history";
import { ReturnItem } from "./ReturnModal";
import { ReturnItemRow } from "./ReturnItemRow";
import { PromotionItemRow } from "./PromotionItemRow";
import { formatCurrency } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { ArrowRight, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReturnStepOneProps {
  sale: SaleDetail;
  returnItems: ReturnItem[];
  setReturnItems: (items: ReturnItem[]) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function ReturnStepOne({
  sale,
  returnItems,
  setReturnItems,
  onNext,
  onCancel,
}: ReturnStepOneProps) {
  const daysSinceSale = differenceInDays(new Date(), new Date(sale.sale_date));
  const canReturn = daysSinceSale <= 30;

  useEffect(() => {
    // Only initialize if we don't have items already (prevents reset when going "back")
    if (returnItems.length > 0) return;

    const items: ReturnItem[] = sale.items.map((item) => {
      // Apply global discount if exists (EXCLUDING PROMOTIONS)
      const isPromo = item.price_type === "promo" || !!item.promotion_id;
      
      const globalDiscountMultiplier = (sale.discount_global_percent > 0 && !isPromo)
        ? (1 - sale.discount_global_percent / 100) 
        : 1;
      
      const adjustedUnitPrice = item.unit_price * globalDiscountMultiplier;

      return {
        saleItemId: item.id,
        productId: item.product_name, // Reverted: using product_name as ID fallback since product_id is not in SaleHistoryItem
        productName: item.product_name,
        originalQuantity: item.quantity,
        alreadyReturnedQuantity: item.quantity_returned,
        availableQuantity: item.quantity_available,
        unitPrice: adjustedUnitPrice,
        returnQuantity: 0,
        isSelected: false,
        priceType: item.price_type,
        isGift: item.is_gift,
        productImage: item.product_image,
        promotionId: item.promotion_id,
        promotionName: item.promotion_name,
        kitOptionId: item.kit_option_id,
      };
    });
    setReturnItems(items);
  }, [sale.items, sale.discount_global_percent, setReturnItems, returnItems.length]);

  // Handler for selecting/deselecting entire promotion by quantity
  const handlePromotionQuantityChange = (promotionId: string, newSetCount: number, gcd: number) => {
    setReturnItems(
      returnItems.map((item) => {
        if (item.promotionId === promotionId) {
          const unitQty = item.originalQuantity / gcd;
          const newReturnQty = unitQty * newSetCount;
          return {
            ...item,
            isSelected: newReturnQty > 0,
            returnQuantity: newReturnQty,
          };
        }
        return item;
      })
    );
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setReturnItems(
      returnItems.map((item) => {
        if (item.saleItemId === itemId) {
          // Standard logic: Min 0 (not 1), Max Available
          const newQty = Math.max(
            0,
            Math.min(item.availableQuantity, item.returnQuantity + delta)
          );
          return { 
            ...item, 
            returnQuantity: newQty,
            isSelected: newQty > 0 
          };
        }
        return item;
      })
    );
  };

  // Group items by promotion
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

    const kitOptionGroups = new Map<string, ReturnItem[]>();
    
    returnItems.forEach((item) => {
      if (item.kitOptionId) {
        if (!kitOptionGroups.has(item.kitOptionId)) {
          kitOptionGroups.set(item.kitOptionId, []);
        }
        kitOptionGroups.get(item.kitOptionId)!.push(item);
      }
    });
    
    kitOptionGroups.forEach((items, _) => {
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
            const mainNames = mainItems.map(i => i.productName).join(", ");
            messages.push(
              `Para devolver productos principales (${mainNames}), debes devolver ${expectedGiftQty} item(s) de regalo del kit.`
            );
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
  }, [returnItems, itemsByPromotion]);

  const selectedItems = returnItems.filter((item) => item.isSelected);
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.returnQuantity * item.unitPrice,
    0
  );

  const canProceed =
    canReturn &&
    selectedItems.length > 0 &&
    totalAmount > 0 &&
    validationMessages.length === 0;

  return (
    <div className="flex flex-col h-full relative">
      {!canReturn && (
        <Alert variant="destructive" className="mx-6 mt-4 mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Periodo de devolución excedido</AlertTitle>
          <AlertDescription>
            Esta venta excede el periodo permitido de devoluciones (30 días). Han
            transcurrido {daysSinceSale} días desde la venta.
          </AlertDescription>
        </Alert>
      )}

      {validationMessages.length > 0 && (
        <div className="absolute top-4 left-6 right-6 z-20 animate-in fade-in slide-in-from-top-2">
             <Alert variant="destructive" className="shadow-lg bg-red-50/95 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validación de devolución</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                  {validationMessages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
        </div>
      )}

      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-3">
          {Array.from(itemsByPromotion.entries()).map(([promotionId, items]) => {
            if (promotionId) {
              const promotionName = items[0]?.promotionName || "Promoción";
              return (
                <PromotionItemRow
                  key={promotionId}
                  items={items}
                  promotionName={promotionName}
                  onQuantityChange={(newCount, gcd) => handlePromotionQuantityChange(promotionId, newCount, gcd)}
                  canReturn={canReturn}
                />
              );
            } else {
              return items.map((item) => (
                <ReturnItemRow
                  key={item.saleItemId}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  canReturn={canReturn}
                />
              ));
            }
          })}
        </div>
      </ScrollArea>

      <div className="border-t bg-white p-6 pt-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
              Productos seleccionados
            </p>
            <p className="text-2xl font-black text-slate-900">{selectedItems.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Total a devolver</p>
            <p className="text-3xl font-black text-indigo-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="h-11 px-6 border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          
          <Button 
            onClick={onNext} 
            disabled={!canProceed} 
            className="h-11 px-8 bg-[#3b0764] hover:bg-[#2d054a] text-white font-bold gap-2 shadow-lg shadow-purple-500/20 shadow-indigo-500/20 transition-all hover:translate-x-1"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
