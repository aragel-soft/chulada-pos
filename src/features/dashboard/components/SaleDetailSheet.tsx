import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { SaleDetail, SaleHistoryItem } from '@/types/sales-history';
import { useSaleDetail } from '@/hooks/use-sales-history';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Package, Gift, Tag, User, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SaleDetailSheetProps {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SaleDetailSheet({ saleId, isOpen, onClose }: SaleDetailSheetProps) {
  const { data: sale, isLoading } = useSaleDetail(saleId);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col p-0 bg-white">
        
        {/* HEADER */}
        <div className="p-6 border-b bg-muted/5">
            <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-mono">{sale?.folio || 'Cargando...'}</SheetTitle>
                {sale?.status === 'cancelled' && <Badge variant="destructive">CANCELADA</Badge>}
            </div>
            <SheetDescription>
                {sale ? format(new Date(sale.sale_date), "PPP 'a las' p", { locale: es }) : '...'}
            </SheetDescription>
            </SheetHeader>

            {sale && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-md border shadow-sm">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={sale.user_avatar} />
                        <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-medium">Vendedor</p>
                        <p className="text-xs text-muted-foreground">{sale.user_name}</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {sale.payment_method === 'credit' && <Badge className="bg-purple-600">A CRÉDITO</Badge>}
                        {sale.has_discount && <Badge variant="secondary" className="text-orange-600 border-orange-200 bg-orange-50">DESCUENTO</Badge>}
                    </div>
                </div>
            )}
        </div>

        {/* BODY  */}
        <ScrollArea className="flex-1 p-6">
            {isLoading ? (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : sale ? (
                <div className="space-y-6">
                    {/* ITEMS */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted-foreground border-b">
                                <th className="text-left pb-2 font-medium">Producto</th>
                                <th className="text-right pb-2 font-medium">Cant.</th>
                                <th className="text-right pb-2 font-medium">Precio</th>
                                <th className="text-right pb-2 font-medium">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sale.items.map((item) => (
                                <ItemRow key={item.id} item={item} />
                            ))}
                        </tbody>
                    </table>

                    {sale.notes && (
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-800">
                            <span className="font-semibold">Nota:</span> {sale.notes}
                        </div>
                    )}
                     {sale.cancellation_reason && (
                        <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-800">
                            <span className="font-semibold">Motivo Cancelación:</span> {sale.cancellation_reason}
                        </div>
                    )}
                </div>
            ) : null}
        </ScrollArea>

        {/* FOOTER */}
        {sale && (
            <div className="p-6 border-t bg-muted/5 space-y-3">
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
                        <span className="font-mono text-black">{formatCurrency(sale.cash_amount)}</span>
                    </div>
                    {(sale.card_amount > 0 || sale.payment_method === 'mixed') && (
                        <div className="flex flex-col text-right">
                            <span>Tarjeta / Transf</span>
                            <span className="font-mono text-black">{formatCurrency(sale.card_amount)}</span>
                        </div>
                    )}
                </div>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemRow({ item }: { item: SaleHistoryItem }) {
    return (
        <tr className="group">
            <td className="py-3 pr-2">
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.product_name}</span>
                    
                    {/* BADGES */}
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {item.price_type === 'wholesale' && (
                            <Badge variant="outline" className="h-5 px-1 text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                MAYOREO
                            </Badge>
                        )}
                        {item.price_type === 'promo' && (
                            <Badge variant="outline" className="h-5 px-1 text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                <Tag className="w-3 h-3 mr-1"/> PROMO
                            </Badge>
                        )}
                        {item.is_kit_item && item.is_gift && (
                            <Badge className="h-5 px-1 text-[10px] bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100">
                                <Gift className="w-3 h-3 mr-1"/> REGALO
                            </Badge>
                        )}
                         {item.is_kit_item && !item.is_gift && (
                            <Badge variant="secondary" className="h-5 px-1 text-[10px]">
                                <Package className="w-3 h-3 mr-1"/> KIT
                            </Badge>
                        )}
                    </div>
                </div>
            </td>
            <td className="py-3 text-right align-top text-gray-600">x{item.quantity}</td>
            <td className="py-3 text-right align-top text-gray-600">
                {item.is_gift ? (
                    <span className="line-through text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                ) : (
                    formatCurrency(item.unit_price)
                )}
            </td>
            <td className="py-3 text-right align-top font-medium">
                {item.is_gift ? (
                    <span className="text-green-600 font-bold">GRATIS</span>
                ) : (
                    formatCurrency(item.subtotal)
                )}
            </td>
        </tr>
    )
}