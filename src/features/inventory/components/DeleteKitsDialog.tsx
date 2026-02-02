import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Loader2, PackageOpen } from "lucide-react";
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
import { deleteKits } from "@/lib/api/inventory/kits";
import { KitListItem } from "@/types/kits";

interface DeleteKitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kits: KitListItem[];
  onSuccess?: () => void;
}

export function DeleteKitsDialog({
  open,
  onOpenChange,
  kits,
  onSuccess,
}: DeleteKitsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const ids = kits.map((k) => k.id);
      await deleteKits(ids);

      const isPlural = ids.length > 1;
      toast.success(
        isPlural
          ? "Kits eliminados y productos liberados"
          : "Kit eliminado y productos liberados",
        {
          description:
            "Los productos asociados ahora pueden usarse en otras promociones.",
        },
      );

      queryClient.invalidateQueries({ queryKey: ["kits"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al eliminar", {
        description: "No se pudieron eliminar los kits seleccionados.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!kits.length) return null;

  const isPlural = kits.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            <AlertDialogTitle>
              {isPlural ? "¿Eliminar kits seleccionados?" : "¿Eliminar kit?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p>
              Estás a punto de eliminar{" "}
              <b>{isPlural ? `${kits.length} kits` : "este kit"}</b>.
            </p>

            <div className="rounded-md bg-muted/50 p-3 text-sm border">
              <ul className="list-disc list-inside space-y-1 max-h-[100px] overflow-y-auto text-muted-foreground">
                {kits.map((k) => (
                  <li key={k.id} className="truncate">
                    {k.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Advertencia Crítica de Liberación */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm">
              <PackageOpen className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Liberación de Productos</p>
                <p className="opacity-90 leading-snug">
                  Los productos "disparadores" de estos kits quedarán
                  <strong> libres inmediatamente</strong> y podrán ser asignados
                  a nuevos kits.
                </p>
              </div>
            </div>

            <p className="text-muted-foreground text-xs">
              Esta acción no afecta el historial de ventas pasadas.
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
            ) : isPlural ? (
              "Sí, Eliminar Todo"
            ) : (
              "Sí, Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
