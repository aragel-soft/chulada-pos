import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Product, ProductDependencies } from "@/types/inventory";
import {
  deleteProducts,
  checkProductDependencies,
} from "@/lib/api/inventory/products";
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
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Tag, Package, Loader2 } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [dependencies, setDependencies] = useState<ProductDependencies | null>(
    null
  );

  useEffect(() => {
    if (open && products.length > 0) {
      setIsLoading(true);
      const productIds = products.map((p) => p.id);
      checkProductDependencies(productIds)
        .then((deps) => {
          setDependencies(deps);
        })
        .catch(() => {
          setDependencies(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setDependencies(null);
    }
  }, [open, products]);

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
        description:
          typeof error === "string"
            ? error
            : "No se pudo procesar la eliminación.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isPlural = products.length > 1;
  const kitsToDeactivate = dependencies?.kits.filter((k) => k.will_deactivate) ?? [];
  const kitsPartialRemoval = dependencies?.kits.filter((k) => !k.will_deactivate) ?? [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trash2 className="inline-block mr-2 -mt-1 h-5 w-5 text-destructive" />
            {isPlural
              ? `¿Eliminar ${products.length} productos?`
              : "¿Eliminar producto?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {isPlural ? (
                  <>
                    Estás a punto de eliminar{" "}
                    <b>{products.length} productos</b> seleccionados.
                  </>
                ) : (
                  <>
                    Estás a punto de eliminar el producto "
                    <b>{products[0]?.name}</b>".
                  </>
                )}
              </p>

              {isLoading && (
                <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando dependencias...
                </div>
              )}

              {!isLoading &&
                dependencies &&
                dependencies.promotions.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {isPlural ? "Estos productos pertenecen" : "Este producto pertenece"}{" "}
                        a {dependencies.promotions.length === 1 ? "una promoción activa" : `${dependencies.promotions.length} promociones activas`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {dependencies.promotions.map((promo) => (
                        <Badge
                          key={promo.id}
                          variant="outline"
                          className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {promo.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 pl-6">
                      {dependencies.promotions.length === 1
                        ? "Esta promoción será desactivada automáticamente."
                        : "Estas promociones serán desactivadas automáticamente."}
                    </p>
                  </div>
                )}

              {!isLoading && kitsPartialRemoval.length > 0 && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                    <Package className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {isPlural ? "Estos productos se eliminarán" : "Este producto se eliminará"}{" "}
                      de {kitsPartialRemoval.length === 1 ? "un kit" : `${kitsPartialRemoval.length} kits`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {kitsPartialRemoval.map((kit) => (
                      <div key={`${kit.id}-${kit.role}`} className="text-xs">
                        <Badge
                          variant="outline"
                          className="border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {kit.name}
                        </Badge>
                        <span className="ml-2 text-blue-600/80 dark:text-blue-400/80">
                          ({kit.role === "main" ? "Producto principal" : "Complemento"})
                          {" — "}
                          El kit seguirá activo con{" "}
                          {kit.remaining_mains} {kit.remaining_mains === 1 ? "principal" : "principales"} y{" "}
                          {kit.remaining_items} {kit.remaining_items === 1 ? "complemento" : "complementos"}.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && kitsToDeactivate.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {kitsToDeactivate.length === 1
                        ? "Un kit será desactivado"
                        : `${kitsToDeactivate.length} kits serán desactivados`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {kitsToDeactivate.map((kit) => (
                      <div key={`${kit.id}-${kit.role}`} className="text-xs">
                        <Badge
                          variant="destructive"
                          className="text-xs"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {kit.name}
                        </Badge>
                        <span className="ml-2 text-destructive/80">
                          — Se quedaría sin{" "}
                          {kit.remaining_mains <= 0 && kit.remaining_items <= 0
                            ? "productos principales ni complementos"
                            : kit.remaining_mains <= 0
                            ? "productos principales"
                            : "complementos"}
                          , por lo que será desactivado.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Esta acción {isPlural ? "los" : "lo"} eliminará del inventario y
                nuevas ventas, pero{" "}
                <b>se mantendrá su historial de ventas</b> para los reportes.
              </p>
            </div>                    
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isDeleting || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}