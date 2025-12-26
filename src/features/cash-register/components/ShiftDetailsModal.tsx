
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { getShiftDetails, getClosedShifts } from "@/lib/api/cash-register/details";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, Printer } from "lucide-react";

export function ShiftDetailsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { shift, closeShift } = useCashRegisterStore();
  const { user } = useAuthStore();
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && shift) {
      setSelectedShiftId(shift.id); // Default to active shift
    }
  }, [isOpen, shift]);

  const { data: shiftDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["shiftDetails", selectedShiftId],
    queryFn: () => getShiftDetails(selectedShiftId!),
    enabled: !!selectedShiftId && isOpen,
  });

  const { data: pastShifts } = useQuery({
    queryKey: ["closedShifts"],
    queryFn: () => getClosedShifts(5, 0),
    enabled: isOpen,
  });

  const calculateTheoreticalCash = () => {
    if (!shiftDetails) return 0;
    return shiftDetails.shift.initial_cash + shiftDetails.total_movements_in - shiftDetails.total_movements_out;
  };

  const isCurrentShift = shift && shiftDetails?.shift.id === shift.id;

  const [closingCash, setClosingCash] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const onConfirmClose = async () => {
    if (!shift || !user?.id) return;
    setIsClosing(true);
    try {
      const finalCash = parseFloat(closingCash);
      if (isNaN(finalCash) || finalCash < 0) {
        alert("Por favor ingrese un monto válido");
        setIsClosing(false);
        return;
      }
      await closeShift(finalCash, user.id);
      setShowCloseConfirm(false);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error al cerrar caja: " + String(e));
    } finally {
      setIsClosing(false);
    }
  };

  const handleOpenCloseConfirm = () => {
    setClosingCash("");
    setShowCloseConfirm(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b shrink-0 bg-zinc-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <History className="w-6 h-6 text-[#480489]" />
              </div>
              <div>
                <DialogTitle className="text-xl">Corte de Caja</DialogTitle>
                <DialogDescription>
                  {shiftDetails?.shift.code || `Turno #${shiftDetails?.shift.id}`}
                  {isCurrentShift && " (Actual)"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={selectedShiftId?.toString()}
                onValueChange={(v) => setSelectedShiftId(Number(v))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Historial..." />
                </SelectTrigger>
                <SelectContent>
                  {shift && <SelectItem value={shift.id.toString()}>Actual (#{shift.code})</SelectItem>}
                  {pastShifts?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {format(new Date(s.opening_date), "dd MMM HH:mm", { locale: es })} ({s.status === 'closed' ? 'Cerrado' : 'Abierto'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Summary */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-zinc-100">
            {isDetailsLoading ? (
              <div className="flex items-center justify-center h-full">Cargando...</div>
            ) : shiftDetails ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 p-4 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-sm text-zinc-500">Fecha Apertura</span>
                    <div className="font-medium">
                      {format(new Date(shiftDetails.shift.opening_date), "dd MMMM yyyy, HH:mm:ss", { locale: es })}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="text-sm text-blue-600 font-medium">Fondo Inicial</span>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatCurrency(shiftDetails.shift.initial_cash)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-100 border border-zinc-200 opacity-70">
                    <span className="text-sm text-zinc-600 font-medium">Ventas (Total)</span>
                    <div className="text-2xl font-bold text-zinc-700">
                      $0.00*
                    </div>
                    <span className="text-[10px] text-zinc-400">*Pendiente integración de ventas</span>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                    <span className="text-sm text-green-600 font-medium">Entradas</span>
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(shiftDetails.total_movements_in)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                    <span className="text-sm text-red-600 font-medium">Salidas</span>
                    <div className="text-2xl font-bold text-red-700">
                      {formatCurrency(shiftDetails.total_movements_out)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 font-medium">
                    <span>Efectivo Teórico</span>
                    <span className="text-xl">{formatCurrency(calculateTheoreticalCash())}</span>
                  </div>
                  {shiftDetails.shift.status === 'closed' && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 font-medium border border-purple-100 text-purple-900">
                      <span>Cierre Real</span>
                      <span className="text-xl">{formatCurrency(shiftDetails.shift.final_cash || 0)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: Movements List */}
          <div className="w-[350px] flex flex-col bg-zinc-50/30">
            <div className="p-3 border-b text-sm font-medium text-zinc-500 bg-white">
              Movimientos ({shiftDetails?.movements.length || 0})
            </div>
            <ScrollArea className="flex-1 bg-white">
              <div className="divide-y divide-zinc-100">
                {shiftDetails?.movements.map((move) => (
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
                      <span className="font-medium text-zinc-700">{move.reason}</span>
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
                {shiftDetails?.movements.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 text-sm">
                    No hay movimientos registrados
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-white flex justify-between items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Reporte
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar Ventana</Button>
            {isCurrentShift && (
              <Button className="bg-[#480489] hover:bg-[#360368]" onClick={handleOpenCloseConfirm}>
                Realizar Corte de Caja (Cerrar)
              </Button>
            )}
          </div>
        </DialogFooter>

        {showCloseConfirm && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b bg-zinc-50">
                <h3 className="font-bold text-lg">Confirmar Corte</h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-zinc-600">
                  Ingrese el efectivo real contado en caja para cerrar el turno.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Teórico:</span>
                    <span className="font-bold">{formatCurrency(calculateTheoreticalCash())}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#480489] focus:outline-none"
                      placeholder="0.00"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2 bg-zinc-50">
                <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>Cancelar</Button>
                <Button
                  className="bg-[#480489] hover:bg-[#360368]"
                  onClick={onConfirmClose}
                  disabled={isClosing || !closingCash}
                >
                  {isClosing ? "Cerrando..." : "Confirmar Cierre"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
