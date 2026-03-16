import { useEffect, useState, useRef } from "react";
import { useReceptionStore } from "@/stores/receptionStore";
import { useAuthStore } from "@/stores/authStore";
import { ReceptionGrid } from "@/features/inventory/components/reception/ReceptionGrid";
import { ScannerInput } from "@/features/sales/components/ScannerInput";
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
import { getProducts } from "@/lib/api/inventory/products";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
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
    removeItem,
    selectedIds,
    clearSelection,
    getTotalQuantity,
    getTotalCost,
    getPayloadItems,
    clearReception,
    toggleItemSelection,
    updateProductDetails,
  } = useReceptionStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showZeroCostWarning, setShowZeroCostWarning] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const selectionInitRef = useRef(false);

  useHotkeys(
    "f12",
    () => {
      if (items.length > 0 && !isProcessing) {
        handleProcessClick();
      }
    },
    [items, isProcessing],
  );

  useHotkeys(
    "f3",
    () => {
      setIsManualSearchOpen((prev) => !prev);
    },
    [],
  );

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
      clearSelectionStorage();
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

  const handleScannerInput = async (code: string) => {
    const cleanCode = code.trim();
    try {
      const result = await getProducts(
        {
          page: 1,
          pageSize: 5,
          search: "",
          sortBy: "name",
          sortOrder: "asc",
        },
        {
          active_status: [],
          exact_code: cleanCode,
        },
      );
      const product = result.data.find(
        (p) => p.code === cleanCode || p.barcode === cleanCode,
      );

      if (product) {
        addItem(product);
        playSound("success");
        toast.success(`Agregado: ${product.name}`);
      } else {
        playSound("error");
        toast.error(`Producto no encontrado: ${cleanCode}`);
      }
    } catch {
      playSound("error");
      toast.error(`Error al buscar producto: ${cleanCode}`);
    }
  };

  useEffect(() => {
    if (!items.length) {
      if (selectedIds.length > 0) clearSelection();
      if (selectionInitRef.current) {
        clearSelectionStorage();
        selectionInitRef.current = false;
      }
      return;
    }

    if (!selectionInitRef.current) {
      const savedId = readSelectionStorage();
      const initialId =
        savedId && items.some((i) => i.product_id === savedId)
          ? savedId
          : items[0].product_id;
      toggleItemSelection(initialId);
      selectionInitRef.current = true;
      return;
    }

    const selectedId = selectedIds[0] || null;
    if (selectedId) {
      writeSelectionStorage(selectedId);
      const element = document.getElementById(`reception-row-${selectedId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [items, selectedIds, clearSelection, toggleItemSelection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!items.length) return;
      if (
        isProcessing ||
        showZeroCostWarning ||
        isProductDialogOpen ||
        isManualSearchOpen
      ) {
        return;
      }

      const activeElement = document.activeElement;
      if (isTypingElement(activeElement)) {
        const isScanner =
          activeElement instanceof HTMLElement &&
          activeElement.closest('[data-role="scanner-input"]');
        if (!isScanner) {
          return;
        }
      }

      const selectedId = selectedIds[0] || null;
      const currentIndex = selectedId
        ? items.findIndex((item) => item.product_id === selectedId)
        : -1;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (currentIndex === -1) {
          toggleItemSelection(items[0].product_id);
        } else if (currentIndex < items.length - 1) {
          toggleItemSelection(items[currentIndex + 1].product_id);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (currentIndex === -1) {
          toggleItemSelection(items[0].product_id);
        } else if (currentIndex > 0) {
          toggleItemSelection(items[currentIndex - 1].product_id);
        }
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (!selectedId) return;
        const nextIndex =
          currentIndex < items.length - 1 ? currentIndex + 1 : currentIndex - 1;
        const nextId = nextIndex >= 0 ? items[nextIndex].product_id : null;
        removeItem(selectedId);
        if (nextId) {
          toggleItemSelection(nextId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    items,
    selectedIds,
    isProcessing,
    showZeroCostWarning,
    isProductDialogOpen,
    isManualSearchOpen,
    toggleItemSelection,
    removeItem,
  ]);

  return (
    <div className="h-full flex flex-col gap-4 p-1">
      {/* HEADER */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 flex gap-2">
          <ScannerInput
            onScan={handleScannerInput}
            onManualSearch={() => setIsManualSearchOpen(true)}
            size="default"
          />
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
        activeStatus={[]}
        forceAllowSelect={true}
        onProductSelect={(product) => {
          addItem(product);
          setIsManualSearchOpen(false);
        }}
      />
    </div>
  );
}

function isTypingElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }
  if ((element as HTMLElement).isContentEditable) return true;
  return element.getAttribute("role") === "textbox";
}

const RECEPTION_SELECTION_STORAGE_KEY = "pos-reception-selected";

function readSelectionStorage(): string | null {
  try {
    return localStorage.getItem(RECEPTION_SELECTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSelectionStorage(productId: string): void {
  try {
    localStorage.setItem(RECEPTION_SELECTION_STORAGE_KEY, productId);
  } catch {}
}

function clearSelectionStorage(): void {
  try {
    localStorage.removeItem(RECEPTION_SELECTION_STORAGE_KEY);
  } catch {}
}
