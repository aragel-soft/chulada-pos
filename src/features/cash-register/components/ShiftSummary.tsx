import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AppAvatar } from "@/components/ui/app-avatar";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { format } from "date-fns";

interface ShiftSummaryProps {
  shiftId: number;
}

export function ShiftSummary({ shiftId }: ShiftSummaryProps) {
  const { data: shiftDetails, isLoading } = useQuery({
    queryKey: ["shiftDetails", shiftId],
    queryFn: () => getShiftDetails(shiftId),
    enabled: !!shiftId,
    refetchInterval: 5000, // Update every 5 seconds for real-time monitoring
  });

  if (isLoading) return <div>Cargando detalles...</div>;
  if (!shiftDetails) return <div>No se encontró información del turno.</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left: Stats */}
      <div className="flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-4 rounded-lg bg-zinc-50 border border-zinc-100 flex justify-between items-center">
            <div>
              <span className="text-sm text-zinc-500 block">Fecha Apertura</span>
              <div className="font-medium">
                {format(new Date(shiftDetails.shift.opening_date), "dd MMMM yyyy, HH:mm:ss")}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-zinc-500 block mb-1">Abierto por</span>
              <Button
                variant="outline"
                className="flex items-center gap-3 h-auto py-1.5 pl-1.5 pr-3 rounded-full border-gray-200 bg-white hover:bg-gray-50"
              >
                <AppAvatar
                  name={shiftDetails.shift.opening_user_name || 'Usuario'}
                  path={shiftDetails.shift.opening_user_avatar}
                  className="h-8 w-8"
                />
                <span className="hidden md:block font-medium text-zinc-700">
                  {shiftDetails.shift.opening_user_name || "Usuario Desconocido"}
                </span>
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <span className="text-sm text-blue-600 font-medium">Fondo Inicial</span>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(shiftDetails.shift.initial_cash)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
            <span className="text-sm text-indigo-600 font-medium">Ventas Totales</span>
            <div className="text-2xl font-bold text-indigo-700">
              {formatCurrency(shiftDetails.total_sales)}
            </div>
             <div className="text-xs text-indigo-400 mt-1 flex gap-2">
                <span>Efe: {formatCurrency(shiftDetails.total_cash)}</span>
                <span>Tar: {formatCurrency(shiftDetails.total_card)}</span>
             </div>
          </div>

          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <span className="text-sm text-green-600 font-medium">Entradas (Movs)</span>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(shiftDetails.total_movements_in)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-50 border border-red-100">
            <span className="text-sm text-red-600 font-medium">Salidas (Movs)</span>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(shiftDetails.total_movements_out)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 font-medium">
            <span>Efectivo Teórico en Caja</span>
            <span className="text-xl">{formatCurrency(shiftDetails.theoretical_cash)}</span>
          </div>
          <div className="text-xs text-zinc-400 px-3">
            (Inicial + Ventas Efectivo + Entradas - Salidas)
          </div>
          
          {shiftDetails.shift.status === 'closed' && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 font-medium border border-purple-100 text-purple-900 mt-4">
              <span>Cierre Real</span>
              <span className="text-xl">{formatCurrency(shiftDetails.shift.final_cash || 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Movements List */}
      <div className="w-full md:w-[350px] flex flex-col bg-zinc-50/30 border rounded-lg overflow-hidden h-[500px]">
        <div className="p-3 border-b text-sm font-medium text-zinc-500 bg-white">
          Movimientos ({shiftDetails.movements.length})
        </div>
        <ScrollArea className="flex-1 bg-white">
          <div className="divide-y divide-zinc-100">
            {shiftDetails.movements.map((move) => (
              <div key={move.id} className="p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <Badge variant="outline" className={`
                    ${move.type_ === 'IN'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'}
                  `}>
                    {move.type_ === 'IN' ? 'Entrada' : 'Salida'}
                  </Badge>
                  <span className="text-xs text-zinc-400">
                    {format(new Date(move.created_at), "HH:mm")}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-zinc-700">{move.concept}</span>
                  <span className={`font-bold ${move.type_ === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                    {move.type_ === 'IN' ? '+' : '-'}{formatCurrency(move.amount)}
                  </span>
                </div>
                {move.description && (
                  <p className="text-xs text-zinc-500 mt-1 italic line-clamp-2">
                    {move.description}
                  </p>
                )}
              </div>
            ))}
            {shiftDetails.movements.length === 0 && (
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
