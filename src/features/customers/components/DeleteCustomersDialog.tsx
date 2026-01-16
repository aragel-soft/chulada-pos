import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Ban } from "lucide-react";
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
import { deleteCustomers } from "@/lib/api/customers";

interface DeleteCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerIds: string[]; 
  onSuccess?: () => void;
}

export function DeleteCustomersDialog({
  open,
  onOpenChange,
  customerIds,
  onSuccess,
}: DeleteCustomersDialogProps) {
  const queryClient = useQueryClient();
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrorDetails(null);
    }
  }, [open, customerIds]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomers(customerIds),
    onSuccess: () => {
      toast.success(
        customerIds.length === 1 
          ? "Cliente eliminado correctamente" 
          : `${customerIds.length} clientes eliminados correctamente`
      );
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const msg = typeof error === "string" 
        ? error 
        : (error instanceof Error ? error.message : "Error desconocido");

      if (msg.includes("saldo pendiente") || msg.includes("Operación cancelada")) {
        setErrorDetails(msg);
      } else {
        toast.error(`Error al eliminar: ${msg}`);
        onOpenChange(false);
      }
    },
  });

  const handleConfirm = () => {
    deleteMutation.mutate();
  };

  // --- CONDITIONAL RENDERING ---

  // CASE 1: BLOCK BY DEBTORS
  if (errorDetails) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-lg border-l-4 border-l-destructive">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              <AlertDialogTitle>No se puede eliminar</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 whitespace-pre-line text-foreground">
              {errorDetails}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => onOpenChange(false)}
            >
              Entendido
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // CASE 2: NORMAL CONFIRMATION
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Estás a punto de eliminar <b>{customerIds.length}</b> cliente(s).
            <br className="mb-2"/>
            Esta acción realizará un <i>borrado lógico</i>. Los clientes dejarán de estar visibles, pero su historial financiero se conservará en la base de datos por seguridad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault(); 
              handleConfirm();
            }}
            disabled={deleteMutation.isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Sí, Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}