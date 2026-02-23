import { formatCurrency } from "@/lib/utils";
import {
  Banknote,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
  Calculator,
  Receipt,
  Ticket,
} from "lucide-react";
import type { ShiftDetailsDto } from "@/types/cast-cut";

export function InfoRow({
  label,
  value,
  icon: Icon,
  prefix,
  className,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  prefix?: "+" | "-";
  className?: string;
}) {
  return (
    <div
      className={`flex justify-between items-center text-sm ${className ?? ""}`}
    >
      <span className="text-zinc-500 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium text-zinc-700">
        {prefix && `${prefix} `}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

interface TheoreticalSummaryColumnProps {
  details: ShiftDetailsDto;
}

export function TheoreticalSummaryColumn({
  details: d,
}: TheoreticalSummaryColumnProps) {
  const expectedCash = d.theoretical_cash;
  const cardExpectedTotal = d.total_card_sales + d.debt_payments_card;

  return (
    <div className="space-y-4">
      {/* Cash theoretical breakdown */}
      <div className="rounded-lg border border-green-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-green-50 border-b border-green-200 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-800">
            Desglose Teórico del Efectivo
          </span>
        </div>
        <div className="p-4 space-y-2">
          <InfoRow
            icon={Banknote}
            label="Fondo Inicial"
            value={d.shift.initial_cash}
            prefix="+"
          />
          <InfoRow
            icon={Banknote}
            label="Ventas Efectivo"
            value={d.total_cash_sales}
            prefix="+"
          />
          <InfoRow
            icon={HandCoins}
            label="Abonos Efectivo"
            value={d.debt_payments_cash}
            prefix="+"
          />
          <InfoRow
            icon={ArrowDownCircle}
            label="Entradas Manuales"
            value={d.total_movements_in}
            prefix="+"
          />
          <InfoRow
            icon={ArrowUpCircle}
            label="Salidas Manuales"
            value={d.total_movements_out}
            prefix="-"
          />
          <div className="h-px bg-zinc-200 my-1" />
          <div className="flex justify-between items-center font-semibold text-zinc-900 text-sm font-medium">
            <span className="flex items-center gap-1">
              <Calculator className="h-3 w-3" /> Efectivo Esperado
            </span>
            <span>{formatCurrency(expectedCash)}</span>
          </div>
        </div>
      </div>

      {/* Card theoretical breakdown */}
      <div className="rounded-lg border border-blue-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">
            Tarjeta Teórica
          </span>
        </div>
        <div className="p-4 space-y-2">
          <InfoRow
            icon={CreditCard}
            label="Ventas con Tarjeta"
            value={d.total_card_sales}
            prefix="+"
          />
          <InfoRow
            icon={HandCoins}
            label="Abonos con Tarjeta"
            value={d.debt_payments_card}
            prefix="+"
          />
          <div className="h-px bg-zinc-200 my-1" />
          <div className="flex justify-between items-center font-semibold text-zinc-900 text-sm font-medium">
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Total Tarjeta Esperado
            </span>
            <span>{formatCurrency(cardExpectedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Other sales info */}
      <div className="rounded-lg border border-amber-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            Otros Métodos (Solo Informativo)
          </span>
        </div>
        <div className="p-4 space-y-2">
          <InfoRow
            icon={Receipt}
            label="Ventas a Crédito"
            value={d.total_credit_sales}
          />
          <InfoRow
            icon={Ticket}
            label="Uso de Vales"
            value={d.total_voucher_sales}
          />
        </div>
      </div>
    </div>
  );
}
