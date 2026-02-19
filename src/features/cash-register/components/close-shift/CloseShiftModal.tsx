import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { CloseShiftStepOne } from "./CloseShiftStepOne";
import type { CloseShiftFormValues } from "@/features/cash-register/schemas/closeShiftSchema";
import type { ShiftDetailsDto } from "@/types/cast-cut";


const WIZARD_STEPS = [
  { id: 1, title: "Captura" },
  { id: 2, title: "Confirmación" },
];

interface CloseShiftModalProps {
  shiftId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CloseShiftModal({ shiftId, isOpen, onClose }: CloseShiftModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formValues, setFormValues] = useState<CloseShiftFormValues | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const { data: details, isLoading } = useQuery({
    queryKey: ["shiftDetails", shiftId, "close-modal"],
    queryFn: () => getShiftDetails(shiftId),
    enabled: isOpen && !!shiftId,
  });

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFormValues(null);
      setSessionKey((prev) => prev + 1);
    }
  }, [isOpen]);

  const handleNext = (values: CloseShiftFormValues, _details: ShiftDetailsDto) => {
    setFormValues(values);
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
      <DialogContent
        className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0"
        key={sessionKey}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b bg-background">
          <DialogHeader className="mb-6 flex flex-row items-center gap-3 space-y-0">
            <div className="p-2 rounded-full bg-purple-50">
              <Scissors className="h-6 w-6 text-purple-800" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-foreground">
                Realizar Corte de Caja
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Proceso guiado de cierre de turno
              </p>
            </div>
          </DialogHeader>

          {/* Stepper */}
          <nav aria-label="Progreso del Corte" className="w-full">
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
                            ? "bg-[#480489] border-[#480489] text-white shadow-md scale-110"
                            : isCompleted
                            ? "bg-[#480489] border-[#480489] text-white"
                            : "border-muted-foreground/30 text-muted-foreground bg-background"
                        )}
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
                            isActive
                              ? "text-[#480489]"
                              : isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {step.title}
                        </span>
                      </div>
                    </div>

                    {index !== WIZARD_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-[2px] w-full mx-4 transition-colors duration-500",
                          isCompleted ? "bg-[#480489]" : "bg-muted"
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Cargando datos del turno...
            </div>
          )}

          {!isLoading && details && currentStep === 1 && (
            <CloseShiftStepOne
              details={details}
              initialValues={formValues}
              onNext={handleNext}
              onCancel={onClose}
            />
          )}

          {!isLoading && details && currentStep === 2 && formValues && (
            <div className="p-6 text-center text-muted-foreground">
              {/* Step 2 placeholder — will be implemented in commit 4 */}
              <p>Step 2 en construcción...</p>
              <button onClick={handleBack} className="mt-4 underline text-sm">
                ← Volver al paso 1
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
