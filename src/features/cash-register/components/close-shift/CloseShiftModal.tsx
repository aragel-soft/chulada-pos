import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Scissors, Wallet } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { CloseShiftStepOne } from "./CloseShiftStepOne";
import { CloseShiftStepTwo } from "./CloseShiftStepTwo";
import type { CloseShiftFormValues } from "@/features/cash-register/schemas/closeShiftSchema";
import type { ShiftDetailsDto, ShiftDto } from "@/types/cast-cut";


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

  const cashWithdrawal = (details?.total_cash_sales ?? 0) + (details?.debt_payments_cash ?? 0)  + (details?.total_movements_in ?? 0) - (details?.total_movements_out ?? 0);

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

  const handleConfirmed = (_closedShift: ShiftDto) => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0"
        key={sessionKey}
      >
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <DialogHeader className="mb-4 flex flex-row items-center gap-4 space-y-0 justify-between">
            <div className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-full bg-purple-50 shrink-0">
                <Scissors className="h-5 w-5 text-purple-800" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                  Realizar Corte de Caja
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Proceso guiado de cierre de turno
                </p>
              </div>
            </div>

            {/* Cash withdrawal - Slim version */}
            <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 mr-6">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <div className="flex flex-col min-w-[120px]">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 leading-none">
                    Monto a Retirar
                  </span>
                  <span className="text-[9px] text-emerald-600 leading-none mt-0.5">
                    Totas las operaciones en efectivo
                  </span>
                </div>
              </div>
              <div className="text-lg font-bold text-emerald-700 tabular-nums">
                {formatCurrency(cashWithdrawal)}
              </div>
            </div>
          </DialogHeader>

          {/* Stepper */}
          <nav aria-label="Progreso del Corte" className="w-full px-2">
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
            <CloseShiftStepTwo
              details={details}
              formValues={formValues}
              onBack={handleBack}
              onConfirmed={handleConfirmed}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
