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
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteCategoryErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: string[];
}

export function DeleteCategoryErrorModal({
  open,
  onOpenChange,
  errors
}: DeleteCategoryErrorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            No se pudieron eliminar algunas categorías
          </DialogTitle>
          <DialogDescription>
            La operación fue cancelada porque una o más categorías tienen dependencias.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Operación Cancelada</AlertTitle>
            <AlertDescription>
              Ninguna categoría fue eliminada. Por favor resuelve los conflictos e intenta de nuevo.
            </AlertDescription>
          </Alert>
          <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/50">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {errors.map((err, index) => (
                <li key={index} className="flex gap-2 items-start">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
