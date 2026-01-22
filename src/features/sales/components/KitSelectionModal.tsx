import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KitOptionDef, KitItemDef } from "@/types/kits";
import { useState, useEffect } from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface KitSelectionModalProps {
  isOpen: boolean;
  kit: KitOptionDef | null;
  triggerQuantity: number; // How many triggers are in cart?
  alreadySelectedCount?: number; // How many gifts are ALREADY in cart linked to this trigger?
  onConfirm: (selectedItems: KitItemDef[]) => void;
  onCancel: () => void;
}

export function KitSelectionModal({ isOpen, kit, triggerQuantity, alreadySelectedCount = 0, onConfirm, onCancel }: KitSelectionModalProps) {
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  
  // Reset state when opening
  useEffect(() => {
      if (isOpen) setSelectedCounts({});
  }, [isOpen]);

  if (!kit) return null;

  const totalNeeded = kit.max_selections * triggerQuantity;
  const neededNow = Math.max(0, totalNeeded - alreadySelectedCount); // This is what we need to select IN THIS MODAL
  
  const currentSelectedCount = Object.values(selectedCounts).reduce((a, b) => a + b, 0);
  const remaining = neededNow - currentSelectedCount;

  const handleIncrement = (itemId: string) => {
      if (currentSelectedCount < neededNow) {
          setSelectedCounts(prev => ({
              ...prev,
              [itemId]: (prev[itemId] || 0) + 1
          }));
      }
  };

  const handleDecrement = (itemId: string) => {
      if ((selectedCounts[itemId] || 0) > 0) {
          setSelectedCounts(prev => ({
              ...prev,
              [itemId]: prev[itemId] - 1
          }));
      }
  };
  
  const handleConfirm = () => {
    // Convert counts to list of KitItemDef
    const result: KitItemDef[] = [];
    Object.entries(selectedCounts).forEach(([itemId, qty]) => {
        if (qty > 0) {
            const itemDef = kit.items.find(i => i.id === itemId);
            if (itemDef) {
                 result.push({ ...itemDef, quantity: qty }); // Note: This quantity is TOTAL for this item type
            }
        }
    });

    onConfirm(result);
    setSelectedCounts({});
  };
  
  const isComplete = currentSelectedCount === neededNow;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <span>Selecciona tus Regalos</span>
          </DialogTitle>
          <DialogDescription>
             Te faltan seleccionar <strong>{remaining}</strong> regalo(s) de un total de {totalNeeded} ({alreadySelectedCount} ya seleccionados).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 py-4 max-h-[60vh] overflow-y-auto">
            {kit.items.map((item) => {
                const qtySelected = selectedCounts[item.id] || 0;
                const canAdd = currentSelectedCount < neededNow;

                return (
                    <div
                        key={item.id}
                        className={cn(
                            "flex items-center p-3 border rounded-lg transition-all",
                             qtySelected > 0 ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500" : "border-zinc-200"
                        )}
                    >
                         <div className="flex-1">
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">Disponible en kit</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white rounded-md border p-1 shadow-sm">
                             <Button 
                                variant="ghost" size="icon" className="h-6 w-6" 
                                onClick={() => handleDecrement(item.id)}
                                disabled={qtySelected === 0}
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
             <Button onClick={handleConfirm} disabled={!isComplete && remaining > 0}>
                {remaining === 0 ? "Confirmar Selección" : `Faltan ${remaining}`}
             </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
