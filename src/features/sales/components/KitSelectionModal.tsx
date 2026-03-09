import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KitOptionDef, KitItemDef } from "@/types/kits";
import { useState, useEffect } from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface KitSelectionModalProps {
  isOpen: boolean;
  kit: KitOptionDef | null;
  triggerQuantity: number;
  currentGiftsCount?: Record<string, number>;
  onConfirm: (selectedItems: KitItemDef[]) => void;
  onCancel: () => void;
}

export function KitSelectionModal({ isOpen, kit, triggerQuantity, currentGiftsCount = {}, onConfirm, onCancel }: KitSelectionModalProps) {
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  
  useEffect(() => {
      if (isOpen) setSelectedCounts(currentGiftsCount || {});
  }, [isOpen, currentGiftsCount]);

  if (!kit) return null;

  const totalNeededCredits = kit.max_selections * triggerQuantity;
  
  const currentSelectedCredits = Object.entries(selectedCounts).reduce((acc, [itemId, qty]) => {
      const itemDef = kit.items.find(i => i.id === itemId);
      const ratio = itemDef?.quantity && itemDef.quantity > 0 ? itemDef.quantity : 1;
      return acc + (qty / ratio);
  }, 0);

  const remainingCredits = totalNeededCredits - currentSelectedCredits;

  const handleIncrement = (itemId: string) => {
      const itemDef = kit.items.find(i => i.id === itemId);
      const ratio = itemDef?.quantity && itemDef.quantity > 0 ? itemDef.quantity : 1;
      const creditCost = 1 / ratio;

      if (remainingCredits >= creditCost - 0.0001) {
          setSelectedCounts(prev => ({
              ...prev,
              [itemId]: (prev[itemId] || 0) + 1
          }));
      }
  };

  const handleDecrement = (itemId: string) => {
      const baseQty = currentGiftsCount[itemId] || 0;
      if ((selectedCounts[itemId] || 0) > baseQty) {
          setSelectedCounts(prev => ({
              ...prev,
              [itemId]: prev[itemId] - 1
          }));
      }
  };
  
  const handleConfirm = () => {
    const result: KitItemDef[] = [];
    Object.entries(selectedCounts).forEach(([itemId, qty]) => {
        const baseQty = currentGiftsCount[itemId] || 0;
        const deltaQty = qty - baseQty;

        if (deltaQty > 0) {
            const itemDef = kit.items.find(i => i.id === itemId);
            if (itemDef) {
                 result.push({ ...itemDef, quantity: deltaQty });
            }
        }
    });

    onConfirm(result);
    setSelectedCounts({});
  };
  
  const isComplete = remainingCredits < 0.0001;
  const progressPercentage = totalNeededCredits > 0 
    ? Math.round((currentSelectedCredits / totalNeededCredits) * 100) 
    : 100;

  const incompleteItems = kit.items.filter(item => {
      const qty = selectedCounts[item.id] || 0;
      if (qty === 0) return false;
      const ratio = item.quantity && item.quantity > 0 ? item.quantity : 1;
      return qty % ratio !== 0;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <span>Selecciona tus Complementos</span>
          </DialogTitle>
          <DialogDescription>
            Elige los complementos para el kit: <strong>{kit.name}</strong>
            <br />
            Progreso: <strong>{progressPercentage}%</strong> ({currentSelectedCredits.toFixed(2)} / {totalNeededCredits} créditos de regalo)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 py-4 max-h-[60vh] overflow-y-auto">
            {kit.items.map((item) => {
                const qtySelected = selectedCounts[item.id] || 0;
                const baseQty = currentGiftsCount[item.id] || 0;
                const kitItemRatio = item.quantity && item.quantity > 0 ? item.quantity : 1;
                const creditCost = 1 / kitItemRatio;
                
                const isLockedOut = incompleteItems.length > 0 && !incompleteItems.some(i => i.id === item.id);
                const canAdd = (remainingCredits >= creditCost - 0.0001) && !isLockedOut;
                const canRemove = qtySelected > baseQty;

                return (
                    <div
                        key={item.id}
                        className={cn(
                            "flex items-center p-3 border rounded-lg transition-all",
                             qtySelected > 0 ? (qtySelected % kitItemRatio !== 0 ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-purple-500 bg-purple-50 ring-1 ring-purple-500") : "border-zinc-200",
                             isLockedOut && "opacity-50 grayscale"
                        )}
                    >
                         <div className="flex-1">
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                                Se requiere paquete de: {kitItemRatio} unidad(es).
                                {baseQty > 0 && ` (${baseQty} ya en carrito)`}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white rounded-md border p-1 shadow-sm">
                             <Button 
                                variant="ghost" size="icon" className="h-6 w-6" 
                                onClick={() => handleDecrement(item.id)}
                                disabled={!canRemove}
                             >
                                 -
                             </Button>
                             <span className="w-4 text-center text-sm font-bold">{qtySelected}</span>
                             <Button 
                                variant="ghost" size="icon" className="h-6 w-6 text-purple-600"
                                onClick={() => handleIncrement(item.id)}
                                disabled={!canAdd}
                             >
                                 +
                             </Button>
                        </div>
                    </div>
                )
            })}
        </div>

        <div className="flex justify-end gap-2">
             <Button variant="outline" onClick={onCancel}>
                Cerrar sin seleccionar
             </Button>
             <Button onClick={handleConfirm} disabled={!isComplete && remainingCredits > 0.0001}>
                {isComplete ? "Confirmar Selección" : `Completar Selección`}
             </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
