import { useState } from "react";
import { useReceptionStore } from "@/stores/receptionStore";
import { useAuthStore } from "@/stores/authStore";
import { ReceptionGrid } from "@/features/inventory/components/reception/ReceptionGrid";
import { ProductScannerInput } from "@/features/inventory/components/reception/ProductScannerInput";
import { Button } from "@/components/ui/button";
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
import { CreateProductDialog } from "@/features/inventory/components/products/CreateProductDialog";
import { EditProductDialog } from "@/features/inventory/components/products/EditProductDialog";
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
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

    if (hasZeroCost) {
      setShowZeroCostWarning(true);
      return;
    }

    executeReception();
  };

  return (
    <div className="h-full flex flex-col gap-4 p-1">
      {/* HEADER */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <ProductScannerInput
            onProductSelect={(product) => addItem(product)}
            className="w-full"
            autoFocus={true}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          {can("products:create") && (
            <Button
              onClick={() => setIsCreateProductOpen(true)}
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
                setEditingId(selectedIds[0]);
                setIsEditProductOpen(true);
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
      <div className="bg-white rounded-lg border p-4 shrink-0 grid grid-cols-3 gap-4 items-center shadow-sm">
        <div>
          <span className="text-xs text-muted-foreground block">Artículos</span>
          <span className="text-xl font-bold text-zinc-700">
            {getTotalQuantity()}
          </span>
        </div>

        <div>
          <span className="text-xs text-muted-foreground block">
            Total Compra
          </span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(getTotalCost())}
          </span>
        </div>

        {/* Botón de Acción (Alineado a la derecha) */}
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
            Procesar Entrada
          </Button>
        </div>
      </div>

      {/* --- DIALOGS --- */}

      <EditProductDialog
        open={isEditProductOpen}
        onOpenChange={setIsEditProductOpen}
        productId={editingId}
        variant="minimal"
        onSuccess={(updatedProduct) => {
          if (updatedProduct) {
            updateProductDetails(updatedProduct);
          }
          clearSelection();
        }}
      />

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

      <CreateProductDialog
        open={isCreateProductOpen}
        onOpenChange={setIsCreateProductOpen}
      />
    </div>
  );
}
