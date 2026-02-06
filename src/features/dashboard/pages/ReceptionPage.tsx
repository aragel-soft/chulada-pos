import { useState } from "react";
import { useReceptionStore } from "@/stores/receptionStore";
import { useAuthStore } from "@/stores/authStore";
import { ReceptionGrid } from "@/features/inventory/components/reception/ReceptionGrid";
import { ProductScannerInput } from "@/features/inventory/components/reception/ProductScannerInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Loader2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { processBulkReception } from "@/lib/api/inventory/inventory-movements";
import { CreateProductDialog } from "@/features/inventory/components/products/CreateProductDialog";
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
  const { user } = useAuthStore();
  const {
    items,
    addItem,
    getTotalQuantity,
    getTotalCost,
    getPayloadItems,
    clearReception,
  } = useReceptionStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showZeroCostWarning, setShowZeroCostWarning] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);

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
      <div className="flex gap-4 items-center shrink-0 bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex-1">
          <ProductScannerInput
            onProductSelect={(product) => addItem(product)}
            className="w-full max-w-3xl"
            autoFocus={true}
          />
        </div>

        <Button
          onClick={() => setIsCreateProductOpen(true)}
          variant="outline"
          className="h-12 px-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* BODY  */}
      <div className="flex-1 overflow-hidden">
        <ReceptionGrid />
      </div>

      {/* FOOTER */}
      <Card className="shrink-0 p-4 bg-slate-50 border-t flex items-center justify-between">
        <div className="flex gap-8 items-center text-sm">
          <div>
            <span className="text-muted-foreground block">Artículos</span>
            <span className="font-bold text-xl">{getTotalQuantity()}</span>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div>
            <span className="text-muted-foreground block">Total Compra</span>
            <span className="font-bold text-xl text-primary">
              {formatCurrency(getTotalCost())}
            </span>
          </div>
        </div>

        <Button
          size="lg"
          className="w-[200px] font-bold text-md"
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
      </Card>

      {/* Zero Cost Warning Dialog */}
      <AlertDialog
        open={showZeroCostWarning}
        onOpenChange={setShowZeroCostWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
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
