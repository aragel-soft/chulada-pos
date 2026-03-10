import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  CalendarDays,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppAvatar } from "@/components/ui/app-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { printShiftTicket } from "@/lib/api/printers";

import { useAuthStore } from "@/stores/authStore";
import { ShiftSummary } from "@/features/cash-register/components/ShiftSummary";

// ── Helpers ─────────────────────────────────────────────────────
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
        "flex justify-between items-center",
        bold && "font-semibold",
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className={cn("h-4 w-4", iconColor || "text-zinc-500")} />
        )}
        <span
          className={cn(
            "text-zinc-600",
            large ? "text-sm text-zinc-700" : "text-sm",
          )}
        >
          {label}
        </span>
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
          !highlight && bold && "text-zinc-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────
export default function ShiftDetailPage() {
  const { can } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const shiftId = Number(id);
  const {
    data: details,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shiftDetails", shiftId],
    queryFn: () => getShiftDetails(shiftId),
    enabled: !!id,
  });
  const [isPrinting, setIsPrinting] = useState(false);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  };

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
        <p className="text-lg text-zinc-800">
          No se pudo cargar la información del turno.
        </p>
        <p className="text-sm">
          {error ? String(error) : "Turno no encontrado."}
        </p>
        <Button onClick={() => navigate('/cash-register/history')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
        </Button>
      </div>
    );
  }

  const { shift } = details;
  const isClosed = shift.status === "closed";

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b px-6 py-2 bg-white shadow-sm shrink-0 mt-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/cash-register/history')}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          <div className="h-10 w-10 rounded-full bg-[#480489]/10 flex items-center justify-center text-[#480489] shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-xl font-bold tracking-tight text-gray-900">
                Detalle de Turno
              </h1>
              <Badge
                className={cn(
                  "px-3 py-1 text-sm font-medium",
                  isClosed
                    ? "bg-slate-500 hover:bg-slate-600"
                    : "bg-emerald-500 hover:bg-emerald-600",
                )}
              >
                {isClosed ? "Cerrado" : "Abierto"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="font-mono text-base font-medium text-zinc-700">
                Folio: {shift.code || "S/F"}
              </span>
            </div>
          </div>

          {isClosed && can("cash_register:close") && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setIsPrinting(true);
                  await printShiftTicket(shift.id);
                } catch (err) {
                } finally {
                  setIsPrinting(false);
                }
              }}
              disabled={isPrinting}
              className="ml-4 gap-2 h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {isPrinting ? "Imprimiendo..." : "Imprimir Corte"}
            </Button>
          )}
        </div>

        {/* Users Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-6 bg-white shrink-0">
          <div>
            <SummaryRow
              label="Apertura"
              value={formatDateLabel(shift.opening_date)}
              large
            />
            <SummaryRow
              label="Apertura por"
              value={
                <div className="ml-2 flex items-center gap-2 justify-end">
                  <AppAvatar
                    path={shift.opening_user_avatar || ""}
                    name={shift.opening_user_name || "U"}
                    className="h-7 w-7"
                  />
                  <span>
                    {shift.opening_user_name || shift.opening_user_id}
                  </span>
                </div>
              }
              large
              bold
            />
          </div>
          <div>
            <SummaryRow
              label="Cierre"
              value={formatDateLabel(shift.closing_date)}
              large
            />
            <SummaryRow
              label="Cierre por"
              value={
                shift.status === "closed" ? (
                  <div className="ml-2 flex items-center gap-2 justify-end">
                    <AppAvatar
                      path={shift.closing_user_avatar || ""}
                      name={shift.closing_user_name || "U"}
                      className="h-7 w-7"
                    />
                    <span>
                      {shift.closing_user_name || shift.closing_user_id}
                    </span>
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
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <ShiftSummary shiftId={shift.id} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Cash Withdrawals */}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
