import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type { ShiftDetailsDto, CloseShiftRequest, ShiftDto } from "@/types/cast-cut";
import type { CloseShiftFormValues } from "@/features/cash-register/schemas/closeShiftSchema";
import { TheoreticalSummaryColumn } from "./TheoreticalSummaryColumn";


// ── Helpers ─────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Cuadrada
      </span>
    );
  }
  const isPositive = diff > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
        isPositive
          ? "bg-blue-100 text-blue-800"
          : "bg-red-100 text-red-800"
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      {isPositive ? "Sobrante" : "Faltante"}: {formatCurrency(Math.abs(diff))}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: "emerald" | "red" | "blue";
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-1.5",
        bold && "font-semibold"
      )}
    >
      <span className="text-sm text-zinc-600">{label}</span>
      <span
        className={cn(
          "text-sm",
          bold && "text-base",
          highlight === "emerald" && "text-emerald-700 font-semibold",
          highlight === "red" && "text-red-700 font-semibold",
          highlight === "blue" && "text-blue-700 font-semibold",
          !highlight && bold && "text-zinc-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Props ───────────────────────────────────────────────────────

interface CloseShiftStepTwoProps {
  details: ShiftDetailsDto;
  formValues: CloseShiftFormValues;
  onBack: () => void;
  onConfirmed: (closedShift: ShiftDto) => void;
}

// ── Component ───────────────────────────────────────────────────

export function CloseShiftStepTwo({
  details,
  formValues,
  onBack,
  onConfirmed,
}: CloseShiftStepTwoProps) {
  const d = details;
  const closeShift = useCashRegisterStore((s) => s.closeShift);
  const user = useAuthStore((s) => s.user);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Computed values
  const expectedCash = d.theoretical_cash;
  const cardExpectedTotal = d.total_card_sales + d.debt_payments_card;

  const cashDiff = formValues.final_cash - expectedCash;
  const cardDiff = formValues.card_terminal_total - cardExpectedTotal;
  const hasDifference = Math.abs(cashDiff) >= 0.01 || Math.abs(cardDiff) >= 0.01;

  const handleConfirmClick = () => {
    if (hasDifference) {
      setShowConfirmDialog(true);
    } else {
      executeClose();
    }
  };

  const executeClose = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const request: CloseShiftRequest = {
        finalCash: formValues.final_cash,
        cardTerminalTotal: formValues.card_terminal_total,
        notes: formValues.notes || undefined,
      };

      const closedShift = await closeShift(request, user.id);
      toast.success("Corte de caja realizado exitosamente");
      onConfirmed(closedShift);
    } catch (err) {
      toast.error("Error al cerrar el turno", {
        description: String(err),
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">

        <div className="p-6">
          <div className="grid grid-cols-2 gap-5">
            {/* ── LEFT COLUMN: Financial summary ── */}
            <TheoreticalSummaryColumn details={d} />

            {/* ── RIGHT COLUMN: Status + notes ── */}
            <div className="space-y-4">
              {/* Overall status */}
              <div
                className={cn(
                  "rounded-lg border-2 overflow-hidden p-5",
                  hasDifference
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-emerald-200 bg-emerald-50/50"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  {hasDifference ? (
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  )}
                  <div>
                    <h3
                      className={cn(
                        "font-semibold text-base",
                        hasDifference ? "text-amber-800" : "text-emerald-800"
                      )}
                    >
                      {hasDifference ? "Corte con Diferencias" : "Caja Cuadrada"}
                    </h3>
                    <p
                      className={cn(
                        "text-xs",
                        hasDifference ? "text-amber-600" : "text-emerald-600"
                      )}
                    >
                      {hasDifference
                        ? "Se detectaron diferencias en el corte"
                        : "Los montos coinciden correctamente"}
                    </p>
                  </div>
                </div>

                {hasDifference && (
                  <div className="space-y-1 mt-2">
                    {Math.abs(cashDiff) >= 0.01 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-700">Diferencia Efectivo</span>
                        <span className={cn("font-medium", cashDiff > 0 ? "text-blue-700" : "text-red-700")}>
                          {cashDiff > 0 ? "+" : ""}{formatCurrency(cashDiff)}
                        </span>
                      </div>
                    )}
                    {Math.abs(cardDiff) >= 0.01 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-700">Diferencia Tarjeta</span>
                        <span className={cn("font-medium", cardDiff > 0 ? "text-blue-700" : "text-red-700")}>
                          {cardDiff > 0 ? "+" : ""}{formatCurrency(cardDiff)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Cash withdrawal */}
              <div className="rounded-lg border border-green-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-green-50 border-b flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Efectivo</span>
                </div>
                <div className="p-4 space-y-1">
                  <SummaryRow label="Fondo Inicial" value={formatCurrency(d.shift.initial_cash)} />
                  <SummaryRow label="Efectivo Esperado" value={formatCurrency(expectedCash)} bold />
                  <SummaryRow label="Efectivo Contado" value={formatCurrency(formValues.final_cash)} bold />
                  <div className="h-px bg-zinc-200 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-600">Diferencia</span>
                    <DiffBadge diff={cashDiff} />
                  </div>
                </div>
              </div>

              {/* Card comparison */}
              <div className="rounded-lg border border-blue-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-50 border-b flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Tarjeta</span>
                </div>
                <div className="p-4 space-y-1">
                  <SummaryRow label="Total Tarjeta Esperado" value={formatCurrency(cardExpectedTotal)} bold />
                  <SummaryRow label="Reportado por Terminal" value={formatCurrency(formValues.card_terminal_total)} bold />
                  <div className="h-px bg-zinc-200 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-600">Diferencia</span>
                    <DiffBadge diff={cardDiff} />
                  </div>
                </div>
              </div>
              {/* Notes */}
              {formValues.notes && formValues.notes.trim().length > 0 && (
                <div className="rounded-lg border border-amber-200 overflow-hidden bg-amber-50/30">
                  <div className="px-4 py-2.5 bg-amber-100/60 border-b border-amber-200 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-700" />
                    <span className="text-sm font-semibold text-amber-800">Nota del Cajero</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                      {formValues.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* ── Footer ── */}
      <div className="border-t p-4 flex justify-between items-center bg-zinc-50/50">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Atrás
        </Button>
        <Button
          onClick={handleConfirmClick}
          disabled={isSubmitting}
          className="bg-[#480489] hover:bg-[#360368] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Cerrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar Cierre
            </>
          )}
        </Button>
      </div>

      {/* ── Confirmation dialog for differences ── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar cierre con diferencias
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se detectaron diferencias en el corte de caja. ¿Está seguro de que
              desea cerrar el turno con estas diferencias?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeClose}
              className="bg-[#480489] hover:bg-[#360368] text-white"
            >
              Sí, Cerrar Turno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
