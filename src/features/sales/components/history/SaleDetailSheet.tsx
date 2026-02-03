import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SaleHistoryItem } from "@/types/sales-history";
import { useSaleDetail } from "@/hooks/use-sales-history";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Package, Gift, Tag, User, X, RotateCcw } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppAvatar } from "@/components/ui/app-avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProductImagePreview } from "@/features/inventory/components/ProductImageHover";
import { ReturnModal } from "@/features/sales/components/returns/ReturnModal";

interface SaleDetailPanelProps {
  saleId: string | null;
  onClose: () => void;
}

type BadgeType = "wholesale" | "promo" | "gift" | "kit";

interface BadgeConfig {
  variant?: "outline" | "secondary";
  className: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  getLabel?: (item: any) => string;
}

const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  wholesale: {
    className:
      "h-5 px-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 font-bold",
    label: "MAYOREO",
  },
  promo: {
    className:
      "h-5 px-1 text-[10px] bg-purple-50 text-purple-700 border-purple-200",
    icon: Tag,
    getLabel: (item) =>
      item.promotion_name
        ? `PROMO: ${item.promotion_name.toUpperCase()}`
        : "PROMO",
  },
  gift: {
    className:
      "h-5 px-1 text-[10px] bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100",
    icon: Gift,
    label: "REGALO",
  },
  kit: {
    variant: "secondary",
    className: "h-5 px-1 text-[10px]",
    icon: Package,
    label: "KIT",
  },
};

export function SaleDetailPanel({ saleId, onClose }: SaleDetailPanelProps) {
  const { data: sale, isLoading } = useSaleDetail(saleId);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const daysSinceSale = sale
    ? differenceInDays(new Date(), new Date(sale.sale_date))
    : 999;
  const canReturn = daysSinceSale <= 30;
  
  // Check if there are any items available to return
  const hasItemsToReturn = sale?.items.some(item => item.quantity_available > 0) ?? false;
  const canProcessReturn = canReturn && hasItemsToReturn && sale?.status !== "cancelled";

  return (
    <div className="flex flex-col h-full bg-white w-full border-l shadow-sm">
      {/* HEADER */}
      <div className="p-6 border-b bg-muted/5 relative shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8 text-muted-foreground hover:text-foreground z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </Button>

        <div className="mb-4 pr-10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-2xl font-mono font-semibold tracking-tight">
              {sale?.folio || "Cargando..."}
            </h2>

            <div className="flex gap-2">
              {sale?.status === "cancelled" && (
                <Badge variant="destructive">CANCELADA</Badge>
              )}
              {sale?.status === "partial_return" && (
                <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white border-none flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-white" />
                  DEVOLUCIÓN PARCIAL
                </Badge>
              )}
              {sale?.status === "fully_returned" && (
                <Badge className="bg-slate-600 hover:bg-slate-700 text-white border-none flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-white" />
                  DEVOLUCIÓN TOTAL
                </Badge>
              )}
              {sale?.is_credit && (
                <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                  A CRÉDITO
                </Badge>
              )}
              {(sale?.has_discount ||
                (sale?.discount_global_percent ?? 0) > 0) && (
                <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-none flex items-center gap-1">
                  <Tag className="w-3 h-3 text-white" />
                  CON DESCUENTO
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {sale
              ? format(new Date(sale.sale_date), "PPP 'a las' p", {
                  locale: es,
                })
              : "..."}
          </p>
        </div>

        {sale && (
          <>
            <div className="flex items-center gap-3 bg-white p-3 rounded-md border shadow-sm">
              <Avatar className="h-10 w-10">
                <AvatarImage src={sale.user_avatar} />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Vendedor</p>
                <p className="text-xs text-muted-foreground">{sale.user_name}</p>
              </div>
              <div className="ml-auto flex gap-2">
                {sale.payment_method === "credit" && (
                  <Badge className="bg-purple-600">A CRÉDITO</Badge>
                )}
                {sale.has_discount && (
                  <Badge
                    variant="secondary"
                    className="text-orange-600 border-orange-200 bg-orange-50"
                  >
                    DESCUENTO
                  </Badge>
                )}
              </div>
            </div>

            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="w-full mt-3 cursor-not-allowed"> 
                    <Button
                      variant="outline"
                      className="w-full pointer-events-auto" 
                      onClick={() => setReturnModalOpen(true)}
                      disabled={!canProcessReturn}
                    >
                      Procesar Devolución
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canProcessReturn && (
                  <TooltipContent className="bg-destructive text-destructive-foreground border-destructive/20">
                    <p>
                      {sale.status === "cancelled" 
                        ? "No se pueden procesar devoluciones de ventas canceladas"
                        : !canReturn
                          ? "Esta venta excede el periodo permitido de devoluciones (30 días)"
                          : "Todos los items ya han sido devueltos"
                      }
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>

      {sale && (
        <ReturnModal
          sale={sale}
          isOpen={returnModalOpen}
          onClose={() => setReturnModalOpen(false)}
        />
      )}

      {/* BODY */}
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sale ? (
          <div className="space-y-6">
            {/* ITEMS TABLE */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left pb-2 font-medium pl-1">Producto</th>
                   <th className="text-center pb-2 font-medium">Cant.</th>
                  <th className="text-right pb-2 font-medium">Precio</th>
                  <th className="text-right pb-2 font-medium pr-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sale.items.map((item) => (
                  <ItemRowWithReturns key={item.id} item={item} />
                ))}
              </tbody>
            </table>

            {/* NOTAS Y RAZONES */}
            <div className="space-y-2">
              {sale.notes && (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-800">
                  <span className="font-semibold">Nota:</span> {sale.notes}
                </div>
              )}
              {sale.cancellation_reason && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-800">
                  <span className="font-semibold">Motivo Cancelación:</span>{" "}
                  {sale.cancellation_reason}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </ScrollArea>

      {/* FOOTER */}
      {sale && (
        <div className="p-6 border-t bg-muted/5 space-y-3 shrink-0">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>

          {sale.discount_global_amount > 0 && (
            <div className="flex justify-between text-sm text-red-600 font-medium">
              <span>Descuento Global ({sale.discount_global_percent}%)</span>
              <span>- {formatCurrency(sale.discount_global_amount)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
            <div className="flex flex-col">
              <span>Efectivo</span>
              <span className="font-mono text-black">
                {formatCurrency(sale.cash_amount)}
              </span>
            </div>
            {(sale.card_amount > 0 || sale.payment_method === "mixed") && (
              <div className="flex flex-col text-right">
                <span>Tarjeta / Transf</span>
                <span className="font-mono text-black">
                  {formatCurrency(sale.card_amount)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
interface SaleDetailSheetProps extends SaleDetailPanelProps {
  isOpen: boolean;
}

export function SaleDetailSheet({ isOpen, ...props }: SaleDetailSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={props.onClose}>
      <SheetContent className="sm:max-w-xl w-full p-0 gap-0 [&>button]:hidden border-l-0">
        <SaleDetailPanel {...props} />
      </SheetContent>
    </Sheet>
  );
}

function ItemRowWithReturns({ item }: { item: SaleHistoryItem }) {
  const getBadgeTypes = (item: any): BadgeType[] => {
    const badges: BadgeType[] = [];

    if (item.price_type === "wholesale") badges.push("wholesale");
    if (item.price_type === "promo") badges.push("promo");
    
    if (item.price_type === 'kit_item' && item.is_gift) badges.push("gift");
    if (item.price_type === 'kit_item' && !item.is_gift) badges.push("kit");

    return badges;
  };

  const isPartiallyReturned = item.quantity_returned > 0 && item.quantity_available > 0;
  const isFullyReturned = item.quantity_available === 0;

  return (
    <tr className={`group ${isFullyReturned ? 'opacity-50 bg-slate-50' : ''}`}>
      <td className="py-3 pr-2 pl-1">
        <div className="flex items-center gap-3">
          {/* IMAGE */}
          <div className="flex items-center justify-center shrink-0">
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="cursor-pointer">
                  <AppAvatar
                    name={item.product_name}
                    path={item.product_image}
                    className="h-9 w-9 border border-zinc-200"
                    variant="muted"
                  />
                </div>
              </HoverCardTrigger>

              {item.product_image && (
                <HoverCardContent
                  className="w-64 p-0 overflow-hidden border-2 z-50 bg-white"
                  side="right"
                  align="start"
                >
                  <ProductImagePreview
                    path={item.product_image}
                    alt={item.product_name}
                  />
                </HoverCardContent>
              )}
            </HoverCard>
          </div>

          <div className="flex flex-col items-start gap-0.5">
            {/* NAME */}
            <span className="font-medium text-gray-900 line-clamp-1 break-all">
              {item.product_name}
            </span>

            {/* BADGES */}
            <div className="flex gap-1 flex-wrap">
              {getBadgeTypes(item).map((type, index) => {
                const config = BADGE_CONFIGS[type]; 
                const Icon = config.icon;
                const label = config.getLabel ? config.getLabel(item) : config.label;
                
                return (
                  <Badge
                    key={`badge-${type}-${index}`}
                    variant={config.variant || "outline"}
                    className={config.className}
                  >
                    {Icon && <Icon className="w-3 h-3 mr-1" />}
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </td>
      <td className={`py-3 text-center align-top ${isFullyReturned ? 'text-slate-400 line-through' : 'text-gray-600'}`}>
        {/* Show return breakdown in quantity column */}
        {isPartiallyReturned || isFullyReturned ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className={isFullyReturned ? 'line-through text-slate-400' : ''}>x{item.quantity}</span>
            <span className={`text-[10px] ${isFullyReturned ? 'text-slate-500' : 'text-orange-600 font-semibold'}`}>
              {isFullyReturned ? `(${item.quantity_returned} devueltos)` : `-${item.quantity_returned} dev.`}
            </span>
          </div>
        ) : (
          <span>x{item.quantity}</span>
        )}
      </td>
      <td className={`py-3 text-right align-top ${isFullyReturned ? 'text-slate-400' : 'text-gray-600'}`}>
        {item.is_gift ? (
          <span className="line-through text-xs text-muted-foreground">
            {formatCurrency(item.unit_price)}
          </span>
        ) : (
          formatCurrency(item.unit_price)
        )}
      </td>
      <td className="py-3 text-right align-top font-medium pr-1">
        {item.is_gift ? (
          <span className="text-green-600 font-bold">GRATIS</span>
        ) : (
          formatCurrency(item.subtotal)
        )}
      </td>
    </tr>
  );
}