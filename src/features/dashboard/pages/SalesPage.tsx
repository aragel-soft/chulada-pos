import { useState, useEffect, useCallback } from "react";
import { Plus, X,  Printer, Wallet, Lock, Trash, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { OpenShiftModal } from "@/features/cash-register/components/OpenShiftModal";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils";
import { usePosProducts } from "@/features/sales/hooks/usePosProducts";
import { CatalogSearch } from "@/features/sales/components/CatalogSearch";
import { ProductsGrid } from "@/features/sales/components/ProductsGrid";
import { Product } from "@/types/inventory";
import { toast } from "sonner";
import { useCartStore } from "@/features/sales/stores/cartStore";
import { useScanDetection } from "@/hooks/use-scan-detection";
import { playSound } from "@/lib/sounds";
import { CartItemRow } from "@/features/sales/components/CardItemRow";
import { MAX_OPEN_TICKETS } from "@/config/constants";
import { CheckoutModal } from "@/features/sales/components/CheckoutModal";
import { useProcessSale } from "@/features/sales/hooks/useProcessSale";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { printSaleTicket } from "@/lib/api/cash-register/sales";
import { useSalesStore } from "@/features/sales/stores/salesStore";
import { KitSelectionModal } from "@/features/sales/components/KitSelectionModal";
import { useKitLogic } from "@/features/sales/hooks/useKitLogic";
import { useKitStore } from "@/features/sales/stores/kitStore";


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

export default function SalesPage() {
  const { shift } = useCashRegisterStore();
  const { can, user } = useAuthStore();
  const { processSale, isProcessing } = useProcessSale();
  const { fetchKits } = useKitStore();

  useEffect(() => {
    if (shift?.status === 'open') {
      fetchKits();
    }
  }, [shift?.status, fetchKits]);

  const {
    tickets,
    activeTicketId,
    createTicket,
    closeTicket,
    setActiveTicket,
    addToCart,
    removeFromCart,
    updateQuantity,
    getActiveTicket,
    getTicketTotal,
    getTicketSubtotal,
    clearTicket,
    toggleItemPriceType,
  } = useCartStore();

  const activeTicket = getActiveTicket();
  const ticketTotal = getTicketTotal();
  const ticketSubtotal = getTicketSubtotal();

  const [searchTerm, setSearchTerm] = useState("");
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { lastSale, setLastSale } = useSalesStore();

  // Kit Logic Hook
  const {
      kitModalOpen,
      pendingKit,
      validateKitsForCheckout,
      handleKitConfirm, 
      handleKitCancel
  } = useKitLogic();
  
  const handleCheckoutRequest = async () => {
       if (ticketTotal > 0 && shift?.status === 'open' && !isCheckoutOpen && can("sales:create")) {
          const activeTicket = getActiveTicket();
          if (!activeTicket) return;
          
          const isBlocked = await validateKitsForCheckout(activeTicket.items);
          if (isBlocked) return;
          
          setIsCheckoutOpen(true);
       }
  };

  // F12 Trigger
  useHotkeys('f12', handleCheckoutRequest, [ticketTotal, shift, isCheckoutOpen, activeTicket]);

  const {
    products,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isProductsLoading,
  } = usePosProducts({
    search: searchTerm,
    enabled: !!shift && shift.status === "open",
  });

  const handleProductSelect = (product: Product) => {
    addToCart(product);
    toast.success(`Agregado: ${product.name}`);
  };

  const handleAddProductByCode = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      const product = products.find(
        (p) => p.code === cleanCode || p.barcode === cleanCode
      );

      if (product) {
        addToCart(product);
        playSound("success");
        toast.success(`Agregado: ${product.name}`);
      } else {
        playSound("error");
        toast.error(`Producto no encontrado: ${cleanCode}`);
      }
    },
    [products, addToCart]
  );

  useScanDetection({
    onScan: handleAddProductByCode,
  });

  useEffect(() => {
    if (tickets.length === 0) createTicket();
  }, [tickets.length, createTicket]);

  const handleProcessSale = async (method: string, cashAmount: number, cardAmount: number, shouldPrint: boolean, customerId?: string) => {
      if (!user?.id || !shift?.id || !activeTicket) return;

      const result = await processSale(
          activeTicket.items,
          method,
          cashAmount,
          cardAmount,
          user.id,
          shift.id.toString(),
          shouldPrint,
          activeTicket.discountPercentage,
          customerId
      );

      if (result) {
          playSound("success");
          toast.success("Venta completada", {
              description: `Folio: ${result.folio} | Cambio: ${formatCurrency(result.change)}`
          });
          
          if (shouldPrint) {
              toast.info("Ticket enviado a imprimir");
          }

          setLastSale({
              id: result.id,
              total: result.total,
              paid: cashAmount + cardAmount,
              change: result.change,
              method,
              folio: result.folio
          });

          setIsCheckoutOpen(false);
          clearTicket();
      }
  };

  const handleReprint = async () => {
      if (!lastSale?.id) return;
      try {
          toast.info("Imprimiendo copia de ticket...");
          await printSaleTicket(lastSale.id);
          toast.success("Ticket reimpreso correctamente");
      } catch (error) {
          toast.error("Error al reimprimir ticket", { description: String(error) });
      }
  };

  return (
    <div className="flex-1 flex overflow-hidden gap-4 h-full">
      {/* Checkout Modal */}
      <CheckoutModal 
         isOpen={isCheckoutOpen}
         onClose={() => setIsCheckoutOpen(false)}
         total={ticketTotal}
         isProcessing={isProcessing}
         onProcessSale={handleProcessSale}
      />

      <KitSelectionModal
        isOpen={kitModalOpen}
        kit={pendingKit?.kit || null}
        triggerQuantity={pendingKit?.triggerProduct.quantity || 1}
        alreadySelectedCount={pendingKit?.alreadySelectedCount || 0}
        onConfirm={handleKitConfirm}
        onCancel={handleKitCancel}
      />

      {/* --- COLUMNA IZQUIERDA: GRID DE PRODUCTOS --- */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        <div className="shrink-0 bg-white rounded-lg p-1 shadow-sm border border-transparent transition-all">
          <CatalogSearch
            onSearch={setSearchTerm}
            onEnter={(term) => {
              const clean = term.trim();
              const exactMatch = products.find(
                  p => p.code === clean || p.barcode === clean
              );
              if (exactMatch) {
                  addToCart(exactMatch);
                  playSound("success");
                  return true; 
              }
              return false; 
            }}
            isLoading={isProductsLoading || isFetchingNextPage}
            className="w-full"
            placeholder="Buscar por nombre, código..."
          />
        </div>

        <div className="flex-1 bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden relative">
          <ProductsGrid
            products={products}
            isLoading={isProductsLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            onProductSelect={(product) => handleProductSelect(product)}
          />
        </div>

        {/* Resumen Izquierdo - Parte Inferior */}
        <div className="bg-white rounded-lg border p-4 shrink-0 grid grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-muted-foreground block">Total (Anterior)</span>
            <span className="text-xl font-bold text-zinc-500">
              {lastSale ? formatCurrency(lastSale.total) : "$0.00"}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Pagó con
            </span>
            <span className="text-xl font-bold">{lastSale ? formatCurrency(lastSale.paid) : "$0.00"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Cambio</span>
            <span className="text-xl font-bold text-green-600">{lastSale ? formatCurrency(lastSale.change) : "$0.00"}</span>
          </div>
          <div className="flex justify-end items-center">
            <Button
              variant="outline"
              size="sm"
              className="border-[#480489] text-[#480489] hover:bg-purple-50"
              onClick={handleReprint}
              disabled={!lastSale}
            >
              <Printer className="w-4 h-4 mr-2" /> Re-imprimir ticket
            </Button>
          </div>

        </div>
      </div>

      {/* --- COLUMNA DERECHA: TICKETS VIRTUALES --- */}
      <div className="w-[400px] bg-white border rounded-lg flex flex-col shrink-0 relative overflow-hidden">
        {/* Bloqueo de Caja Cerrada */}
        {(!shift || shift.status !== "open") && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-zinc-200 w-full max-w-xs">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-[#480489]" />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 mb-2">
                Caja Cerrada
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Para realizar ventas, es necesario abrir turno.
              </p>

              {can("cash_register:open") && (
                <OpenShiftModal
                  trigger={
                    <Button className="w-full bg-[#480489] hover:bg-[#360368]">
                      Abrir Caja
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Tabs de Tickets */}
        <div
          className={`flex items-end px-2 pt-2 gap-1 overflow-x-auto border-b overflow-y-hidden ${
            !shift || shift.status !== "open"
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`group px-3 py-2 text-xs font-medium rounded-t-lg cursor-pointer flex items-center gap-2 border-t border-x select-none transition-all ${
                activeTicketId === ticket.id
                  ? "bg-purple-50 text-[#480489] border-b-2 border-[#480489] relative top-[1px] z-0 shadow-sm"
                  : "bg-zinc-100 text-zinc-500 border-transparent hover:bg-zinc-200/80 mb-[1px]"
              }`}
              onClick={() => setActiveTicket(ticket.id)}
            >
              <span className="max-w-[80px] truncate">{ticket.name}</span>
              <X
                className={`w-3 h-3 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors ${
                  tickets.length === 1 ? "hidden" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (ticket.items.length > 0) {
                    setTicketToDelete(ticket.id); 
                  } else {
                    closeTicket(ticket.id);
                  }
                }}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-1 rounded-full text-[#480489] hover:bg-purple-50"
            onClick={createTicket}
            disabled={tickets.length >= MAX_OPEN_TICKETS}
            title="Nuevo Ticket"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/30">
          {!activeTicket || activeTicket.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            activeTicket.items.map((item) => (
              <CartItemRow
                key={item.uuid}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={(uuid) => removeFromCart(uuid)}
                onTogglePriceType={() => toggleItemPriceType(item.uuid)}
                hasDiscount={(activeTicket?.discountPercentage || 0) > 0}
              />
            ))
          )}
        </div>

        {/* Footer: Totales y Cobrar */}
        <div className="p-4 border-t bg-white space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          {activeTicket && activeTicket.items.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                onClick={clearTicket}
              >
                <Trash className="w-3 h-3 mr-1" /> Limpiar Todo
              </Button>
            </div>
          )}

          {/* Discount Info */}
          {activeTicket && activeTicket.discountPercentage > 0 && (
            <div className="space-y-1 pb-2 border-b">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(ticketSubtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-600 flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Descuento ({activeTicket.discountPercentage}%):
                </span>
                <span className="font-semibold text-amber-600">
                  -{formatCurrency(ticketSubtotal * (activeTicket.discountPercentage / 100))}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end">
            <span className="text-lg font-bold text-zinc-700">Total:</span>
            <span className="text-4xl font-extrabold text-[#480489] tabular-nums">
              {formatCurrency(ticketTotal)}
            </span>
          </div>

          {can("sales:create") && (
            <Button
            className="w-full bg-[#480489] hover:bg-[#360368] h-12 text-lg shadow-md transition-all active:scale-[0.99]"
            disabled={!shift || shift.status !== "open" || ticketTotal === 0}
            onClick={handleCheckoutRequest}
          >
            <Wallet className="w-5 h-5 mr-2" />
            Cobrar (F12)
          </Button>
          )}
          </div>
      </div>

      {/* Dialog de Confirmación para Cerrar Ticket con Productos */}
      <AlertDialog
        open={!!ticketToDelete}
        onOpenChange={(open) => !open && setTicketToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar ticket con productos?</AlertDialogTitle>
            <AlertDialogDescription>
              El ticket actual tiene productos agregados. Si lo cierras ahora,
              <strong> se perderá el progreso de esta venta</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => {
                if (ticketToDelete) {
                  closeTicket(ticketToDelete);
                  setTicketToDelete(null);
                }
              }}
            >
              Cerrar Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
