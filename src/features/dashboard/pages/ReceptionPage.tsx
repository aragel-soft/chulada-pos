import { useState } from "react";
import { useReceptionStore } from "@/stores/receptionStore";
import { useAuthStore } from "@/stores/authStore";
import { ReceptionGrid } from "@/features/inventory/components/reception/ReceptionGrid";
import { ProductScannerInput } from "@/features/inventory/components/reception/ProductScannerInput";
import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { ManualSearchModal } from "@/features/sales/components/ManualSearchModal";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  PlusCircle,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { processBulkReception } from "@/lib/api/inventory/inventory-movements";
import { ProductDialog } from "@/features/inventory/components/products/ProductDialog";
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

export default function ReceptionPage() {
  const { user, can } = useAuthStore();
  const {
    items,
    addItem,
    selectedIds,
    clearSelection,
    getTotalQuantity,
    getTotalCost,
    getPayloadItems,
    clearReception,
    updateProductDetails,
  } = useReceptionStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showZeroCostWarning, setShowZeroCostWarning] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);

  useHotkeys("f12", () => {
    if (items.length > 0 && !isProcessing) {
      handleProcessClick();
    }
  }, [items, isProcessing]);

  useHotkeys("f3", () => {
    setIsManualSearchOpen((prev) => !prev);
  }, []);

  const executeReception = async () => {
    if (!user?.id) return;

    try {
      setIsProcessing(true);
      const payload = {
        user_id: user.id,
        items: getPayloadItems(),
      };

      await processBulkReception(payload);

      toast.success("Recepción procesada correctamente", {
        description: `${items.length} productos actualizados.`,
      });
      clearReception();
      setShowZeroCostWarning(false);
    } catch (error: any) {
      toast.error("Error al procesar recepción", {
        description: error.toString() || "Error desconocido",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessClick = () => {
    const hasZeroCost = items.some((i) => i.cost <= 0);
    const canViewCosts = can("products:purchase_price");

    if (hasZeroCost && canViewCosts) {
      setShowZeroCostWarning(true);
      return;
    }

    executeReception();
  };

  return (
    <div className="h-full flex flex-col gap-4 p-1">
      {/* HEADER */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 flex gap-2">
          <ProductScannerInput
            onProductSelect={(product) => addItem(product)}
            className="flex-1"
            autoFocus={true}
          />
          <Button
            variant="outline"
            onClick={() => setIsManualSearchOpen(true)}
            className="h-12 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors px-4 shadow-sm"
          >
            Buscar Manualmente (F3)
          </Button>
        </div>

        <div className="flex gap-2 shrink-0">
          {can("products:create") && (
            <Button
              onClick={() => {
                setActiveProductId(null);
                setIsProductDialogOpen(true);
              }}
              className="rounded-r-md bg-[#480489] hover:bg-[#480489]/90 transition-all"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </Button>
          )}

          {can("products:edit") && (
            <Button
              className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
              disabled={selectedIds.length !== 1}
              onClick={() => {
                setActiveProductId(selectedIds[0]);
                setIsProductDialogOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Modificar Producto</span>
            </Button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden">
        <ReceptionGrid />
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg border p-4 shrink-0 flex justify-between items-center shadow-sm">
        <div>
          <span className="text-xs text-muted-foreground block">Artículos</span>
          <span className="text-xl font-bold text-zinc-700">
            {getTotalQuantity()}
          </span>
        </div>

        {can("products:purchase_price") && (
          <div className="text-center">
            <span className="text-xs text-muted-foreground block">
              Total Compra
            </span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(getTotalCost())}
            </span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="lg"
            className="bg-[#480489] hover:bg-[#480489]/90 transition-all font-bold text-md px-8"
            disabled={items.length === 0 || isProcessing}
            onClick={handleProcessClick}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2" />
            )}
            Procesar Entrada (F12)
          </Button>
        </div>
      </div>

      {can("products:purchase_price") && (
        <AlertDialog
          open={showZeroCostWarning}
          onOpenChange={setShowZeroCostWarning}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Costos en Cero Detectados
              </AlertDialogTitle>
              <AlertDialogDescription>
                Algunos productos tienen un costo de compra de <b>$0.00</b>.
                <br />
                <br />
                ¿Deseas continuar y registrar estos productos con costo cero?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar Costos</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeReception()}>
                Confirmar Entrada
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <ProductDialog
        open={isProductDialogOpen}
        productId={activeProductId}
        onOpenChange={(open) => {
          setIsProductDialogOpen(open);
          if (!open) setActiveProductId(null);
        }}
        onSuccess={(updatedProduct) => {
          if (updatedProduct && activeProductId) {
            updateProductDetails(updatedProduct);
            clearSelection();
          }
          setIsProductDialogOpen(false);
          setActiveProductId(null);
        }}
      />
      <ManualSearchModal
        isOpen={isManualSearchOpen}
        onClose={() => setIsManualSearchOpen(false)}
        forceAllowSelect={true}
        onProductSelect={(product) => {
          addItem(product);
          setIsManualSearchOpen(false);
        }}
      />
    </div>
  );
}
