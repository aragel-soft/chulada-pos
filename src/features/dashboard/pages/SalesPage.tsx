import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  X,
  Lock,
  ArrowDownFromLine,
  ArrowUpFromLine,
  Star,
  Percent,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { OpenShiftModal } from "@/features/cash-register/components/OpenShiftModal";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, cn } from "@/lib/utils";
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
import { useCartSync } from "@/features/sales/hooks/useCartSync";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { printSaleTicket } from "@/lib/api/printers";
import { useSalesStore } from "@/features/sales/stores/salesStore";
import { KitSelectionModal } from "@/features/sales/components/KitSelectionModal";
import { useKitLogic } from "@/features/sales/hooks/useKitLogic";
import { useKitStore } from "@/features/sales/stores/kitStore";
import { usePromotionsStore } from "@/features/sales/stores/promotionsStore";
import { ScannerInput } from "@/features/sales/components/ScannerInput";
import { CashMovementModal } from "@/features/cash-register/components/CashMovementModal";
import { DiscountModal } from "@/features/sales/components/DiscountModal";
import { OutOfStockWarningModal } from "@/features/sales/components/OutOfStockWarningModal";

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

  useCartSync();

  useEffect(() => {
    if (shift?.status === "open") {
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
    setTicketDiscount,
    clearTicketDiscount,
    toggleTicketPriceType,
  } = useCartStore();

  const activeTicket = getActiveTicket();
  const ticketTotal = getTicketTotal();
  const ticketSubtotal = getTicketSubtotal();

  const isWholesale = activeTicket?.priceType === "wholesale";
  const hasDiscount = (activeTicket?.discountPercentage || 0) > 0;

  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedItemUuid, setSelectedItemUuid] = useState<string | null>(null);
  const { lastSale, setLastSale } = useSalesStore();

  // Kit Logic Hook
  const {
    kitModalOpen,
    pendingKit,
    validateKitsForCheckout,
    handleKitConfirm,
    handleKitCancel,
  } = useKitLogic();

  const handleCheckoutRequest = async () => {
    if (
      ticketTotal > 0 &&
      shift?.status === "open" &&
      !isCheckoutOpen &&
      can("sales:create")
    ) {
      const activeTicket = getActiveTicket();
      if (!activeTicket) return;

      const isBlocked = await validateKitsForCheckout(activeTicket.items);
      if (isBlocked) return;

      setIsCheckoutOpen(true);
    }
  };

  // F12 Trigger
  useHotkeys("f12", handleCheckoutRequest, [
    ticketTotal,
    shift,
    isCheckoutOpen,
    activeTicket,
  ]);

  // F3 Trigger — Manual Search
  useHotkeys(
    "f3",
    () => {
      if (shift?.status === "open") {
        setIsManualSearchOpen((prev) => !prev);
      }
    },
    [shift],
  );

  // F8 Trigger — Discount
  useHotkeys(
    "f8",
    () => {
      if (activeTicket && shift?.status === "open") {
        setIsDiscountModalOpen(true);
      }
    },
    [activeTicket, shift],
  );

  // Ctrl+0 Trigger — Remove Discount
  useHotkeys(
    "ctrl+0",
    () => {
      if (hasDiscount && shift?.status === "open") {
        clearTicketDiscount();
        toast.info("Descuento removido");
      }
    },
    [hasDiscount, shift, clearTicketDiscount],
  );

  const handleScannerInput = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      try {
        const result = await getProducts(
          {
            page: 1,
            pageSize: 5,
            search: cleanCode,
            sortBy: "name",
            sortOrder: "asc",
          },
          { active_status: ["active"] },
        );
        const product = result.data.find(
          (p) => p.code === cleanCode || p.barcode === cleanCode,
        );

        if (product) {
          const addedUuid = addToCart(product);
          if (addedUuid) {
            setSelectedItemUuid(addedUuid);
            playSound("success");
            toast.success(`Agregado: ${product.name}`);
          }
        } else {
          playSound("error");
          toast.error(`Producto no encontrado: ${cleanCode}`);
        }
      } catch {
        playSound("error");
        toast.error(`Error al buscar producto: ${cleanCode}`);
      }
    },
    [addToCart],
  );

  useEffect(() => {
    if (tickets.length === 0) createTicket();
  }, [tickets.length, createTicket]);

  // Clear selection when active ticket changes
  useEffect(() => {
    setSelectedItemUuid(null);
  }, [activeTicketId]);

  const selectedItemRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedItemUuid) {
      const item = activeTicket?.items.find((i) => i.uuid === selectedItemUuid);
      if (item) {
        selectedItemRef.current = item.id;
      } else if (selectedItemRef.current) {
        const survivor = activeTicket?.items.find(i => i.id === selectedItemRef.current);
        if (survivor) {
          setSelectedItemUuid(survivor.uuid);
        } else {
          selectedItemRef.current = null;
          setSelectedItemUuid(null);
        }
      }
    }
  }, [activeTicket?.items, selectedItemUuid]);

  const handleProcessSale = async (
    method: string,
    cashAmount: number,
    cardAmount: number,
    shouldPrint: boolean,
    customerId?: string,
    voucherCode?: string,
    notes?: string,
  ) => {
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
      notes,
    );

    if (result) {
      playSound("success");
      toast.success("Venta completada", {
        description: `Folio: ${result.folio} | Cambio: ${formatCurrency(result.change)}`,
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
        folio: result.folio,
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
  const selectedItem =
    activeTicket?.items.find((i) => i.uuid === selectedItemUuid) ?? null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full gap-0">
      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={ticketTotal}
        isProcessing={isProcessing}
        onProcessSale={handleProcessSale}
        hasWholesale={isWholesale}
        discountPercentage={activeTicket?.discountPercentage}
        onClearRestrictions={() => {
          if (isWholesale) {
            toggleTicketPriceType();
          }
          if (hasDiscount) {
            clearTicketDiscount();
          }
          toast.success("Promociones removidas exitosamente");
          return getTicketTotal();
        }}
      />

      <KitSelectionModal
        isOpen={kitModalOpen}
        kit={pendingKit?.kit || null}
        triggerQuantity={pendingKit?.totalNeeded || 1}
        alreadySelectedCount={pendingKit?.alreadySelectedCount || 0}
        onConfirm={handleKitConfirm}
        onCancel={handleKitCancel}
      />

      {/* ── CABECERA: Scanner + Action Buttons ── */}
      <div className="shrink-0 bg-white border-b py-1 flex items-center gap-4">
        {/* Scanner Input */}

        <ScannerInput
          onScan={handleScannerInput}
          onManualSearch={() => setIsManualSearchOpen(true)}
          size="default"
          disabled={!isShiftOpen}
        />

        {/* Action Buttons */}
        {isShiftOpen && (
          <div className="flex items-center gap-2">
            {can("cash_register:movements:in") && (
              <CashMovementModal
                type="IN"
                trigger={
                  <Button
                    variant="outline"
                    size="default"
                    className="text-zinc-600 transition-colors"
                  >
                    <ArrowDownFromLine className="w-4 h-4 mr-2" /> Entradas
                  </Button>
                }
              />
            )}
            {can("cash_register:movements:out") && (
              <CashMovementModal
                type="OUT"
                trigger={
                  <Button
                    variant="outline"
                    size="default"
                    className="text-zinc-600 transition-colors"
                  >
                    <ArrowUpFromLine className="w-4 h-4 mr-2" /> Salidas
                  </Button>
                }
              />
            )}
            
            <div className="w-px h-8 bg-zinc-200 mx-1" />
            
            <Button
              variant={isWholesale ? "default" : "secondary"}
              size="default"
              onClick={() => {
                if (hasDiscount) {
                  clearTicketDiscount();
                  toast.info("Descuento removido para activar Mayoreo");
                }
                toggleTicketPriceType();
              }}
              className={cn(
                "transition-all",
                isWholesale
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-[#480489] text-white hover:bg-[#360368]",
              )}
            >
              <Star
                className={cn("w-4 h-4 mr-2", isWholesale && "fill-white")}
              />
              Mayoreo
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => setIsDiscountModalOpen(true)}
              disabled={!activeTicket}
              className={cn(
                "transition-all",
                hasDiscount
                  ? "bg-white hover:bg-orange-600 text-orange-600 hover:text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white hover:text-white",
              )}
            >
              <Percent className="w-4 h-4 mr-2" />
              Descuento
            </Button>
          </div>
        )}
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

        {/* ── Left: Ticket Table ── */}
        <div className="w-[70%] flex flex-col overflow-hidden border-r bg-zinc-50/50 relative">
          {/* Ticket Tabs */}
          <div
            className={`flex items-center gap-1 overflow-x-auto overflow-y-hidden pt-2 ${
              !isShiftOpen ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`group px-3 py-2 text-xs font-medium rounded-t-lg cursor-pointer flex items-center gap-2 border-t border-x select-none ${
                  activeTicketId === ticket.id
                    ? "bg-purple-50 text-[#480489] border-b border-[#480489] relative top-[1px] z-0 shadow-sm"
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

          <div className="flex-1 min-h-0 flex flex-col bg-white border-t border-x border-[#480489]">
            <TicketTable
              items={activeTicket?.items ?? []}
              selectedUuid={selectedItemUuid}
              onSelect={setSelectedItemUuid}
              onUpdateQuantity={updateQuantity}
              onRemove={(uuid) => removeFromCart(uuid)}
              discountPercentage={activeTicket?.discountPercentage ?? 0}
            />
          </div>

          {/* Resume last sale */}
          <div className="bg-zinc-50/80 border-t border-x border-b border-[#480489] p-3 shrink-0 flex items-center gap-6 rounded-b-md">
            <div className="pl-2">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Última Venta</span>
              <span className="text-lg font-bold text-zinc-600">
                {lastSale ? formatCurrency(lastSale.total) : "$0.00"}
              </span>
            </div>
            
            <div className="w-px h-8 bg-zinc-200" />
            
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Recibido</span>
              <span className="text-lg font-bold text-zinc-600">{lastSale ? formatCurrency(lastSale.paid) : "$0.00"}</span>
            </div>
            
            <div className="w-px h-8 bg-zinc-200" />

            <div className="bg-green-50 px-4 py-1.5 rounded border border-green-100/50">
              <span className="text-[10px] text-green-600/80 font-bold block uppercase tracking-wider">Cambio</span>
              <span className="text-xl font-black text-green-600 mt-0.5 block leading-none">{lastSale ? formatCurrency(lastSale.change) : "$0.00"}</span>
            </div>
            
            <div className="flex-1 flex justify-end items-center">
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

        {/* ── DERECHA (30%): Panel de Detalle + Totales ── */}
        <ProductDetailPanel
          selectedItem={selectedItem}
          activeTicket={activeTicket}
          ticketSubtotal={ticketSubtotal}
          ticketTotal={ticketTotal}
          discountAmount={getTicketDiscountAmount()}
          isShiftOpen={isShiftOpen}
          onClearTicket={() => {
            clearTicket();
            setSelectedItemUuid(null);
          }}
          onCheckout={handleCheckoutRequest}
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
          const addedUuid = addToCart(product);
          if (addedUuid) {
            setSelectedItemUuid(addedUuid);
            playSound("success");
            toast.success(`Agregado: ${product.name}`);
          }
        }}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        currentDiscount={activeTicket?.discountPercentage || 0}
        onApplyDiscount={(percentage) => {
          if (percentage === 0) {
            clearTicketDiscount();
            toast.info("Descuento removido");
          } else {
            setTicketDiscount(percentage);
            toast.success(`Descuento del ${percentage}% aplicado`);
          }
        }}
      />
      
      <OutOfStockWarningModal />
    </div>
  );
}
