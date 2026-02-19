
import { useState } from "react";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { AppAvatar } from "@/components/ui/app-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { OpenShiftModal } from "@/features/cash-register/components/OpenShiftModal";
import { ShiftSummary } from "@/features/cash-register/components/ShiftSummary";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CurrentShiftPage() {
  const { shift, closeShift, isLoading } = useCashRegisterStore();
  const { user, can } = useAuthStore();

  // Close Shift Form State
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [finalCash, setFinalCash] = useState<string>("");
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseShift = async () => {
    if (!user?.id || !shift) return;

    const amount = parseFloat(finalCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("Por favor ingrese un monto válido.");
      return;
    }

    setIsClosing(true);
    try {
      await closeShift(amount, user.id);
      toast.success("Caja cerrada correctamente.");
      setIsCloseDialogOpen(false);
      setFinalCash("");
    } catch (error) {
      toast.error("Error al cerrar caja", { description: String(error) });
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin mr-2" /> Cargando información de caja...</div>;
  }

  if (!shift || shift.status === 'closed') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-zinc-50/50 border rounded-lg shadow-sm ring-1 ring-zinc-950/5">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm">
            <Lock className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900">Caja Cerrada</h3>
          <p className="text-zinc-500">No hay un turno activo en este momento. Para ver información, inicia un nuevo turno o consulta el historial.</p>
          {can('cash_register:open') && (
            <OpenShiftModal trigger={<Button size="lg" className="mt-4 bg-[#480489] hover:bg-[#360368]">Abrir Nuevo Turno</Button>} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg bg-white shadow-sm ring-1 ring-zinc-950/5 overflow-hidden">
      <div className="px-6 py-3 border-b flex justify-between items-center bg-zinc-50/30">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold text-lg">Turno Activo #{shift.code || shift.id}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(shift.opening_date), "dd MMM yyyy, HH:mm")}
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
            En Curso
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           {can('cash_register:close') && (
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Lock className="mr-2 h-4 w-4" /> Realizar Corte
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-zinc-900" />
                    Confirmar Cierre de Turno
                  </DialogTitle>
                  <DialogDescription>
                    Ingrese el monto total de efectivo contado en caja.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="final-cash">Efectivo Final (Real)</Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-500 font-bold text-lg">$</span>
                      <Input
                        id="final-cash"
                        className="pl-8 text-lg font-medium"
                        type="number"
                        step="0.5"
                        value={finalCash}
                        onChange={(e) => setFinalCash(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>Cancelar</Button>
                  <Button
                    className="bg-[#480489] hover:bg-[#360368] text-white"
                    onClick={handleCloseShift}
                    disabled={isClosing || !finalCash}
                  >
                    {isClosing ? "Cerrando..." : "Confirmar y Cerrar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
           )}

          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-1 pl-1 pr-2.5 rounded-full border-gray-200 bg-white hover:bg-gray-50 cursor-default"
          >
            <AppAvatar
              name={shift.opening_user_name || "Usuario"}
              path={shift.opening_user_avatar}
              className="h-7 w-7"
            />
            <span className="text-sm font-medium text-zinc-700">
              {shift.opening_user_name || "Desconocido"}
            </span>
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-6 bg-white">
        <ShiftSummary shiftId={shift.id} />
      </div>
    </div>
  );
}
