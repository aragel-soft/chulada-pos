import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CreditCard,
  Banknote,
  User,
  FileText,
  Printer,
  Loader2,
  X,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { getPaymentDetails } from "@/lib/api/account";
import { printPaymentReceipt } from "@/lib/api/printers";
import { AccountMovement } from "@/types/account";

const PAYMENT_METHOD_LABELS: Record<
  string,
  { label: string; icon: typeof Banknote }
> = {
  cash: { label: "Efectivo", icon: Banknote },
  card: { label: "Tarjeta / Transferencia", icon: CreditCard },
  mixed: { label: "Mixto (Efectivo + Tarjeta)", icon: CreditCard },
  transfer: { label: "Transferencia", icon: CreditCard },
};

interface PaymentDetailPanelProps {
  paymentId: string | null;
  onClose: () => void;
}

export function PaymentDetailPanel({
  paymentId,
  onClose,
}: PaymentDetailPanelProps) {
  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment-detail", paymentId],
    queryFn: () => getPaymentDetails(paymentId!),
    enabled: !!paymentId,
  });

  const handleReprint = async () => {
    if (!payment) return;
    toast.info("Imprimiendo comprobante...");
    try {
      await printPaymentReceipt(payment.id);
      toast.success("Comprobante enviado a imprimir");
    } catch (e) {
      toast.error("Error al reimprimir", { description: String(e) });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white w-full border-l shadow-sm overflow-y-auto">
      {/* ── HEADER ── */}
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
              {payment?.folio || "Cargando..."}
            </h2>

            <Badge className="bg-emerald-600 text-white">
              <Receipt className="w-3 h-3 mr-1" />
              Abono
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {payment
              ? format(new Date(payment.payment_date), "PPP 'a las' p", {
                  locale: es,
                })
              : "..."}
          </p>
        </div>

        {/* Cashier Card */}
        {payment && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-md border shadow-sm">
            <Avatar className="h-10 w-10">
              <AvatarImage src={payment.user_avatar} />
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Cajero</p>
              <p className="text-xs text-muted-foreground">
                {payment.user_name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : payment ? (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center py-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-sm font-medium text-emerald-600 uppercase tracking-wider mb-1">
                Monto Abonado
              </span>
              <span className="text-3xl font-bold text-emerald-700 tabular-nums">
                {formatCurrency(payment.amount)}
              </span>
            </div>

            <Separator />

            {/* DETAILS LIST */}
            <div className="space-y-4">
              {/* Date */}
              <DetailRow
                icon={Calendar}
                label="Fecha y Hora"
                value={format(
                  new Date(payment.payment_date),
                  "dd/MM/yyyy HH:mm:ss",
                  {
                    locale: es,
                  },
                )}
              />

              {/* Payment Method */}
              <DetailRow
                icon={
                  PAYMENT_METHOD_LABELS[payment.payment_method]?.icon ??
                  CreditCard
                }
                label="Método de Pago"
                value={
                  PAYMENT_METHOD_LABELS[payment.payment_method]?.label ??
                  payment.payment_method
                }
              />

              {/* Notes */}
              {payment.notes && (
                <DetailRow
                  icon={FileText}
                  label="Notas"
                  value={payment.notes}
                />
              )}
            </div>

            {/* PAYMENT BREAKDOWN */}
            {(payment.cash_amount > 0 || payment.card_amount > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Desglose de Pago
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {payment.cash_amount > 0 && (
                      <div className="flex flex-col p-3 bg-muted/30 rounded-md border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Banknote className="h-3 w-3" />
                          Efectivo
                        </span>
                        <span className="font-mono font-bold text-gray-900 mt-1">
                          {formatCurrency(payment.cash_amount)}
                        </span>
                      </div>
                    )}
                    {payment.card_amount > 0 && (
                      <div className="flex flex-col p-3 bg-muted/30 rounded-md border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3" />
                          Tarjeta / Transf.
                        </span>
                        <span className="font-mono font-bold text-gray-900 mt-1">
                          {formatCurrency(payment.card_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* FOOTER */}
            <div className="pt-4 border-t bg-muted/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total abonado</span>
                <span className="text-xl font-bold">
                  {formatCurrency(payment.amount)}
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleReprint}
              >
                <Printer className="h-4 w-4" />
                Reimprimir Comprobante
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted/50 text-muted-foreground shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-gray-900 break-words">
          {value}
        </span>
      </div>
    </div>
  );
}

export interface PaymentDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  payment: AccountMovement | null;
}
