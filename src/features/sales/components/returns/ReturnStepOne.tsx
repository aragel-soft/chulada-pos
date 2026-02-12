import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SaleDetail } from "@/types/sales-history";
import { ReturnItem } from "@/types/returns";
import { ReturnItemRow } from "./ReturnItemRow";
import { PromotionItemRow } from "./PromotionItemRow";
import { useReturnValidation } from "@/features/sales/hooks/useReturnValidation";
import { formatCurrency } from "@/lib/utils";
import { differenceInDays, differenceInMinutes } from "date-fns";
import { ArrowRight, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ReturnModalMode } from "./ReturnModal";

interface ReturnStepOneProps {
  sale: SaleDetail;
  returnItems: ReturnItem[];
  setReturnItems: React.Dispatch<React.SetStateAction<ReturnItem[]>>;
  onNext: () => void;
  onCancel: () => void;
  mode?: ReturnModalMode;
}

export function ReturnStepOne({
  sale,
  returnItems,
  setReturnItems,
  onNext,
  onCancel,
  mode = "return",
}: ReturnStepOneProps) {
  const isCancellation = mode === "cancellation";
  
  // For returns: 30 days. For cancellations: 1 hour (60 minutes)
  const daysSinceSale = differenceInDays(new Date(), new Date(sale.sale_date));
  const minutesSinceSale = differenceInMinutes(new Date(), new Date(sale.sale_date));
  const canReturn = isCancellation ? minutesSinceSale < 60 : daysSinceSale <= 30;

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

      // In cancellation mode, auto-select all items at max quantity
      const shouldSelect = isCancellation && item.quantity_available > 0;

      return {
        saleItemId: item.id,
        productId: item.product_name, // Fallback to name as ID is not available in current projection
        productName: item.product_name,
        originalQuantity: item.quantity,
        alreadyReturnedQuantity: item.quantity_returned,
        availableQuantity: item.quantity_available,
        unitPrice: adjustedUnitPrice,
        returnQuantity: shouldSelect ? item.quantity_available : 0,
        isSelected: shouldSelect,
        priceType: item.price_type,
        isGift: item.is_gift,
        productImage: item.product_image,
        promotionId: item.promotion_id,
        promotionName: item.promotion_name,
        kitOptionId: item.kit_option_id,
      };
    });
    setReturnItems(items);
  }, [sale.items, sale.discount_global_percent, setReturnItems, isCancellation]);

  // In cancellation mode, auto-proceed to step 2 once items are loaded
  useEffect(() => {
    if (isCancellation && returnItems.length > 0) {
      onNext();
    }
  }, [isCancellation, returnItems.length, onNext]);

  // Handler for selecting/deselecting entire promotion by quantity
  const handlePromotionQuantityChange = useMemo(
    () => (promotionId: string, newSetCount: number, gcd: number) => {
      setReturnItems((prevItems) => 
        prevItems.map((item) => {
          if (item.promotionId === promotionId) {
            const unitQty = item.originalQuantity / gcd;
            const newReturnQty = unitQty * newSetCount;
            // Only update if changed
            if (item.returnQuantity === newReturnQty && item.isSelected === (newReturnQty > 0)) {
               return item;
            }
            return {
              ...item,
              isSelected: newReturnQty > 0,
              returnQuantity: newReturnQty,
            };
          }
          return item;
        })
      );
    },
    [setReturnItems]
  );

  const handleQuantityChange = useMemo(
    () => (itemId: string, delta: number) => {
      setReturnItems((prevItems) =>
        prevItems.map((item) => {
          if (item.saleItemId === itemId) {
            // Standard logic: Min 0 (not 1), Max Available
            const newQty = Math.max(
              0,
              Math.min(item.availableQuantity, item.returnQuantity + delta)
            );
             // Only update if changed
            if (item.returnQuantity === newQty) {
                return item;
            }
            return {
              ...item,
              returnQuantity: newQty,
              isSelected: newQty > 0,
            };
          }
          return item;
        })
      );
    },
    [setReturnItems]
  );

  // Use custom validation hook
  const { itemsByPromotion, validationMessages } = useReturnValidation(returnItems);

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
