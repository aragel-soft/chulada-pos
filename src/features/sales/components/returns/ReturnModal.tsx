import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SaleDetail } from "@/types/sales-history";
import { ReturnStepOne } from "@/features/sales/components/returns/ReturnStepOne";
import { ChevronLeft } from "lucide-react";

interface ReturnModalProps {
  sale: SaleDetail;
  isOpen: boolean;
  onClose: () => void;
}

export interface ReturnItem {
  saleItemId: string;
  productId: string;
  productName: string;
  originalQuantity: number;
  alreadyReturnedQuantity: number;
  availableQuantity: number;
  unitPrice: number;
  returnQuantity: number;
  isSelected: boolean;
  priceType: string;
  isGift: boolean;
  productImage?: string;
  promotionId?: string;
  promotionName?: string;
  kitOptionId?: string;
}

export function ReturnModal({ sale, isOpen, onClose }: ReturnModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const handleNext = () => {
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle>Procesar Devolución - Paso {currentStep} de 2</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStep === 1
                  ? "Selecciona los productos a devolver"
                  : "Confirma los detalles de la devolución"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {currentStep === 1 && (
            <ReturnStepOne
              sale={sale}
              returnItems={returnItems}
              setReturnItems={setReturnItems}
              onNext={handleNext}
              onCancel={onClose}
            />
          )}
          {currentStep === 2 && (
            <div className="p-6">
              <p>Paso 2 - Por implementar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
