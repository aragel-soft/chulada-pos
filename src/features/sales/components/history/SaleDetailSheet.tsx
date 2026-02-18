import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SaleHistoryItem } from "@/types/sales-history";
import { useSaleDetail } from "@/hooks/use-sales-history";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { Loader2, User, X, Ban, Printer } from "lucide-react";
import { toast } from "sonner";
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
import { ProductImagePreview } from "@/features/inventory/components/products/ProductImageHover";
import { ReturnModal } from "@/features/sales/components/returns/ReturnModal";
import { BADGE_CONFIGS, BadgeType } from "@/features/sales/constants/sales-design";
import { useAuthStore } from "@/stores/authStore";
import { printSaleTicket, printReturnVoucher } from "@/lib/api/cash-register/sales";

const RETURN_REASON_LABELS: Record<string, string> = {
  quality: "Producto dañado / Mala calidad",
  dissatisfied: "Cliente insatisfecho",
  mistake: "Error en venta / Producto incorrecto",
  change: "Cambio de parecer",
  cancellation: "Cancelación de venta",
  other: "Otro",
};

interface SaleDetailPanelProps {
  saleId: string | null;
  onClose: () => void;
}

export function SaleDetailPanel({ saleId, onClose }: SaleDetailPanelProps) {
  const { can } = useAuthStore();

  const { data: sale, isLoading } = useSaleDetail(saleId);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);

  const daysSinceSale = sale
    ? differenceInDays(new Date(), new Date(sale.sale_date))
    : 999;
  const canReturn = daysSinceSale <= 30;
  
  // TODO: La validación de tiempo será ajustada cuando se corrija el problema de zona horaria en la base de datos.
  const canCancel = daysSinceSale < 2 && sale?.status !== "cancelled" && sale?.status !== "fully_returned" && sale?.status !== "partial_return";
  
  // Hide buttons completely if sale is cancelled or fully returned
  const showActionButtons = sale?.status !== "cancelled" && sale?.status !== "fully_returned";
  
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
                <Badge variant={BADGE_CONFIGS.cancelled.variant} className={BADGE_CONFIGS.cancelled.className}>
                  {BADGE_CONFIGS.cancelled.label}
                </Badge>
              )}
              {sale?.status === "partial_return" && (
                <Badge className={BADGE_CONFIGS.partial_return.className}>
                  {BADGE_CONFIGS.partial_return.icon && <BADGE_CONFIGS.partial_return.icon className="w-3 h-3 text-white" />}
                  {BADGE_CONFIGS.partial_return.label}
                </Badge>
              )}
              {sale?.status === "fully_returned" && (
                <Badge className={BADGE_CONFIGS.fully_returned.className}>
                  {BADGE_CONFIGS.fully_returned.icon && <BADGE_CONFIGS.fully_returned.icon className="w-3 h-3 text-white" />}
                  {BADGE_CONFIGS.fully_returned.label}
                </Badge>
              )}
              {sale?.is_credit && (
                <Badge className={BADGE_CONFIGS.credit.className}>
                  {BADGE_CONFIGS.credit.label}
                </Badge>
              )}
              {(sale?.has_discount ||
                (sale?.discount_global_percent ?? 0) > 0) && (
                <Badge className={BADGE_CONFIGS.discount_global.className}>
                  {BADGE_CONFIGS.discount_global.icon && <BADGE_CONFIGS.discount_global.icon className="w-3 h-3 text-white" />}
                  {BADGE_CONFIGS.discount_global.label}
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

            {showActionButtons && (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="w-full mt-3 cursor-not-allowed"> 
                     {can("history:devolution") && <Button
                      variant="outline"
                      className="w-full pointer-events-auto" 
                      onClick={() => setReturnModalOpen(true)}
                      disabled={!canProcessReturn}
                    >
                      Procesar Devolución
                    </Button>}
                  </div>
                </TooltipTrigger>
                {!canProcessReturn && (
                  <TooltipContent className="bg-destructive text-destructive-foreground border-destructive/20">
                    <p>
                      {!canReturn
                        ? "Esta venta excede el periodo permitido de devoluciones (30 días)"
                        : "Todos los items ya han sido devueltos"
                      }
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            )}

            {/* Cancel Sale Button - TODO: ajustar validación de tiempo cuando se corrija zona horaria en BD */}
            {showActionButtons && (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="w-full mt-2 cursor-not-allowed">
                    {can("history:devolution") && <Button
                      variant="destructive"
                      className="w-full pointer-events-auto gap-2"
                      onClick={() => setCancellationModalOpen(true)}
                      disabled={!canCancel}
                    >
                      <Ban className="h-4 w-4" />
                      Cancelar Venta
                    </Button>}
                  </div>
                </TooltipTrigger>
                {(!canCancel && can("history:devolution")) && (
                  <TooltipContent className="bg-destructive text-destructive-foreground border-destructive/20">
                    <p>
                      {sale.status === "partial_return"
                        ? "No se puede cancelar una venta con devoluciones"
                        : "Esta venta excede el tiempo permitido para cancelación"
                      }
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            )}
          </>
        )}
      </div>

      {sale && (
        <ReturnModal
          sale={sale}
          isOpen={returnModalOpen}
          onClose={() => setReturnModalOpen(false)}
          mode="return"
        />
      )}

      {sale && (
        <ReturnModal
          sale={sale}
          isOpen={cancellationModalOpen}
          onClose={() => setCancellationModalOpen(false)}
          mode="cancellation"
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

            {/* NOTAS */}
            {(sale.notes || sale.returns?.length > 0) && (
              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Notas</h3>
                
                {/* Nota de la venta */}
                {sale.notes && (
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-yellow-800">Venta</span>
                    </div>
                    <p className="text-yellow-700">{sale.notes}</p>
                  </div>
                )}

                {/* Notas de devoluciones/cancelaciones */}
                {sale.returns?.map((ret) => {
                  const reasonLabel = RETURN_REASON_LABELS[ret.reason] || ret.reason;
                  
                  return (
                    <div 
                      key={ret.id} 
                      className={`p-3 rounded-md border text-sm ${
                        ret.reason === "cancellation" 
                          ? "bg-red-50 border-red-200" 
                          : "bg-purple-50 border-purple-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            ret.reason === "cancellation" ? "text-red-800" : "text-purple-800"
                          }`}>
                            {ret.reason === "cancellation" ? "Cancelación" : "Devolución"}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className={ret.reason === "cancellation" ? "text-red-700" : "text-purple-700"}>
                            {reasonLabel}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ret.return_date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                      {ret.notes && (
                        <p className={`mt-1 ${ret.reason === "cancellation" ? "text-red-600" : "text-purple-600"}`}>
                          {ret.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

          <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
            <div className="flex flex-col">
              <span>Efectivo</span>
              <span className="font-mono text-black">
                {formatCurrency(sale.cash_amount)}
              </span>
            </div>
            {sale.card_amount > 0 ? (
              <div className="flex flex-col text-center">
                <span>Tarjeta / Transf</span>
                <span className="font-mono text-black">
                  {formatCurrency(sale.card_amount)}
                </span>
              </div>
            ) : <div></div>}
            {sale.voucher_amount > 0 ? (
              <div className="flex flex-col text-center">
                <span>Vale</span>
                <span className="font-mono text-black">
                  {formatCurrency(sale.voucher_amount)}
                </span>
              </div>
            ) : <div></div>}
            <div className="flex flex-col text-right">
              <span>Cambio</span>
              <span className="font-mono text-black">
                {formatCurrency(sale.change_returned)}
              </span>
            </div>
          </div>

          {/* Reprint Buttons */}
          {can('history:devolution') && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-dashed">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled={sale.status === 'cancelled' || sale.status === 'fully_returned'}
                        onClick={() => printSaleTicket(sale.id)
                          .then(() => toast.success('Ticket enviado a imprimir'))
                          .catch((e) => toast.error('Error al reimprimir', { description: String(e) }))}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        Reimprimir Ticket
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {(sale.status === 'cancelled' || sale.status === 'fully_returned') && (
                    <TooltipContent>
                      <p>
                        {sale.status === 'cancelled'
                          ? 'No se puede reimprimir una venta cancelada'
                          : 'No se puede reimprimir una venta con devolución total'}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              {sale.voucher && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          disabled={
                            sale.voucher.is_used ||
                            sale.voucher.is_expired ||
                            !sale.voucher.is_active
                          }
                          onClick={() => printReturnVoucher(sale.id)
                            .then(() => toast.success('Vale enviado a imprimir'))
                            .catch((e) => toast.error('Error al reimprimir vale', { description: String(e) }))}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          Reimprimir Vale
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(sale.voucher.is_used || sale.voucher.is_expired || !sale.voucher.is_active) && (
                      <TooltipContent>
                        <p>
                          {sale.voucher.is_used
                            ? 'Vale ya utilizado'
                            : sale.voucher.is_expired
                              ? 'Vale expirado'
                              : 'Vale inactivo'}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
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
  const getBadgeTypes = (item: SaleHistoryItem): BadgeType[] => {
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