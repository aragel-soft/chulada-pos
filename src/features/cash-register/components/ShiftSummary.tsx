import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Banknote,
  CreditCard,
  HandCoins,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Receipt,
  Ticket,
  FileText,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { format } from "date-fns";
import type { CashMovementDto, ShiftDetailsDto } from "@/types/cast-cut";
// ── Reusable helpers ─────────────────────────────────────────────

interface StatRowProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: string;
  prefix?: "+" | "-";
}

/** A single row: icon + label ···· formatted value */
function StatRow({
  icon: Icon,
  label,
  value,
  color = "text-zinc-500",
  prefix,
}: StatRowProps) {
  const valueColor = color === "text-zinc-500" ? "text-zinc-700" : color;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={`${color} text-lg flex items-center gap-1.5`}>
        <Icon className=" h-3.5 w-3.5" /> {label}
      </span>
      <span className={`text-lg font-medium ${valueColor}`}>
        {prefix && `${prefix} `}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

/** A highlighted single-value card (Fondo Inicial, Entradas, Salidas) */
function SummaryCard({
  icon: Icon,
  label,
  value,
  bgColor,
  borderColor,
  textColor,
  iconColor,
}: SummaryCardProps) {
  return (
    <div
      className={`p-3 rounded-lg ${bgColor} border ${borderColor} flex justify-between items-center`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <span className={`text-md font-bold ${textColor}`}>{label}</span>
      </div>
      <span className={`text-2xl font-bold ${textColor}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

interface TotalBreakdownCardProps {
  icon: LucideIcon;
  title: string;
  total: number;
  breakdown: { label: string; value: number; prefix: "+" | "-" }[];
  borderColor: string;
  bgColor: string;
  textColor: string;
  breakdownTextColor: string;
}

/** Reusable card for Total Efectivo / Total Tarjeta */
function TotalBreakdownCard({
  icon: Icon,
  title,
  total,
  breakdown,
  borderColor,
  bgColor,
  textColor,
  breakdownTextColor,
}: TotalBreakdownCardProps) {
  return (
    <div className={`rounded-lg border-2 ${borderColor} overflow-hidden`}>
      <div className={`px-3 py-2 ${bgColor} flex justify-between items-center`}>
        <div className="flex items-center gap-1.5">
          <Icon className={`h-5 w-5 ${textColor}`} />
          <span className={`text-md font-bold ${textColor}`}>{title}</span>
        </div>
        <span className={`text-2xl font-bold ${textColor}`}>
          {formatCurrency(total)}
        </span>
      </div>
      <div className={`p-2 space-y-1 text-md ${breakdownTextColor}`}>
        {breakdown.map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span>{row.label}</span>
            <span className="font-medium">
              {row.prefix} {formatCurrency(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A single movement list item */
function MovementItem({ movement }: { movement: CashMovementDto }) {
  const isIn = movement.type_ === "IN";
  return (
    <div className="p-4 hover:bg-zinc-50 transition-colors">
      <div className="flex items-start justify-between mb-1">
        <Badge
          variant="outline"
          className={
            isIn
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }
        >
          {isIn ? "Entrada" : "Salida"}
        </Badge>
        <span className="text-sm text-zinc-500">
          {format(new Date(movement.created_at), "dd/MM/yyyy")}
          <span className="text-zinc-400 ml-1">
            {format(new Date(movement.created_at), "HH:mm")}
          </span>
        </span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-zinc-700 text-base">
          {movement.concept}
        </span>
        <span
          className={`font-bold text-base ${isIn ? "text-green-600" : "text-red-600"}`}
        >
          {isIn ? "+" : "-"}
          {formatCurrency(movement.amount)}
        </span>
      </div>
      {movement.description && (
        <p className="text-sm text-zinc-500 mt-1 italic line-clamp-2">
          {movement.description}
        </p>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

interface ShiftSummaryProps {
  /** Pass shiftId to let the component fetch its own data. */
  shiftId?: number;
  /** Pass pre-fetched data to skip the internal useQuery (e.g. from a parent modal). */
  data?: ShiftDetailsDto;
  /** When true, hides the right-side movements panel (useful inside modals). */
  compact?: boolean;
}

export function ShiftSummary({
  shiftId,
  data: externalData,
  compact,
}: ShiftSummaryProps) {
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ["shiftDetails", shiftId],
    queryFn: () => getShiftDetails(shiftId!),
    enabled: !externalData && !!shiftId,
    refetchInterval: externalData ? false : 5000,
  });

  const shiftDetails = externalData ?? fetchedData;

  if (!externalData && isLoading)
    return (
      <div className="p-8 text-center text-zinc-400">Cargando detalles...</div>
    );
  if (!shiftDetails)
    return (
      <div className="p-8 text-center text-zinc-400">
        No se encontró información del turno.
      </div>
    );

  const d = shiftDetails;

  /** Lines that compose the theoretical cash breakdown */
  const totalCashBreakdown = [
    {
      label: "Fondo Inicial",
      value: d.shift.initial_cash,
      prefix: "+" as const,
    },
    {
      label: "Ventas Efectivo",
      value: d.total_cash_sales,
      prefix: "+" as const,
    },
    {
      label: "Abonos Efectivo",
      value: d.debt_payments_cash,
      prefix: "+" as const,
    },
    { label: "Entradas", value: d.total_movements_in, prefix: "+" as const },
    { label: "Salidas", value: d.total_movements_out, prefix: "-" as const },
  ];

  const totalCardBreakdown = [
    {
      label: "Ventas Tarjeta",
      value: d.total_card_sales,
      prefix: "+" as const,
    },
    {
      label: "Abonos Tarjeta",
      value: d.debt_payments_card,
      prefix: "+" as const,
    },
  ];

  return (
    <div
      className={`flex ${compact ? "flex-col" : "flex-col md:flex-row"} gap-4 h-full`}
    >
      {/* Left: Stats */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {/* Fondo Inicial — oculto en modo compact */}
        {!compact && (
          <SummaryCard
            icon={Banknote}
            label="Fondo Inicial"
            value={d.shift.initial_cash}
            bgColor="bg-blue-50"
            borderColor="border-blue-100"
            textColor="text-blue-700"
            iconColor="text-blue-500"
          />
        )}

        {/* Ventas + Abonos side by side */}
        <div className="grid grid-cols-2 gap-2">
          {/* Ventas */}
          <div className="rounded-lg border border-zinc-100 overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-zinc-500" />
                <span className="text-md font-bold text-zinc-700">
                  Ventas ({d.sales_count})
                </span>
              </div>
              <span className="text-2xl font-bold text-zinc-700">
                {formatCurrency(d.total_sales)}
              </span>
            </div>
            <div className="p-2 space-y-1">
              <StatRow
                icon={Banknote}
                label="Efectivo"
                value={d.total_cash_sales}
              />
              <StatRow
                icon={CreditCard}
                label="Tarjeta"
                value={d.total_card_sales}
              />
              <StatRow
                icon={HandCoins}
                label="Crédito"
                value={d.total_credit_sales}
                color="text-amber-600"
              />
              <StatRow
                icon={Ticket}
                label="Vales"
                value={d.total_voucher_sales}
                color="text-purple-600"
              />
            </div>
          </div>

          {/* Abonos */}
          <div className="rounded-lg border border-teal-100 overflow-hidden">
            <div className="px-3 py-2 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-teal-600" />
                <span className="text-md font-bold text-teal-700">Abonos</span>
              </div>
              <span className="text-2xl font-bold text-teal-700">
                {formatCurrency(d.total_debt_payments)}
              </span>
            </div>
            <div className="p-2 space-y-1">
              <StatRow
                icon={Banknote}
                label="Efectivo"
                value={d.debt_payments_cash}
              />
              <StatRow
                icon={CreditCard}
                label="Tarjeta"
                value={d.debt_payments_card}
              />
            </div>
          </div>
        </div>

        {/* Movimientos Manuales — ocultos en modo compact */}
        {!compact && (
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={ArrowDownCircle}
              label="Entradas"
              value={d.total_movements_in}
              bgColor="bg-green-50"
              borderColor="border-green-100"
              textColor="text-green-700"
              iconColor="text-green-500"
            />
            <SummaryCard
              icon={ArrowUpCircle}
              label="Salidas"
              value={d.total_movements_out}
              bgColor="bg-red-50"
              borderColor="border-red-100"
              textColor="text-red-700"
              iconColor="text-red-500"
            />
          </div>
        )}

        {/* Efectivo Teórico / Tarjeta */}
        <div className="grid grid-cols-2 gap-3">
          <TotalBreakdownCard
            icon={Calculator}
            title="Total Efectivo"
            total={d.total_cash}
            breakdown={totalCashBreakdown}
            borderColor="border-zinc-200"
            bgColor="bg-zinc-100"
            textColor="text-zinc-800"
            breakdownTextColor="text-zinc-600"
          />
          <TotalBreakdownCard
            icon={CreditCard}
            title="Total Tarjeta"
            total={d.total_card_sales + d.debt_payments_card}
            breakdown={totalCardBreakdown}
            borderColor="border-purple-200"
            bgColor="bg-purple-100"
            textColor="text-purple-900"
            breakdownTextColor="text-purple-700"
          />
        </div>
        {d.shift.status == "closed" && (
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={Wallet}
              label="Retiro de Caja"
              value={d.shift.cash_withdrawal || 0}
              bgColor="bg-emerald-50"
              borderColor="border-emerald-100"
              textColor="text-emerald-700"
              iconColor="text-emerald-500"
            />
            {d.shift.notes && d.shift.notes.trim().length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-[#fffdf5] p-3 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span className="text-md font-bold text-amber-900">
                    Comentarios
                  </span>
                </div>
                <p
                  className="text-sm text-amber-800 line-clamp-2"
                  title={d.shift.notes}
                >
                  {d.shift.notes}
                </p>
              </div>
            ) : null}
          </div>
        )}
        {/* ── Retirar Efectivo (full width, siempre visible) ── */}
        {d.shift.status == "open" && compact &&
          (() => {
            const withdrawal = d.total_cash - d.shift.initial_cash;
            return (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-emerald-100">
                    <Wallet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-md font-bold text-emerald-700 uppercase tracking-wider leading-none">
                      Retirar Efectivo
                    </p>
                  </div>
                </div>
                <span className="text-3xl font-black text-emerald-800 tabular-nums">
                  {formatCurrency(withdrawal)}
                </span>
              </div>
            );
          })()}
      </div>

      {/* Right: Movements List — hidden in compact mode */}
      {!compact && (
        <div className="w-full md:w-[350px] flex flex-col bg-zinc-50/30 border rounded-lg overflow-hidden md:h-auto md:max-h-[calc(100vh-200px)]">
          <div className="p-3 border-b text-base font-medium text-zinc-500 bg-white">
            Movimientos (Entradas y Salidas) ({d.movements.length})
          </div>
          <ScrollArea className="flex-1 bg-white">
            <div className="divide-y divide-zinc-100">
              {d.movements.map((move) => (
                <MovementItem key={move.id} movement={move} />
              ))}
              {d.movements.length === 0 && (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  No hay movimientos registrados
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
