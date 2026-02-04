import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaleDetail } from "@/types/sales-history";
import { ReturnStepOne } from "@/features/sales/components/returns/ReturnStepOne";
import { ReturnStepTwo } from "@/features/sales/components/returns/ReturnStepTwo";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";


interface ReturnModalProps {
  sale: SaleDetail;
  isOpen: boolean;
  onClose: () => void;
}

import { ReturnItem } from "@/types/returns";

import { UI_COLORS } from "@/features/sales/constants/sales-design";

export function ReturnModal({ sale, isOpen, onClose }: ReturnModalProps) {

  // --- WIZARD DESIGN ---
  const WIZARD_STEPS = [
    { id: 1, title: "Selección" },
    { id: 2, title: "Confirmación" },
  ];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSessionKey(prev => prev + 1);
    }
  }, [isOpen]);

  const handleNext = () => {
    setCurrentStep(2);
  };
  
  const handleConfirmReturn = async (reason: string, notes: string): Promise<string> => {
    setIsProcessing(true);
    try {
      // TODO: Call backend to process return
      console.log("Processing return:", { reason, notes, items: returnItems });
      
      // Simulate backend delay and response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return "UNDER_CONSTRUCTION";
    } finally {
      setIsProcessing(false);
    }
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0" key={sessionKey}>
        {/* --- HEADER --- */}
        <div className="p-6 pb-4 border-b bg-background">
          <DialogHeader className="mb-6 flex flex-row items-center gap-3 space-y-0">
            <div className="p-2 rounded-full bg-purple-50"> 
              <RotateCcw className="h-6 w-6 text-purple-800" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-foreground">
                Procesar Devolución
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Folio Venta: {sale.folio}
              </p>
            </div>
          </DialogHeader>

          {/* Stepper Visual */}
          <nav aria-label="Progreso del Wizard" className="w-full">
            <ol className="flex items-center w-full">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isFuture = step.id > currentStep;

                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-center relative",
                      index !== WIZARD_STEPS.length - 1 ? "flex-1" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 group",
                        isFuture ? "opacity-60" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                          isActive
                            ? "text-white shadow-md scale-110"
                            : isCompleted
                            ? "text-white"
                            : "border-muted-foreground/30 text-muted-foreground bg-background"
                        )}
                        style={{
                           borderColor: isActive || isCompleted ? UI_COLORS.brandPurple : undefined,
                           backgroundColor: isActive || isCompleted ? UI_COLORS.brandPurple : undefined
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-semibold">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="hidden sm:flex flex-col items-start">
                        <span
                          className={cn(
                            "text-sm font-medium transition-colors",
                            isCompleted || isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                           style={{
                              color: isActive ? UI_COLORS.brandPurple : undefined
                           }}
                        >
                          {step.title}
                        </span>
                      </div>
                    </div>

                    {index !== WIZARD_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-[2px] w-full mx-4 transition-colors duration-500",
                          isCompleted ? "" : "bg-muted"
                        )}
                         style={{ backgroundColor: isCompleted ? UI_COLORS.brandPurple : undefined }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

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
            <ReturnStepTwo
              sale={sale}
              returnItems={returnItems}
              onBack={handleBack}
              onConfirm={handleConfirmReturn}
              onCancel={onClose}
              isProcessing={isProcessing}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
