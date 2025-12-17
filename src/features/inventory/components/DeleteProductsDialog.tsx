import { useState } from "react";
import { toast } from "sonner";
import { Product } from "@/types/inventory";
import { deleteProducts } from "@/lib/api/inventory/products";
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
import { Trash2 } from "lucide-react";

interface DeleteProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSuccess: () => void;
}

export function DeleteProductsDialog({
  open,
  onOpenChange,
  products,
  onSuccess,
}: DeleteProductsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      const productIds = products.map((p) => p.id);
      await deleteProducts(productIds);

      toast.success(
        products.length === 1
          ? "Producto eliminado correctamente"
          : `${products.length} productos eliminados correctamente`
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error eliminando productos:", error);
      toast.error("Error al eliminar", {
        description: typeof error === 'string' ? error : "No se pudo procesar la eliminación.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isPlural = products.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trash2 className="inline-block mr-2 -mt-1 h-5 w-5 text-destructive" />
            {isPlural
              ? `¿Eliminar ${products.length} productos?`
              : "¿Eliminar producto?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPlural ? (
              <>
                Estás a punto de eliminar <b>{products.length} productos</b> seleccionados.
              </>
            ) : (
              <>
                Estás a punto de eliminar el producto "<b>{products[0]?.name}</b>".
              </>
            )}
            <br className="my-2"/>
            Esta acción {isPlural ? "los" : "lo"} eliminará del inventario y nuevas ventas, pero 
            <b> se mantendrá su historial de ventas </b>
            para los reportes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); 
              handleConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}