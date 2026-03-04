import { useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useOutOfStockWarningStore } from "../stores/outOfStockWarningStore";

export function OutOfStockWarningModal() {
  const { isOpen, productName, closeWarning } = useOutOfStockWarningStore();

  // Permite cerrar la modal rápidamente con la tecla Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Enter") {
        e.preventDefault();
        closeWarning();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeWarning]);

  return (
    <AlertDialog open={isOpen} onOpenChange={closeWarning}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="flex flex-col items-center justify-center gap-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <AlertDialogTitle className="text-xl text-center">
            Inventario Insuficiente
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base space-y-2">
            <p>
              Estás agregando <strong>{productName}</strong> pero no hay suficiente stock.
            </p>
            <p className="text-sm text-zinc-500">
              El inventario se registrará en negativo para no detener la venta.
              Recuerda realizar un ajuste de inventario después.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center mt-4">
          <AlertDialogAction 
            onClick={closeWarning}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-8"
          >
            Entendido (Enter)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
