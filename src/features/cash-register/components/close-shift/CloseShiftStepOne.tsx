import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { ShiftDetailsDto } from "@/types/cast-cut";
import { getCloseShiftSchema, type CloseShiftFormValues } from "@/features/cash-register/schemas/closeShiftSchema";
import { TheoreticalSummaryColumn } from "./TheoreticalSummaryColumn";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// ── Helpers ─────────────────────────────────────────────────────

function DifferenceBadge({ difference }: { difference: number }) {
  if (Math.abs(difference) < 0.01) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-semibold text-green-700">Caja Cuadrada</span>
      </div>
    );
  }
  const isPositive = difference > 0;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
      isPositive
        ? "bg-blue-50 border-blue-200"
        : "bg-red-50 border-red-200"
    }`}>
      {isPositive ? (
        <TrendingUp className="h-4 w-4 text-blue-600" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-600" />
      )}
      <span className={`text-sm font-semibold ${isPositive ? "text-blue-700" : "text-red-700"}`}>
        {isPositive ? "Sobrante" : "Faltante"}: {formatCurrency(Math.abs(difference))}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────

interface CloseShiftStepOneProps {
  details: ShiftDetailsDto;
  initialValues: CloseShiftFormValues | null;
  onNext: (values: CloseShiftFormValues, details: ShiftDetailsDto) => void;
  onCancel: () => void;
}

export function CloseShiftStepOne({
  details,
  initialValues,
  onNext,
  onCancel,
}: CloseShiftStepOneProps) {
  const d = details;

  // Theoretical values
  const expectedCash = d.theoretical_cash;
  const cardExpectedTotal = d.total_card_sales + d.debt_payments_card;

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CloseShiftFormValues>({
    defaultValues: {
      final_cash: initialValues?.final_cash ?? 0,
      card_terminal_total: initialValues?.card_terminal_total ?? 0,
      terminal_cut_confirmed: initialValues?.terminal_cut_confirmed ?? false as any,
      notes: initialValues?.notes ?? "",
    },
    resolver: async (values, context, options) => {
      const finalCashNum = values.final_cash || 0;
      const cardTerminalNum = values.card_terminal_total || 0;
      
      const currentCashDiff = finalCashNum - expectedCash;
      const currentCardDiff = cardTerminalNum - cardExpectedTotal;
      const currentHasDifference =
        Math.abs(currentCashDiff) >= 0.01 || Math.abs(currentCardDiff) >= 0.01;

      const schema = getCloseShiftSchema(currentHasDifference);
      return zodResolver(schema as any)(values, context, options);
    },
  });

  const formFinalCash = watch("final_cash") || 0;
  const formCardTerminal = watch("card_terminal_total") || 0;

  const cashDiff = formFinalCash - expectedCash;
  const cardDiff = formCardTerminal - cardExpectedTotal;
  const hasDifference = Math.abs(cashDiff) >= 0.01 || Math.abs(cardDiff) >= 0.01;

  const onSubmitForm = handleSubmit((values: CloseShiftFormValues) => {
    onNext(
      {
        ...values,
        terminal_cut_confirmed: true,
        notes: values.notes?.trim(),
      },
      details
    );
  });

  return (
    <form
      onSubmit={onSubmitForm}
      className="flex flex-col h-full overflow-hidden"
    >
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-2 gap-5">
            {/* ── LEFT COLUMN: Theoretical info (read-only) ── */}
            <TheoreticalSummaryColumn details={d} />

            {/* ── RIGHT COLUMN: Capture inputs ── */}
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-purple-200 overflow-hidden bg-purple-50/30">
                <div className="px-4 py-2.5 bg-purple-100/60 border-b border-purple-200 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-purple-700" />
                  <span className="text-sm font-semibold text-purple-800">Captura de Montos Reales</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Cash input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="close-final-cash" className="text-sm font-medium">
                      Efectivo contado físicamente <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-500 font-bold text-lg">$</span>
                      <Controller
                        name="final_cash"
                        control={control}
                        render={({ field }) => (
                          <MoneyInput
                            id="close-final-cash"
                            className="pl-8 text-lg font-medium w-full"
                            value={field.value !== undefined ? field.value.toString() : ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            autoFocus
                          />
                        )}
                      />
                    </div>
                    {errors.final_cash && (
                      <p className="text-xs text-red-600">{errors.final_cash.message}</p>
                    )}
                    <div className="mt-2">
                      <DifferenceBadge difference={cashDiff} />
                    </div>
                  </div>

                  {/* Card input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="close-card-total" className="text-sm font-medium">
                      Monto reportado por terminal bancaria <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-500 font-bold text-lg">$</span>
                      <Controller
                        name="card_terminal_total"
                        control={control}
                        render={({ field }) => (
                          <MoneyInput
                            id="close-card-total"
                            className="pl-8 text-lg font-medium w-full"
                            value={field.value !== undefined ? field.value.toString() : ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        )}
                      />
                    </div>
                    {errors.card_terminal_total && (
                      <p className="text-xs text-red-600">{errors.card_terminal_total.message}</p>
                    )}
                    <div className="mt-2">
                       <DifferenceBadge difference={cardDiff} />
                    </div>
                  </div>

                  {/* Terminal confirmation checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <Controller
                      name="terminal_cut_confirmed"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="terminal-confirmed"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="terminal-confirmed" className="text-sm cursor-pointer">
                        Confirmo que realicé el corte de la terminal bancaria <span className="text-red-500">*</span>
                      </Label>
                      {errors.terminal_cut_confirmed && (
                        <p className="text-xs text-red-600">{errors.terminal_cut_confirmed.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes (conditional) */}
              {hasDifference && (
                <div className="rounded-lg border border-amber-200 overflow-hidden bg-amber-50/30">
                  <div className="px-4 py-2.5 bg-amber-100/60 border-b border-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <span className="text-sm font-semibold text-amber-800">
                      Se detectó una diferencia — Justifique el motivo
                    </span>
                  </div>
                  <div className="p-4">
                    <Textarea
                      {...register("notes")}
                      rows={3}
                      placeholder="Explique la diferencia encontrada..."
                      className="resize-none"
                    />
                    {errors.notes && (
                      <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* ── Footer ── */}
      <div className="border-t p-4 flex justify-between items-center bg-zinc-50/50">
        <Button
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-1.5" /> Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#480489] hover:bg-[#360368] text-white"
        >
          Siguiente <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </form>
  );
}
