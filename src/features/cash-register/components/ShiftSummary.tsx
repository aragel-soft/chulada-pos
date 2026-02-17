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
  type LucideIcon,
} from "lucide-react";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { format } from "date-fns";
import type { CashMovementDto } from "@/types/cast-cut";

// ── Reusable helpers ─────────────────────────────────────────────

interface StatRowProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: string;
  prefix?: "+" | "-";
}

/** A single row: icon + label ···· formatted value */
function StatRow({ icon: Icon, label, value, color = "text-zinc-500", prefix }: StatRowProps) {
  const valueColor = color === "text-zinc-500" ? "text-zinc-700" : color;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={`${color} flex items-center gap-1.5`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={`font-medium ${valueColor}`}>
        {prefix && `${prefix} `}{formatCurrency(value)}
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
function SummaryCard({ icon: Icon, label, value, bgColor, borderColor, textColor, iconColor }: SummaryCardProps) {
  return (
    <div className={`p-4 rounded-lg ${bgColor} border ${borderColor} flex justify-between items-center`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      </div>
      <span className={`text-xl font-bold ${textColor}`}>
        {formatCurrency(value)}
      </span>
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
          className={isIn
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-red-50 text-red-700 border-red-200"
          }
        >
          {isIn ? "Entrada" : "Salida"}
        </Badge>
        <span className="text-xs text-zinc-400">
          {format(new Date(movement.created_at), "HH:mm")}
        </span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-zinc-700">{movement.concept}</span>
        <span className={`font-bold ${isIn ? "text-green-600" : "text-red-600"}`}>
          {isIn ? "+" : "-"}{formatCurrency(movement.amount)}
        </span>
      </div>
      {movement.description && (
        <p className="text-xs text-zinc-500 mt-1 italic line-clamp-2">
          {movement.description}
        </p>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

interface ShiftSummaryProps {
  shiftId: number;
}

export function ShiftSummary({ shiftId }: ShiftSummaryProps) {
  const { data: shiftDetails, isLoading } = useQuery({
    queryKey: ["shiftDetails", shiftId],
    queryFn: () => getShiftDetails(shiftId),
    enabled: !!shiftId,
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="p-8 text-center text-zinc-400">Cargando detalles...</div>;
  if (!shiftDetails) return <div className="p-8 text-center text-zinc-400">No se encontró información del turno.</div>;

  const d = shiftDetails;

  /** Lines that compose the theoretical cash breakdown */
  const theoreticalBreakdown = [
    { label: "Fondo Inicial", value: d.shift.initial_cash, prefix: "+" as const },
    { label: "Ventas Efectivo", value: d.total_cash, prefix: "+" as const },
    { label: "Abonos Efectivo", value: d.debt_payments_cash, prefix: "+" as const },
    { label: "Entradas", value: d.total_movements_in, prefix: "+" as const },
    { label: "Salidas", value: d.total_movements_out, prefix: "-" as const },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left: Stats */}
      <div className="flex-1 space-y-5 overflow-y-auto">
        {/* Fondo Inicial */}
        <SummaryCard
          icon={Banknote} label="Fondo Inicial" value={d.shift.initial_cash}
          bgColor="bg-blue-50" borderColor="border-blue-100"
          textColor="text-blue-700" iconColor="text-blue-500"
        />

        {/* Ventas + Abonos side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ventas */}
          <div className="rounded-lg border border-zinc-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-600">Ventas</span>
            </div>
            <div className="p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Total</span>
                <span className="font-bold text-zinc-800">{formatCurrency(d.total_sales)}</span>
              </div>
              <div className="h-px bg-zinc-100" />
              <StatRow icon={Banknote} label="Efectivo" value={d.total_cash} />
              <StatRow icon={CreditCard} label="Tarjeta" value={d.total_card} />
              <StatRow icon={HandCoins} label="Crédito" value={d.total_credit} color="text-amber-600" />
            </div>
          </div>

          {/* Abonos */}
          <div className="rounded-lg border border-teal-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-700">Abonos</span>
              </div>
              <span className="font-bold text-teal-700">{formatCurrency(d.total_debt_payments)}</span>
            </div>
            <div className="p-3 space-y-1.5">
              <StatRow icon={Banknote} label="Efectivo" value={d.debt_payments_cash} />
              <StatRow icon={CreditCard} label="Tarjeta" value={d.debt_payments_card} />
            </div>
          </div>
        </div>

        {/* Movimientos Manuales */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={ArrowDownCircle} label="Entradas" value={d.total_movements_in}
            bgColor="bg-green-50" borderColor="border-green-100"
            textColor="text-green-700" iconColor="text-green-500"
          />
          <SummaryCard
            icon={ArrowUpCircle} label="Salidas" value={d.total_movements_out}
            bgColor="bg-red-50" borderColor="border-red-100"
            textColor="text-red-700" iconColor="text-red-500"
          />
        </div>

        {/* Efectivo Teórico + Cierre Real */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border-2 border-zinc-200 overflow-hidden">
            <div className="px-3 py-2.5 bg-zinc-100 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Calculator className="h-5 w-5 text-zinc-600" />
                <span className="font-semibold text-zinc-800">Efectivo Teórico</span>
              </div>
              <span className="text-2xl font-bold text-zinc-900">
                {formatCurrency(d.theoretical_cash)}
              </span>
            </div>
            <div className="p-3 space-y-1 text-sm text-zinc-500 bg-zinc-50">
              {theoreticalBreakdown.map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span>{row.prefix} {formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {d.shift.status === "closed" && (
            <div className="rounded-lg bg-purple-50 border border-purple-100 p-4 flex flex-col justify-center items-center text-purple-900">
              <span className="text-sm font-medium mb-1">Cierre Real</span>
              <span className="text-xl font-bold">{formatCurrency(d.shift.final_cash || 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Movements List */}
      <div className="w-full md:w-[350px] flex flex-col bg-zinc-50/30 border rounded-lg overflow-hidden md:h-auto md:max-h-[calc(100vh-200px)]">
        <div className="p-3 border-b text-sm font-medium text-zinc-500 bg-white">
          Movimientos ({d.movements.length})
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
    </div>
  );
}
