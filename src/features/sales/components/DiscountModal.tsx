import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DISCOUNT_CONFIG } from "@/config/constants";
import { Percent, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDiscount: number;
  onApplyDiscount: (percentage: number) => void;
}

export function DiscountModal({
  isOpen,
  onClose,
  currentDiscount,
  onApplyDiscount,
}: DiscountModalProps) {
  const handleSelectDiscount = (percentage: number) => {
    onApplyDiscount(percentage);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#480489]" />
            Aplicar Descuento Global
          </DialogTitle>
          <DialogDescription>
            Selecciona el porcentaje de descuento a aplicar a toda la venta.
            {currentDiscount > 0 && (
              <span className="block mt-2 text-amber-600 font-medium">
                Descuento actual: {currentDiscount}%
              </span>
            )}
            <span className="block mt-2 text-xs text-muted-foreground">
              💡 Tip: Presiona <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-xs font-mono">F8</kbd> para abrir esta ventana o{" "}
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-xs font-mono">Ctrl+0</kbd> para quitar descuento.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {DISCOUNT_CONFIG.PRESET_OPTIONS.map((percentage) => (
            <Button
              key={percentage}
              variant="outline"
              className={cn(
                "h-16 text-lg font-semibold border-2 transition-all hover:scale-105",
                currentDiscount === percentage
                  ? "border-[#480489] bg-purple-50 text-[#480489]"
                  : "border-zinc-200 hover:border-[#480489] hover:bg-purple-50"
              )}
              onClick={() => handleSelectDiscount(percentage)}
            >
              {percentage}%
            </Button>
          ))}
        </div>

        {currentDiscount > 0 && (
          <Button
            variant="destructive"
            className="mt-4 w-full"
            onClick={() => handleSelectDiscount(0)}
          >
            <X className="w-4 h-4 mr-2" />
            Quitar Descuento
          </Button>
        )}

        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>⚠️ Nota:</strong> Al aplicar un descuento global, todos los
            productos cambiarán a precio de lista (se desactiva mayoreo).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
