import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReturnItem } from "./ReturnModal";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Printer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SaleDetail } from "@/types/sales-history";

interface ReturnStepTwoProps {
  sale: SaleDetail;
  returnItems: ReturnItem[];
  onBack: () => void;
  onConfirm: (reason: string, notes: string) => Promise<string>; // Returns voucher code
  onCancel: () => void;
  isProcessing: boolean;
}

export function ReturnStepTwo({
  sale,
  returnItems,
  onBack,
  onConfirm,
  onCancel,
  isProcessing,
}: ReturnStepTwoProps) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = returnItems.filter(
    (item) => item.isSelected && item.returnQuantity > 0
  );

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.returnQuantity * item.unitPrice,
    0
  );

  const handleConfirm = async () => {
    if (!reason) {
      setError("Por favor selecciona un motivo de devolución.");
      return;
    }
    setError(null);
    try {
      const code = await onConfirm(reason, notes);
      setVoucherCode(code);
    } catch (err) {
      setError(String(err));
    }
  };

  if (voucherCode) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div className="bg-green-100 p-4 rounded-full mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">¡Devolución Procesada!</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Se ha generado exitosamente el Vale de Tienda.
        </p>

        <div className="bg-muted p-8 rounded-lg border-2 border-dashed border-primary/20 w-full max-w-md mb-8">
          <p className="text-sm text-muted-foreground mb-2">Código del Vale</p>
          <div className="text-4xl font-mono font-bold tracking-wider text-primary select-all">
            {voucherCode}
          </div>
          <div className="mt-4 pt-4 border-t w-full flex justify-between items-center text-sm">
            <span>Saldo:</span>
            <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="gap-2" onClick={onCancel}>
            <FileText className="h-4 w-4" />
            Cerrar
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir Vale
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {error && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left Column: Summary */}
        <div className="flex-[3] flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="p-4 bg-muted/30 border-b font-medium flex justify-between">
            <span>Resumen de Productos</span>
            <span className="text-sm font-normal text-muted-foreground">Venta: {sale.folio}</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {selectedItems.map((item) => (
                <div key={item.saleItemId} className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.isGift ? (
                        <span className="text-orange-600 font-medium">
                          Regalo (Kit/Promo)
                        </span>
                      ) : (
                        <span>{formatCurrency(item.unitPrice)} c/u</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">x{item.returnQuantity}</p>
                    <p className="font-bold">
                      {item.isGift
                        ? formatCurrency(0)
                        : formatCurrency(item.returnQuantity * item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 bg-muted/10 border-t">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Devolución</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Reason & Action */}
        <div className="flex-[2] flex flex-col gap-6">
          <div className="p-6 border rounded-lg bg-white shadow-sm h-full">
            <h3 className="font-semibold mb-4 text-lg">Detalles de Devolución</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo de la devolución</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality">Producto dañado / Mala calidad</SelectItem>
                    <SelectItem value="dissatisfied">Cliente insatisfecho</SelectItem>
                    <SelectItem value="mistake">Error en venta / Producto incorrecto</SelectItem>
                    <SelectItem value="change">Cambio de parecer</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Detalles adicionales sobre la devolución..."
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  className="resize-none h-32"
                />
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Información</AlertTitle>
                <AlertDescription className="text-blue-700 text-xs mt-1">
                  Al confirmar, se generará un <strong>Vale de Tienda</strong> por el monto total de <strong>{formatCurrency(totalAmount)}</strong>. No se realizan devoluciones en efectivo ni tarjeta.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/5 p-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          Atrás
        </Button>
        <Button 
          variant="destructive"
          onClick={handleConfirm} 
          disabled={!reason || isProcessing}
          className="w-48 bg-red-600 hover:bg-red-700"
        >
          {isProcessing ? "Procesando..." : "Confirmar Devolución"}
        </Button>
      </div>
    </div>
  );
}
