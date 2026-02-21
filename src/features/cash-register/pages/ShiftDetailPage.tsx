import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Wallet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  CalendarDays,
  HandCoins,
  Ticket,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppAvatar } from "@/components/ui/app-avatar";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatCurrency } from "@/lib/utils";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import type { ShiftDetailsDto, CashMovementDto } from "@/types/cast-cut";

// ── Helpers ─────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-base font-medium bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-4 w-4" /> Cuadrada
      </span>
    );
  }
  const isPositive = diff > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-base font-medium",
        isPositive ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      {isPositive ? "Sobrante" : "Faltante"}: {formatCurrency(Math.abs(diff))}
    </span>
  );
}

function SummaryRow({
  icon: Icon,
  iconColor,
  label,
  value,
  bold,
  highlight,
  large,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  value: string | React.ReactNode;
  bold?: boolean;
  highlight?: "emerald" | "red" | "blue" | "amber" | "teal" | "purple";
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-1.5",
        bold && "font-semibold"
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn("h-4 w-4", iconColor || "text-zinc-500")} />}
        <span className={cn("text-zinc-600", large ? "text-sm text-zinc-700" : "text-sm")}>{label}</span>
      </div>
      <span
        className={cn(
          "text-right",
          large ? "text-lg" : "text-base",
          highlight === "emerald" && "text-emerald-700 font-bold",
          highlight === "red" && "text-red-700 font-bold",
          highlight === "blue" && "text-blue-700 font-bold",
          highlight === "amber" && "text-amber-700 font-bold",
          highlight === "teal" && "text-teal-700 font-bold",
          highlight === "purple" && "text-purple-700 font-bold",
          !highlight && bold && "text-zinc-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [details, setDetails] = useState<ShiftDetailsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      setError(null);
      getShiftDetails(Number(id))
        .then(setDetails)
        .catch((err) => setError(String(err)))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const movementsColumns = useMemo<ColumnDef<CashMovementDto>[]>(() => [
    {
      accessorKey: "created_at",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm font-mono">
          {formatDateLabel(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      accessorKey: "type_",
      header: "Tipo",
      cell: ({ row }) => {
        const type = row.getValue("type_") as string;
        const isEntry = type === "IN";
        return (
          <Badge
            variant="outline"
            className={cn(
              "font-medium tracking-wide",
              isEntry
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            )}
          >
            {isEntry ? "Entrada" : "Salida"}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "concept",
      header: "Concepto",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-base text-zinc-900">{row.getValue("concept")}</span>
          {row.original.description && (
            <span className="text-sm text-muted-foreground">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => {
        const type = row.original.type_;
        const amount = row.getValue("amount") as number;
        const isEntry = type === "IN";

        return (
          <div
            className={cn(
              "text-right font-bold text-lg tabular-nums",
              isEntry ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {isEntry ? "+" : "-"}{formatCurrency(amount)}
          </div>
        );
      },
    },
  ], []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-[#480489] mb-4" />
        <p className="text-lg">Cargando detalles del turno...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <AlertTriangle className="h-12 w-12 opacity-50 text-red-500" />
        <p className="text-lg text-zinc-800">No se pudo cargar la información del turno.</p>
        <p className="text-sm">{error || "Turno no encontrado."}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
        </Button>
      </div>
    );
  }

  const { shift, theoretical_cash } = details;
  const isClosed = shift.status === 'closed';
  
  const cashDifference = shift.cash_difference || 0;
  const cardDifference = shift.card_difference || 0;
  const hasDifferences = Math.abs(cashDifference) >= 0.01 || Math.abs(cardDifference) >= 0.01;

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b px-6 py-5 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          <div className="h-14 w-14 rounded-full bg-[#480489]/10 flex items-center justify-center text-[#480489] shrink-0">
            <CalendarDays className="h-7 w-7" />
          </div>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                Detalle de Turno
              </h1>
              <Badge 
                className={cn(
                  "px-3 py-1 text-sm font-medium",
                  isClosed ? "bg-slate-500 hover:bg-slate-600" : "bg-emerald-500 hover:bg-emerald-600"
                )}
              >
                {isClosed ? 'Cerrado' : 'Abierto'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="font-mono text-base font-medium text-zinc-700">
                Folio: {shift.code || "S/F"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {/* Warning Banner IF Differences */}
          {isClosed && (
            <div
              className={cn(
                "rounded-xl border-2 overflow-hidden p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm",
                hasDifferences
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-emerald-200 bg-emerald-50/50"
              )}
            >
              <div className="flex items-center gap-4">
                {hasDifferences ? (
                  <AlertTriangle className="h-10 w-10 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="h-10 w-10 text-emerald-600 shrink-0" />
                )}
                <div>
                  <h3
                    className={cn(
                      "font-bold text-2xl mb-1",
                      hasDifferences ? "text-amber-900" : "text-emerald-900"
                    )}
                  >
                    {hasDifferences ? "Corte con Diferencias" : "Caja Cuadrada Perfecta"}
                  </h3>
                  <p
                    className={cn(
                      "text-base",
                      hasDifferences ? "text-amber-700" : "text-emerald-700"
                    )}
                  >
                    {hasDifferences
                      ? "Se detectaron diferencias monetarias al realizar el cierre de este turno."
                      : "Todos los montos físicos coincidieron exactamente con los montos en sistema."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ── LEFT COLUMN ── */}
            <div className="space-y-6">
              
              {/* General Info */}
              <div className="rounded-xl border border-indigo-100 overflow-hidden bg-white shadow-sm">
                <div className="px-5 py-3.5 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-600" />
                  <span className="text-base font-semibold text-indigo-900">Línea de Tiempo y Personal</span>
                </div>
                <div className="p-5 space-y-2">
                  <SummaryRow label="Apertura" value={formatDateLabel(shift.opening_date)} large />
                  <SummaryRow 
                    label="Usuario de Apertura" 
                    value={
                      <div className="flex items-center gap-2 justify-end">
                        <AppAvatar path={shift.opening_user_avatar || ''} name={shift.opening_user_name || "U"} className="h-7 w-7" />
                        <span>{shift.opening_user_name || shift.opening_user_id}</span>
                      </div>
                    } 
                    large 
                    bold 
                  />
                  <div className="h-px bg-zinc-200 my-4" />
                  <SummaryRow label="Cierre" value={formatDateLabel(shift.closing_date)} large />
                  <SummaryRow 
                    label="Usuario de Cierre" 
                    value={
                      shift.status === 'closed' ? (
                        <div className="flex items-center gap-2 justify-end">
                          <AppAvatar path={shift.closing_user_avatar || ''} name={shift.closing_user_name || "U"} className="h-7 w-7" />
                          <span>{shift.closing_user_name || shift.closing_user_id}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Sin Cerrar</span>
                      )
                    } 
                    large 
                    bold
                  />
                </div>
              </div>

              {/* Cash comparison */}
              <div className="rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
                <div className="px-5 py-3.5 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-emerald-600" />
                  <span className="text-base font-semibold text-emerald-900">Conciliación Fija de Efectivo</span>
                </div>
                <div className="p-5 space-y-2">
                  <SummaryRow icon={Banknote} iconColor="text-blue-500" label="Fondo Inicial (Caja Chica)" value={formatCurrency(shift.initial_cash)} large />
                  <SummaryRow icon={Calculator} label="Efectivo Teórico (Sistema)" value={formatCurrency(theoretical_cash)} large bold />
                  
                  <div className="p-4 my-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <SummaryRow 
                      icon={Wallet}
                      iconColor="text-emerald-500"
                      label="Efectivo Físico Contado" 
                      value={isClosed ? formatCurrency(shift.final_cash || 0) : 'Pendiente'} 
                      large 
                      bold 
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-medium text-zinc-600">Diferencia Total en Efectivo</span>
                    {isClosed ? (
                      <DiffBadge diff={cashDifference} />
                    ) : (
                      <span className="text-lg font-medium text-zinc-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-6">

              {/* Sales Details */}
              <div className="rounded-xl border border-teal-100 overflow-hidden bg-white shadow-sm">
                <div className="px-5 py-3.5 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between">
                  <span className="text-base font-semibold text-teal-900">Resumen Operativo (Ingresos)</span>
                  <Badge variant="outline" className="text-sm bg-white border-teal-200 text-teal-800">{details.sales_count} Tickets emitidos</Badge>
                </div>
                <div className="p-5 space-y-1">
                  <SummaryRow icon={Receipt} label="Ventas Totales" value={formatCurrency(details.total_sales)} large bold highlight="emerald" />
                  
                  <div className="h-px bg-zinc-200 my-4" />
                  
                  <SummaryRow icon={Banknote} label="Ventas Efectivo" value={formatCurrency(details.total_cash_sales)} large />
                  <SummaryRow icon={CreditCard} label="Ventas Tarjeta" value={formatCurrency(details.total_card_sales)} large />
                  <SummaryRow icon={HandCoins} iconColor="text-amber-500" label="Ventas Crédito" value={formatCurrency(details.total_credit_sales)} large highlight="amber" />
                  <SummaryRow icon={Ticket} iconColor="text-purple-500" label="Ventas Vales" value={formatCurrency(details.total_voucher_sales)} large highlight="purple" />
                  
                  <div className="h-px bg-zinc-200 my-4" />
                  
                  <SummaryRow icon={HandCoins} iconColor="text-teal-600" label="Total Abonos" value={formatCurrency(details.total_debt_payments)} large bold highlight="teal" />
                  <SummaryRow icon={Banknote} label="Abonos Efectivo" value={formatCurrency(details.debt_payments_cash)} large />
                  <SummaryRow icon={CreditCard} label="Abonos Tarjeta" value={formatCurrency(details.debt_payments_card)} large />
                </div>
              </div>

              {/* Card comparison */}
              <div className="rounded-xl border border-blue-100 overflow-hidden bg-white shadow-sm">
                <div className="px-5 py-3.5 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="text-base font-semibold text-blue-900">Conciliación Electrónica (Tarjeta)</span>
                </div>
                <div className="p-5 space-y-2">
                  <SummaryRow 
                    icon={CreditCard}
                    label="Ventas y Abonos en Tarjeta (Sistema)" 
                    value={formatCurrency(details.total_card_sales + details.debt_payments_card)} 
                    large 
                    bold 
                  />
                  <SummaryRow 
                    icon={Receipt}
                    label="Voucher Total Registrado (Terminal)" 
                    value={isClosed ? formatCurrency(shift.card_terminal_total || 0) : 'Pendiente'} 
                    large 
                    bold 
                  />
                  <div className="h-px bg-zinc-200 my-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-zinc-600">Diferencia Tarjeta</span>
                    {isClosed ? (
                      <DiffBadge diff={cardDifference} />
                    ) : (
                      <span className="text-lg font-medium text-zinc-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── BOT ROW: Retiro / Notas / Movimientos ── */}

          {/* Cash Withdrawals */}
          {isClosed && (
            <div className="rounded-xl border border-emerald-300 overflow-hidden bg-emerald-50 shadow-sm flex flex-col md:flex-row items-center justify-between p-6 gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <Wallet className="h-7 w-7 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-900">
                    Monto Retirado de Caja
                  </h4>
                  <p className="text-sm text-emerald-700">
                    Dinero retirado físicamente y entregado a administración.
                  </p>
                </div>
              </div>
              <span className="text-4xl font-black text-emerald-800 tabular-nums">
                {formatCurrency(shift.cash_withdrawal || 0)}
              </span>
            </div>
          )}

          {/* Movimientos de Efectivo Table (NEW!) */}
          <div className="rounded-xl border border-violet-100 overflow-hidden bg-white shadow-sm">
            <div className="px-5 py-4 bg-violet-50/50 border-b border-violet-100">
              <h3 className="text-lg font-bold text-violet-900">Desglose de Movimientos de Efectivo Adicionales</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Total Ingresado: <span className="text-emerald-600 font-medium">{formatCurrency(details.total_movements_in)}</span> │ 
                Total Retirado: <span className="text-rose-600 font-medium">{formatCurrency(details.total_movements_out)}</span>
              </p>
            </div>
            <div>
              <DataTable
                columns={movementsColumns}
                data={details.movements || []}
                manualPagination={false}
                manualSorting={false}
                searchPlaceholder="Buscar por concepto o descripción..."
                initialPageSize={16}
              />
            </div>
          </div>

          {/* Notes */}
          {shift.notes && shift.notes.trim().length > 0 && (
            <div className="rounded-xl border border-amber-200 overflow-hidden bg-[#fffdf5] shadow-sm">
              <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-3">
                <FileText className="h-6 w-6 text-amber-600" />
                <h3 className="text-lg font-bold text-amber-900">Comentarios del Cajero</h3>
              </div>
              <div className="p-6">
                <p className="text-base text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {shift.notes}
                </p>
              </div>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
