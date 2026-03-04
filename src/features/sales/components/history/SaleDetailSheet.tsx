import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SaleHistoryItem } from "@/types/sales-history";
import { useSaleDetail } from "@/hooks/use-sales-history";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { Loader2, X, Ban, Printer } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
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
import { printSaleTicket, printReturnVoucher } from "@/lib/api/printers";
import { useCancelSale } from "@/features/sales/hooks/useCancelSale";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";

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
  const { cancelSale, isProcessing: isCancelling } = useCancelSale();

  const daysSinceSale = sale
    ? differenceInDays(new Date(), new Date(sale.sale_date))
    : 999;
  const canReturn = daysSinceSale <= 30;
  const { shift: activeShift } = useCashRegisterStore();
  const hoursSinceSale = sale
    ? differenceInHours(new Date(), new Date(sale.sale_date))
    : 999;
  
  const canCancel = sale?.status === "completed" && 
    hoursSinceSale < 1 &&
    !!activeShift && 
    sale?.cash_register_shift_id === String(activeShift.id);
  
  const showActionButtons = sale?.status !== "cancelled" && sale?.status !== "fully_returned";
  
  const hasItemsToReturn = sale?.items.some(item => item.quantity_available > 0) ?? false;
  const canProcessReturn = canReturn && hasItemsToReturn && sale?.status !== "cancelled";

  return (
    <div className="flex flex-col h-full bg-white w-full">
      <div className="p-4 bg-muted/5 relative shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </Button>

        <div className="mb-3 pr-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-mono font-semibold tracking-tight">
                {sale?.folio || "Cargando..."}
              </h2>
              <span className="text-sm text-muted-foreground">
                {sale ? format(new Date(sale.sale_date), "dd/MM/yy HH:mm", { locale: es }) : "..."}
              </span>
            </div>

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
        </div>

        {sale && (
          <>
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-md border shadow-sm">
                <AppAvatar
                  name={sale?.user_name || 'Usuario'}
                  path={sale?.user_avatar || null}
                  className="h-8 w-8"
                />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">Vendedor</p>
                  <p className="text-sm font-medium leading-tight">{sale.user_name}</p>
                </div>
                <div className="flex gap-1.5">
                  {sale.payment_method === "credit" && (
                    <Badge className="bg-purple-600 text-[10px] px-1.5 py-0 h-5">A CRÉDITO</Badge>
                  )}
                  {sale.has_discount && (
                    <Badge
                      variant="secondary"
                      className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] px-1.5 py-0 h-5"
                    >
                      DESCUENTO
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {showActionButtons && (
              <div className="flex gap-2 mt-3 w-full">
                {can("history:devolution") && (
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 cursor-not-allowed"> 
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full pointer-events-auto text-xs h-8" 
                            onClick={() => setReturnModalOpen(true)}
                            disabled={!canProcessReturn}
                          >
                            Devolución
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!canProcessReturn && (
                        <TooltipContent className="bg-destructive text-destructive-foreground border-destructive/20">
                          <p>
                            {!canReturn
                              ? "Excede el periodo permitido de devoluciones (30 días)"
                              : "Todos los items ya han sido devueltos"
                            }
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                {can("history:cancel") && (
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 cursor-not-allowed">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full pointer-events-auto gap-1.5 text-xs h-8"
                            onClick={() => setCancellationModalOpen(true)}
                            disabled={!canCancel}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancelar
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {(!canCancel && can("history:cancel")) && (
                        <TooltipContent className="bg-destructive text-destructive-foreground border-destructive/20">
                          <p>
                            {sale.status === "partial_return"
                              ? "No se puede cancelar una venta con devoluciones"
                              : "Excede el tiempo permitido para cancelación"
                            }
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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
          onCancelSale={cancelSale}
          isCancelling={isCancelling}
        />
      )}

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sale ? (
          <div className="space-y-4">
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

            {(sale.notes || sale.returns?.length > 0 || sale.status === "cancelled") && (
              <div className="space-y-2.5 mt-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas y Movimientos</h3>
                
                {sale.notes && (
                  <div className="bg-yellow-50 p-2.5 rounded-md border border-yellow-200 text-sm">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-yellow-800 text-xs">Venta</span>
                    </div>
                    <p className="text-yellow-700 text-xs">{sale.notes}</p>
                  </div>
                )}

                {sale.status === "cancelled" && sale.cancellation_reason && (
                  <div className="p-2.5 rounded-md border text-sm bg-red-50 border-red-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <Ban className="h-3 w-3 text-red-700" />
                        <span className="font-semibold text-xs text-red-800">Cancelación</span>
                      </div>
                      {sale.cancelled_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(sale.cancelled_at), "dd/MM/yy HH:mm", { locale: es })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-red-600">{sale.cancellation_reason}</p>
                  </div>
                )}

                {sale.returns?.map((ret) => {
                  const reasonLabel = RETURN_REASON_LABELS[ret.reason] || ret.reason;
                  
                  return (
                    <div 
                      key={ret.id} 
                      className="p-2.5 rounded-md border text-sm bg-purple-50 border-purple-200"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-purple-800">
                            Devolución
                          </span>
                          <span className="text-muted-foreground text-xs">•</span>
                          <span className="text-xs text-purple-700">
                            {reasonLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(ret.return_date), "dd/MM/yy HH:mm", { locale: es })}
                        </span>
                      </div>
                      {ret.notes && (
                        <p className="mt-0.5 text-xs text-purple-600">
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

      {sale && (
        <div className="p-4 border-t bg-muted/5 shrink-0">
          <div className="flex items-end justify-between mb-3">
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-muted-foreground leading-none">Subtotal: <span className="text-foreground">{formatCurrency(sale.subtotal)}</span></span>
              {sale.discount_global_amount > 0 && (
                <span className="text-red-600 font-medium text-xs leading-none">
                  Desc ({sale.discount_global_percent}%): -{formatCurrency(sale.discount_global_amount)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold leading-none">{formatCurrency(sale.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 py-2.5 border-y border-dashed text-[11px] text-muted-foreground">
            <div className="flex flex-col">
              <span>Efectivo</span>
              <span className="font-mono text-black text-xs">
                {formatCurrency(sale.cash_amount)}
              </span>
            </div>
            {sale.card_amount > 0 ? (
              <div className="flex flex-col text-center">
                <span>Tarjeta</span>
                <span className="font-mono text-black text-xs">
                  {formatCurrency(sale.card_amount)}
                </span>
              </div>
            ) : <div></div>}
            {sale.voucher_amount > 0 ? (
              <div className="flex flex-col text-center">
                <span>Vale</span>
                <span className="font-mono text-black text-xs">
                  {formatCurrency(sale.voucher_amount)}
                </span>
              </div>
            ) : <div></div>}
            <div className="flex flex-col text-right">
              <span>Cambio</span>
              <span className="font-mono text-black text-xs">
                {formatCurrency(sale.change_returned)}
              </span>
            </div>
          </div>

          {can('history:devolution') && (
            <div className="flex gap-2 mt-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8"
                        disabled={sale.status === 'cancelled' || sale.status === 'fully_returned'}
                        onClick={() => printSaleTicket(sale.id)
                          .then(() => toast.success('Ticket enviado a imprimir'))
                          .catch((e) => toast.error('Error al reimprimir', { description: String(e) }))}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        Ticket
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
                          className="w-full text-xs h-8"
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
                          Vale
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
      <td className="py-2.5 pr-2 pl-1">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center shrink-0">
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="cursor-pointer">
                  <AppAvatar
                    name={item.product_name}
                    path={item.product_image}
                    className="h-8 w-8 border border-zinc-200"
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

          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <span className="font-medium text-gray-900 line-clamp-1 break-all text-xs cursor-help w-full">
                    {item.product_name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-[200px] break-words text-xs bg-slate-800 text-slate-100 border-slate-700">
                  <p>{item.product_name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex gap-1 flex-wrap items-center">
              {getBadgeTypes(item).map((type, index) => {
                const config = BADGE_CONFIGS[type];
                const Icon = config.icon;
                const fullLabel = config.getLabel ? config.getLabel(item) : config.label;
                const isLongLabelType = type === 'promo';

                const badgeContent = (
                  <>
                    {Icon && <Icon className="w-2.5 h-2.5 mr-0.5 shrink-0" />}
                    <span className={`leading-none ${isLongLabelType ? 'truncate max-w-[180px]' : ''}`}>
                      {fullLabel}
                    </span>
                  </>
                );

                const badgeElement = (
                  <Badge
                    key={`badge-${type}-${index}`}
                    variant={config.variant || "outline"}
                    className={`${config.className} text-[9px] px-1 py-0 h-4 flex items-center min-w-0`}
                  >
                    {badgeContent}
                  </Badge>
                );

                if (isLongLabelType) {
                  return (
                    <TooltipProvider key={`tooltip-${type}-${index}`}>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild className="cursor-help">
                          {badgeElement}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-[200px] break-words text-xs bg-slate-800 text-slate-100 border-slate-700">
                          <p>{fullLabel}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return badgeElement;
              })}
            </div>

          </div>
        </div>
      </td>
      <td className={`py-2.5 text-center align-top ${isFullyReturned ? 'text-slate-400 line-through' : 'text-gray-600'}`}>
        {isPartiallyReturned || isFullyReturned ? (
          <div className="flex flex-col items-center gap-0">
            <span className={isFullyReturned ? 'line-through text-slate-400 text-xs' : 'text-xs'}>x{item.quantity}</span>
            <span className={`text-[9px] leading-tight ${isFullyReturned ? 'text-slate-500' : 'text-orange-600 font-semibold'}`}>
              {isFullyReturned ? `(${item.quantity_returned} devueltos)` : `-${item.quantity_returned} dev.`}
            </span>
          </div>
        ) : (
          <span className="text-xs">x{item.quantity}</span>
        )}
      </td>
      <td className={`py-2.5 text-right align-top text-xs ${isFullyReturned ? 'text-slate-400' : 'text-gray-600'}`}>
        {item.is_gift ? (
          <span className="line-through text-[10px] text-muted-foreground">
            {formatCurrency(item.unit_price)}
          </span>
        ) : (
          formatCurrency(item.unit_price)
        )}
      </td>
      <td className="py-2.5 text-right align-top font-medium pr-1 text-xs">
        {item.is_gift ? (
          <span className="text-green-600 font-bold">GRATIS</span>
        ) : (
          formatCurrency(item.subtotal)
        )}
      </td>
    </tr>
  );
}
