import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, AlertCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [errorList, setErrorList] = useState<string[]>([]);
  const isPlural = customerIds.length > 1;

  useEffect(() => {
    if (open) {
      setErrorList([]);
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

      if (msg.includes("saldo pendiente")) {
        const rawList = msg.split("saldo pendiente:")[1] || "";
        
        const list = rawList
          .split(",")
          .map(s => s.trim())
          .filter(s => s.length > 0);

        setErrorList(list);
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
  if (errorList.length > 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {isPlural ? "No se pudieron eliminar clientes" : "No se pudo eliminar al cliente"}
            </DialogTitle>
            <DialogDescription>
              {isPlural 
                ? "La operación fue cancelada porque uno o más clientes seleccionados tienen saldo pendiente."
                : "La operación fue cancelada porque el cliente seleccionado tiene saldo pendiente."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <Alert variant="destructive" className="mb-4 bg-destructive/10 text-destructive border-destructive/20">
              <AlertTitle className="font-semibold">Operación Cancelada</AlertTitle>
              <AlertDescription>
                {isPlural
                  ? "Ningún cliente fue eliminado. Por favor asegúrate que el saldo esté en $0.00 antes de intentar borrar."
                  : "El cliente no fue eliminado. Por favor asegúrate que el saldo esté en $0.00 antes de intentar borrar."}
              </AlertDescription>
            </Alert>
            
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/50">
              <ul className="space-y-3 text-sm text-muted-foreground">
                {errorList.map((err, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                    <span className="font-medium text-foreground/80">{err}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="default">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // CASE 2: NORMAL CONFIRMATION
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            <AlertDialogTitle>
              {isPlural ? "¿Eliminar clientes seleccionados?" : "¿Eliminar cliente?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Estás a punto de eliminar <b>{isPlural ? `${customerIds.length} clientes` : "a este cliente"}</b>.
            <br className="mb-2"/>
            Esta acción realizará un <b>borrado lógico</b>. {isPlural ? "Los clientes dejarán" : "El cliente dejará"} de estar {isPlural ? "visibles" : "visible"}, pero su historial financiero se conservará.
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
              isPlural ? "Sí, Eliminar Todo" : "Sí, Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
