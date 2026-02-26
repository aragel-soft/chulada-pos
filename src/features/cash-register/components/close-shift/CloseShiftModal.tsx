import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Scissors, Wallet, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getShiftDetails } from "@/lib/api/cash-register/details";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { closeShiftSchema } from "@/features/cash-register/schemas/closeShiftSchema";
import { z } from "zod";

type CloseShiftFormValues = z.output<typeof closeShiftSchema>;
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { printShiftTicket } from "@/lib/api/printers";
import { toast } from "sonner";
import { ShiftSummary } from "@/features/cash-register/components/ShiftSummary";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CloseShiftModalProps {
  shiftId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CloseShiftModal({ shiftId, isOpen, onClose }: CloseShiftModalProps) {
  const [sessionKey, setSessionKey] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const { closeShift } = useCashRegisterStore();
  const { user } = useAuthStore();

  const { data: details, isLoading } = useQuery({
    queryKey: ["shiftDetails", shiftId, "close-modal"],
    queryFn: () => getShiftDetails(shiftId),
    enabled: isOpen && !!shiftId,
  });

  const cashWithdrawal =
    (details?.total_cash_sales ?? 0) +
    (details?.debt_payments_cash ?? 0) +
    (details?.total_movements_in ?? 0) -
    (details?.total_movements_out ?? 0);


  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema) as any,
    defaultValues: {
      terminal_cut_confirmed: undefined as any,
      notes: "",
    },
  });

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      reset({ terminal_cut_confirmed: undefined, notes: "" });
      setSessionKey((prev) => prev + 1);
      setShowConfirm(false);
    }
  }, [isOpen, reset]);

  const onSubmit = (_values: CloseShiftFormValues) => {
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!user?.id) return;
    const notes = watch("notes");
    setIsClosing(true);
    try {
      const closed = await closeShift({ notes: notes || undefined }, user.id);
      toast.success("Turno cerrado correctamente", {
        description: `Folio: ${closed.code ?? "—"}`,
      });
      // Print the closing ticket (best-effort, don't block on failure)
      printShiftTicket(closed.id).catch(() => {});
      onClose();
    } catch (err) {
      toast.error("Error al cerrar el turno", { description: String(err) });
    } finally {
      setIsClosing(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0"
          key={sessionKey}
        >
          {/* ── Header ── */}
          <div className="p-4 border-b bg-background shrink-0">
            <DialogHeader className="flex flex-row items-center gap-4 space-y-0 justify-between">
              <div className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-full bg-purple-50 shrink-0">
                  <Scissors className="h-5 w-5 text-purple-800" />
                </div>
                <div className="flex flex-col">
                  <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                    Realizar Corte de Caja
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Revisa los montos y confirma el cierre del turno
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* ── Content ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-4">
                {isLoading && (
                  <div className="h-48 flex items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando datos del turno...
                  </div>
                )}

                {!isLoading && details && (
                  <ShiftSummary data={details} compact />
                )}
              </div>
            </ScrollArea>

            {/* ── Footer form ── */}
            <div className="border-t p-4 bg-background shrink-0 space-y-4">
              {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notas del cierre <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <textarea
                    id="notes"
                    placeholder="Ej: Se detectó inconsistencia en el efectivo al retirar..."
                    rows={2}
                    className="w-full resize-none text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    {...register("notes")}
                  />
                </div>

              {/* Checkbox + Submit row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Controller
                    name="terminal_cut_confirmed"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="terminal_cut_confirmed"
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? true : undefined)
                        }
                        className="mt-0.5"
                      />
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label
                      htmlFor="terminal_cut_confirmed"
                      className="text-sm font-medium cursor-pointer leading-snug"
                    >
                      Confirmo que realicé el corte físico de la terminal bancaria
                    </Label>
                    {errors.terminal_cut_confirmed && (
                      <p className="text-xs text-destructive">
                        {errors.terminal_cut_confirmed.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isClosing}
                  className="bg-[#480489] hover:bg-[#5a0aa0] text-white shrink-0 px-6"
                >
                  Confirmar Cierre de Turno
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar el turno definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará el turno actual. No podrás revertirlo ni registrar
              nuevas ventas en este turno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isClosing}
              className="bg-[#480489] hover:bg-[#5a0aa0]"
            >
              {isClosing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cerrando...</>
              ) : (
                "Sí, Cerrar Turno"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
