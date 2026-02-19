import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import {
  Banknote,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
  Calculator,
  ArrowRight,
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import type { ShiftDetailsDto } from "@/types/cast-cut";
import { getCloseShiftSchema, type CloseShiftFormValues } from "@/features/cash-register/schemas/closeShiftSchema";

// ── Helpers ─────────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon, prefix, className }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  prefix?: "+" | "-";
  className?: string;
}) {
  return (
    <div className={`flex justify-between items-center text-sm ${className ?? ""}`}>
      <span className="text-zinc-500 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium text-zinc-700">
        {prefix && `${prefix} `}{formatCurrency(value)}
      </span>
    </div>
  );
}

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

  // Form state
  const [finalCash, setFinalCash] = useState(initialValues?.final_cash?.toString() ?? "");
  const [cardTerminalTotal, setCardTerminalTotal] = useState(initialValues?.card_terminal_total?.toString() ?? "");
  const [terminalConfirmed, setTerminalConfirmed] = useState(initialValues?.terminal_cut_confirmed ?? false);
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Theoretical values
  const expectedCash = d.theoretical_cash;
  const cardExpectedTotal = d.total_card_sales + d.debt_payments_card;
  const cashWithdrawal = d.total_cash_sales + d.debt_payments_cash;

  // Real-time differences
  const finalCashNum = parseFloat(finalCash) || 0;
  const cardTerminalNum = parseFloat(cardTerminalTotal) || 0;

  const cashDiff = finalCashNum - expectedCash;
  const cardDiff = cardTerminalNum - cardExpectedTotal;
  const hasDifference = Math.abs(cashDiff) >= 0.01 || Math.abs(cardDiff) >= 0.01;

  const handleNext = () => {
    setSubmitted(true);

    const schema = getCloseShiftSchema(hasDifference);
    const result = schema.safeParse({
      final_cash: finalCash,
      card_terminal_total: cardTerminalTotal,
      terminal_cut_confirmed: terminalConfirmed || undefined,
      notes,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onNext(
      {
        final_cash: finalCashNum,
        card_terminal_total: cardTerminalNum,
        terminal_cut_confirmed: true,
        notes: notes.trim(),
      },
      details
    );
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-2 gap-5">
            {/* ── LEFT COLUMN: Theoretical info (read-only) ── */}
            <div className="space-y-4">
              {/* Cash theoretical breakdown */}
              <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-700">Desglose Teórico del Efectivo</span>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow icon={Banknote} label="Fondo Inicial" value={d.shift.initial_cash} prefix="+" />
                  <InfoRow icon={Banknote} label="Ventas Efectivo" value={d.total_cash_sales} prefix="+" />
                  <InfoRow icon={HandCoins} label="Abonos Efectivo" value={d.debt_payments_cash} prefix="+" />
                  <InfoRow icon={ArrowDownCircle} label="Entradas Manuales" value={d.total_movements_in} prefix="+" />
                  <InfoRow icon={ArrowUpCircle} label="Salidas Manuales" value={d.total_movements_out} prefix="-" />
                  <div className="h-px bg-zinc-200 my-1" />
                  <div className="flex justify-between items-center font-semibold text-zinc-900">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="h-4 w-4" /> Efectivo Esperado
                    </span>
                    <span className="text-lg">{formatCurrency(expectedCash)}</span>
                  </div>
                </div>
              </div>

              {/* Card theoretical breakdown */}
              <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-700">Tarjeta Teórica</span>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow icon={CreditCard} label="Ventas con Tarjeta" value={d.total_card_sales} prefix="+" />
                  <InfoRow icon={HandCoins} label="Abonos con Tarjeta" value={d.debt_payments_card} prefix="+" />
                  <div className="h-px bg-zinc-200 my-1" />
                  <div className="flex justify-between items-center font-semibold text-zinc-900">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4" /> Total Tarjeta Esperado
                    </span>
                    <span className="text-lg">{formatCurrency(cardExpectedTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Cash withdrawal */}
              <div className="rounded-lg border-2 border-emerald-200 overflow-hidden bg-emerald-50">
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-700" />
                    <div>
                      <span className="text-sm font-semibold text-emerald-800 block">
                        Monto a Retirar de Caja
                      </span>
                      <span className="text-xs text-emerald-600">
                        Ventas efectivo + Abonos efectivo
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-emerald-800">
                    {formatCurrency(cashWithdrawal)}
                  </span>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-xs text-emerald-700 bg-emerald-100 rounded px-2 py-1">
                    Debe retirarse TODO el efectivo generado por ventas y abonos
                  </p>
                </div>
              </div>
            </div>

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
                      Efectivo contado físicamente
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-500 font-bold text-lg">$</span>
                      <MoneyInput
                        id="close-final-cash"
                        className="pl-8 text-lg font-medium"
                        value={finalCash}
                        onChange={(e) => setFinalCash(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                    {submitted && errors.final_cash && (
                      <p className="text-xs text-red-600">{errors.final_cash}</p>
                    )}
                    {finalCash !== "" && (
                      <div className="mt-2">
                        <DifferenceBadge difference={cashDiff} />
                      </div>
                    )}
                  </div>

                  {/* Card input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="close-card-total" className="text-sm font-medium">
                      Monto reportado por terminal bancaria
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-500 font-bold text-lg">$</span>
                      <MoneyInput
                        id="close-card-total"
                        className="pl-8 text-lg font-medium"
                        value={cardTerminalTotal}
                        onChange={(e) => setCardTerminalTotal(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    {submitted && errors.card_terminal_total && (
                      <p className="text-xs text-red-600">{errors.card_terminal_total}</p>
                    )}
                    {cardTerminalTotal !== "" && (
                      <div className="mt-2">
                        <DifferenceBadge difference={cardDiff} />
                      </div>
                    )}
                  </div>

                  {/* Terminal confirmation checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="terminal-confirmed"
                      checked={terminalConfirmed}
                      onCheckedChange={(v) => setTerminalConfirmed(v === true)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="terminal-confirmed" className="text-sm cursor-pointer">
                        Confirmo que realicé el corte de la terminal bancaria
                      </Label>
                      {submitted && errors.terminal_cut_confirmed && (
                        <p className="text-xs text-red-600">{errors.terminal_cut_confirmed}</p>
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
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Explique la diferencia encontrada..."
                      className="resize-none"
                    />
                    {submitted && errors.notes && (
                      <p className="text-xs text-red-600 mt-1">{errors.notes}</p>
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
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1.5" /> Cancelar
        </Button>
        <Button
          onClick={handleNext}
          className="bg-[#480489] hover:bg-[#360368] text-white"
        >
          Siguiente <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
