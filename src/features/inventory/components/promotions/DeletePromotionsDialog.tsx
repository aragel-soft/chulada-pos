import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react"; 
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
import { deletePromotions } from "@/lib/api/inventory/promotions";
import { Promotion } from "@/types/promotions";

interface DeletePromotionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotions: Promotion[];
  onSuccess?: () => void;
}

export function DeletePromotionsDialog({
  open,
  onOpenChange,
  promotions,
  onSuccess,
}: DeletePromotionsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const ids = promotions.map((p) => p.id);
      await deletePromotions(ids);

      toast.success(
        ids.length > 1
          ? "Promociones eliminadas correctamente"
          : "Promoción eliminada correctamente"
      );

      queryClient.invalidateQueries({ queryKey: ["promotions"] });      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar", {
        description: "No se pudieron eliminar las promociones seleccionadas.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!promotions.length) return null;

  const isPlural = promotions.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> 
            <AlertDialogTitle>
              {isPlural ? "¿Eliminar promociones seleccionadas?" : "¿Eliminar promoción?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Estás a punto de eliminar{" "}
              <b>
                {isPlural ? `${promotions.length} promociones` : "esta promoción"}
              </b>.
            </p>
            
            <div className="rounded-md bg-muted/50 p-3 text-sm border">
              <ul className="list-disc list-inside space-y-1 max-h-[100px] overflow-y-auto text-muted-foreground">
                {promotions.map((p) => (
                  <li key={p.id} className="truncate">
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-muted-foreground text-sm">
              Esta acción detendrá la aplicación de estos precios en caja inmediatamente.
              El historial de ventas pasadas se mantendrá intacto.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); 
              handleDelete();
            }}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={isDeleting}
          >
            {isDeleting ? (
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
