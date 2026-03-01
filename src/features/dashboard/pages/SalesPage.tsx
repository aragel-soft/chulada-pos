import { useState, useEffect, useCallback } from "react";
import { Plus, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { OpenShiftModal } from "@/features/cash-register/components/OpenShiftModal";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils";
import { getProducts } from "@/lib/api/inventory/products";
import { toast } from "sonner";
import { useCartStore } from "@/features/sales/stores/cartStore";
import { playSound } from "@/lib/sounds";
import { TicketTable } from "@/features/sales/components/TicketTable";
import { MAX_OPEN_TICKETS } from "@/config/constants";
import { CheckoutModal } from "@/features/sales/components/CheckoutModal";
import { ManualSearchModal } from "@/features/sales/components/ManualSearchModal";
import { ProductDetailPanel } from "@/features/sales/components/ProductDetailPanel";
import { useProcessSale } from "@/features/sales/hooks/useProcessSale";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { printSaleTicket } from "@/lib/api/printers";
import { useSalesStore } from "@/features/sales/stores/salesStore";
import { KitSelectionModal } from "@/features/sales/components/KitSelectionModal";
import { useKitLogic } from "@/features/sales/hooks/useKitLogic";
import { useKitStore } from "@/features/sales/stores/kitStore";
import { usePromotionsStore } from "@/features/sales/stores/promotionsStore";
import { ScannerInput } from "@/features/sales/components/ScannerInput";

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
  const { fetchPromotions } = usePromotionsStore();

  useEffect(() => {
    if (shift?.status === 'open') {
      fetchKits();
      fetchPromotions();
    }
  }, [shift?.status, fetchKits, fetchPromotions]);

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
    getTicketDiscountAmount,
    clearTicket,
    toggleItemPriceType,
  } = useCartStore();

  const activeTicket = getActiveTicket();
  const ticketTotal = getTicketTotal();
  const ticketSubtotal = getTicketSubtotal();

  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [selectedItemUuid, setSelectedItemUuid] = useState<string | null>(null);
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

  // F3 Trigger — Manual Search
  useHotkeys('f3', () => {
    if (shift?.status === 'open') {
      setIsManualSearchOpen((prev) => !prev);
    }
  }, [shift]);

  const handleScannerInput = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      try {
        const result = await getProducts(
          { page: 1, pageSize: 5, search: cleanCode, sortBy: "name", sortOrder: "asc" },
          { active_status: ["active"] }
        );
        const product = result.data.find(
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
      } catch {
        playSound("error");
        toast.error(`Error al buscar producto: ${cleanCode}`);
      }
    },
    [addToCart]
  );

  useEffect(() => {
    if (tickets.length === 0) createTicket();
  }, [tickets.length, createTicket]);

  // Clear selection when active ticket changes
  useEffect(() => {
    setSelectedItemUuid(null);
  }, [activeTicketId]);

  const handleProcessSale = async (method: string, cashAmount: number, cardAmount: number, shouldPrint: boolean, customerId?: string, voucherCode?: string, notes?: string) => {
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
          customerId,
          voucherCode,
          notes
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
              paid: cashAmount + cardAmount + (result.voucher_used || 0),
              change: result.change,
              method,
              folio: result.folio
          });

          setIsCheckoutOpen(false);
          clearTicket();
          setSelectedItemUuid(null);
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

  const isShiftOpen = shift?.status === "open";
  const selectedItem = activeTicket?.items.find((i) => i.uuid === selectedItemUuid) ?? null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full gap-0">
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
        triggerQuantity={pendingKit?.totalNeeded || 1}
        alreadySelectedCount={pendingKit?.alreadySelectedCount || 0}
        onConfirm={handleKitConfirm}
        onCancel={handleKitCancel}
      />

      {/* ── CABECERA: Tabs + Scanner ── */}
      <div className="shrink-0 bg-white border-b px-4 py-2 flex flex-col gap-2">
        {/* Ticket Tabs */}
        <div
          className={`flex items-end gap-1 overflow-x-auto overflow-y-hidden ${
            !isShiftOpen ? "opacity-50 pointer-events-none" : ""
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

        {/* Scanner Input */}
        <ScannerInput
          onScan={handleScannerInput}
          onManualSearch={() => setIsManualSearchOpen(true)}
          disabled={!isShiftOpen}
        />
      </div>

      {/* ── CUERPO PRINCIPAL: Split 70/30 ── */}
      <div className="flex-1 flex overflow-hidden gap-0 relative">

        {/* Bloqueo de Caja Cerrada */}
        {!isShiftOpen && (
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

        {/* ── IZQUIERDA (70%): Tabla del Ticket ── */}
        <div className="w-[70%] flex flex-col overflow-hidden border-r">
          <TicketTable
            items={activeTicket?.items ?? []}
            selectedUuid={selectedItemUuid}
            onSelect={setSelectedItemUuid}
            onUpdateQuantity={updateQuantity}
            onRemove={(uuid) => removeFromCart(uuid)}
            onTogglePriceType={(uuid) => toggleItemPriceType(uuid)}
            discountPercentage={activeTicket?.discountPercentage ?? 0}
          />
        </div>

        {/* ── DERECHA (30%): Panel de Detalle + Totales ── */}
        <ProductDetailPanel
          selectedItem={selectedItem}
          activeTicket={activeTicket}
          ticketSubtotal={ticketSubtotal}
          ticketTotal={ticketTotal}
          discountAmount={getTicketDiscountAmount()}
          isShiftOpen={isShiftOpen}
          lastSale={lastSale}
          onClearTicket={() => {
            clearTicket();
            setSelectedItemUuid(null);
          }}
          onCheckout={handleCheckoutRequest}
          onReprintLastSale={handleReprint}
          canCreateSales={can("sales:create")}
        />
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
      <ManualSearchModal
        isOpen={isManualSearchOpen}
        onClose={() => setIsManualSearchOpen(false)}
        onProductSelect={(product) => {
          addToCart(product);
          playSound("success");
          toast.success(`Agregado: ${product.name}`);
        }}
      />
    </div>
  );
}
