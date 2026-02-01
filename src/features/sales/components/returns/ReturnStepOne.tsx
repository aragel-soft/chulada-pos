import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SaleDetail } from "@/types/sales-history";
import { ReturnItem } from "./ReturnModal";
import { ReturnItemRow } from "./ReturnItemRow";
import { PromotionItemRow } from "./PromotionItemRow";
import { formatCurrency } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { AlertCircle } from "lucide-react";
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
    const items: ReturnItem[] = sale.items.map((item) => ({
      saleItemId: item.id,
      productId: item.product_name,
      productName: item.product_name,
      originalQuantity: item.quantity,
      alreadyReturnedQuantity: 0,
      availableQuantity: item.quantity,
      unitPrice: item.unit_price,
      returnQuantity: 0,
      isSelected: false,
      priceType: item.price_type,
      isGift: item.is_gift,
      productImage: item.product_image,
      promotionId: item.promotion_id,
      promotionName: item.promotion_name,
      kitOptionId: item.kit_option_id,
    }));
    setReturnItems(items);
  }, [sale.items, setReturnItems]);

  const handleToggleSelect = (itemId: string) => {
    setReturnItems(
      returnItems.map((item) => {
        if (item.saleItemId === itemId) {
          const newSelected = !item.isSelected;
          return {
            ...item,
            isSelected: newSelected,
            returnQuantity: newSelected ? 1 : 0,
          };
        }
        return item;
      })
    );
  };

  // Handler for selecting/deselecting entire promotion
  const handleTogglePromotion = (promotionId: string) => {
    const promoItems = itemsByPromotion.get(promotionId) || [];
    const allSelected = promoItems.every((i) => i.isSelected);
    const newSelection = !allSelected;

    setReturnItems(
      returnItems.map((item) => {
        if (item.promotionId === promotionId) {
          return {
            ...item,
            isSelected: newSelection,
            returnQuantity: newSelection ? item.originalQuantity : 0,
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
          const newQty = Math.max(
            1,
            Math.min(item.availableQuantity, item.returnQuantity + delta)
          );
          return { ...item, returnQuantity: newQty };
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
    
    kitOptionGroups.forEach((items, kitOptionId) => {
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
    <div className="flex flex-col h-full">
      {!canReturn && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Periodo de devolución excedido</AlertTitle>
          <AlertDescription>
            Esta venta excede el periodo permitido de devoluciones (30 días). Han
            transcurrido {daysSinceSale} días desde la venta.
          </AlertDescription>
        </Alert>
      )}

      {validationMessages.length > 0 && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validación de devolución</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {validationMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
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
                  onToggleSelect={() => handleTogglePromotion(promotionId)}
                  canReturn={canReturn}
                />
              );
            } else {
              return items.map((item) => (
                <ReturnItemRow
                  key={item.saleItemId}
                  item={item}
                  onToggleSelect={handleToggleSelect}
                  onQuantityChange={handleQuantityChange}
                  canReturn={canReturn}
                />
              ));
            }
          })}
        </div>
      </ScrollArea>

      <div className="border-t bg-muted/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Productos seleccionados
            </p>
            <p className="text-2xl font-bold">{selectedItems.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total a devolver</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onNext} disabled={!canProceed} className="flex-1">
            Continuar al Resumen
          </Button>
        </div>
      </div>
    </div>
  );
}
