import { CartItem } from "@/types/sales";
import { Ticket } from "@/types/sales";
import { Button } from "@/components/ui/button";
import { AppAvatar } from "@/components/ui/app-avatar";
import { formatCurrency } from "@/lib/utils";
import { Percent, Wallet, Trash, Package, PackageOpen } from "lucide-react";

interface ProductDetailPanelProps {
  selectedItem: CartItem | null;
  activeTicket?: Ticket;
  ticketSubtotal: number;
  ticketTotal: number;
  discountAmount: number;
  isShiftOpen: boolean;
  onClearTicket: () => void;
  onCheckout: () => void;
  canCreateSales: boolean;
}

export function ProductDetailPanel({
  selectedItem,
  activeTicket,
  ticketSubtotal,
  ticketTotal,
  discountAmount,
  isShiftOpen,
  onClearTicket,
  onCheckout,
  canCreateSales,
}: ProductDetailPanelProps) {
  
  const hasItems = activeTicket && activeTicket.items.length > 0;
  const hasDiscount = activeTicket && activeTicket.discountPercentage > 0;

  return (
    <div className="w-[30%] flex flex-col bg-white min-w-[280px]">
      
      {/* ── ARRIBA: Detalle del Producto ── */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {selectedItem ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Imagen centrada grande */}
            <div className="flex justify-center mb-4">
              <AppAvatar
                path={selectedItem.image_url || null}
                name={selectedItem.name}
                className="w-32 h-32 text-4xl shadow-md border-4 border-zinc-50"
              />
            </div>

            <h3 className="font-bold text-xl text-zinc-800 leading-tight text-center">
              {selectedItem.name}
            </h3>

            <div className="flex justify-center gap-2">
              <div className="text-xs text-muted-foreground font-mono bg-zinc-100 px-2 py-1 rounded-md">
                SKU: {selectedItem.code}
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-zinc-100 px-2 py-1 rounded-md flex items-center gap-1">
                <Package className="w-3 h-3" /> {selectedItem.stock} en stock
              </div>
            </div>

            {selectedItem.category_name && (
              <div className="flex justify-center mt-2">
                <div
                  className="text-xs px-2.5 py-1 rounded-full font-medium shadow-sm border"
                  style={{
                    backgroundColor: (selectedItem.category_color || "#64748b") + "15",
                    borderColor: (selectedItem.category_color || "#64748b") + "30",
                    color: selectedItem.category_color || "#64748b",
                  }}
                >
                  {selectedItem.category_name}
                </div>
              </div>
            )}

            {selectedItem.description && selectedItem.description.trim() !== "" && (
              <div className="my-3 px-2">
                <p className="text-sm text-center italic p-2 rounded-lg border text-zinc-600 bg-zinc-50 border-zinc-100">
                  {selectedItem.description}
                </p>
              </div>
            )}
            
            <div className="space-y-3 pt-4 px-2">
              <div className="flex justify-between items-center text-sm p-2 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500 font-medium">Precio Menudeo:</span>
                <span className="font-bold text-lg">{formatCurrency(selectedItem.retail_price)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-amber-50 rounded-lg">
                <span className="text-amber-700/70 font-medium">Precio Mayoreo:</span>
                <span className="font-bold text-lg text-amber-700">{formatCurrency(selectedItem.wholesale_price)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-6">
            <div className="w-full max-w-[240px] aspect-square rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center space-y-4 bg-zinc-50/50">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <PackageOpen className="w-8 h-8 text-zinc-300" />
              </div>
              <p className="text-sm text-center font-medium text-zinc-500">
                Selecciona un producto<br />para ver sus detalles
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── ABAJO: Totales y Cobrar (Footer fijo) ── */}
      <div className="p-4 border-t bg-zinc-50 space-y-3 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)] border-l">
        {/* Desglose de Totales */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-200">
          {hasItems && (
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Resumen de Venta</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                onClick={onClearTicket}
                title="Vaciar ticket completo"
              >
                <Trash className="w-3 h-3 mr-1" /> Vaciar Ticket
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {hasDiscount && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(ticketSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-red-600 font-medium bg-red-50 p-1.5 rounded pr-2">
                  <span className="flex items-center gap-1.5">
                    <div className="bg-red-100 p-0.5 rounded-sm">
                      <Percent className="w-3 h-3 text-red-600" />
                    </div>
                    Descuento ({activeTicket.discountPercentage}%):
                  </span>
                <span>
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
              <div className="h-px bg-zinc-100 w-full my-1"></div>
            </>
          )}

          <div className="flex justify-between items-end pt-1">
            <span className="text-sm uppercase tracking-wider font-bold text-zinc-500">Total</span>
            <span className="text-4xl font-black text-[#480489] tabular-nums tracking-tight">
              {formatCurrency(ticketTotal)}
            </span>
          </div>
          </div>
        </div>

        {/* Botón Cobrar */}
        {canCreateSales && (
          <Button
            className="w-full bg-[#480489] hover:bg-[#360368] h-14 text-xl shadow-lg transition-all active:scale-[0.98] mt-2 relative overflow-hidden group"
            disabled={!isShiftOpen || ticketTotal === 0}
            onClick={onCheckout}
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full -translate-x-full transition-transform duration-500 skew-x-12"></div>
            <Wallet className="w-6 h-6 mr-2" />
            <span className="tracking-wide font-bold">Cobrar</span>
            <span className="ml-2 text-sm font-medium opacity-80 bg-black/20 px-2 py-0.5 rounded text-white">(F12)</span>
          </Button>
        )}
      </div>
    </div>
  );
}
