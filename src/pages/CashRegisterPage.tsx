import { useState } from "react";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { OpenShiftModal } from "@/features/cash-register/components/OpenShiftModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CashRegisterPage() {
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
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Corte de Caja</h1>
          <p className="text-muted-foreground">Administración de turnos y efectivo.</p>
        </div>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>Caja Cerrada</CardTitle>
            <CardDescription>No hay un turno activo en este momento.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            {can('cash_register:open') && (
              <OpenShiftModal trigger={<Button size="lg">Abrir Nuevo Turno</Button>} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Corte de Caja</h1>
        <p className="text-muted-foreground">Turno {shift.code ? `#${shift.code}` : `#${shift.id}`} en curso.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Turno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Inicio de Turno</span>
              <span className="font-medium">{new Date(shift.opening_date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Fondo Inicial</span>
              <span className="font-medium text-green-600">${shift.initial_cash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Usuario Apertura</span>
              <span className="font-medium">{shift.opening_user_id}</span> {/* Could fetch name if needed */}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-bold text-green-600 uppercase">{shift.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
            <CardDescription>Opciones disponibles para el turno actual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
              {can('cash_register:close') && (
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Lock className="mr-2 h-4 w-4" /> Cerrar Caja
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-zinc-900" />
                    Cerrar Turno
                  </DialogTitle>
                  <DialogDescription>
                    Ingrese el monto total de efectivo en caja para finalizar el turno.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="final-cash">Efectivo Final (Declarado)</Label>
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
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>Cancelar</Button>
                  <Button
                    className="bg-[#480489] hover:bg-[#360368] text-white"
                    onClick={handleCloseShift}
                    disabled={isClosing}
                  >
                    {isClosing ? "Cerrando..." : "Confirmar Cierre"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
