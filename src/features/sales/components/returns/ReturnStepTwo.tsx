import { useState, useEffect } from "react";
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
import { ReturnItem } from "@/types/returns";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, Package, ArrowLeft, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppAvatar } from "@/components/ui/app-avatar";
import { Badge } from "@/components/ui/badge";
import { SaleDetail } from "@/types/sales-history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { returnValidationSchema } from "./returnSchema";
import { BADGE_CONFIGS, BUTTON_STYLES } from "@/features/sales/constants/sales-design";
import { cn } from "@/lib/utils";
import type { ReturnModalMode } from "./ReturnModal";

interface ReturnStepTwoProps {
  sale: SaleDetail;
  returnItems: ReturnItem[];
  onBack: () => void;
  onConfirm: (reason: string, notes: string) => Promise<string>;
  onCancel: () => void;
  isProcessing: boolean;
  mode?: ReturnModalMode;
}

export function ReturnStepTwo({
  sale,
  returnItems,
  onBack,
  onConfirm,
  onCancel,
  isProcessing,
  mode = "return",
}: ReturnStepTwoProps) {
  const isCancellation = mode === "cancellation";
  const [reason, setReason] = useState<string>(isCancellation ? "cancellation" : "");
  const [notes, setNotes] = useState<string>("");
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  // Set reason to "cancellation" when mode changes
  useEffect(() => {
    if (isCancellation) {
      setReason("cancellation");
    }
  }, [isCancellation]);

  const selectedItems = returnItems.filter(
    (item) => item.isSelected && item.returnQuantity > 0
  );

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.returnQuantity * item.unitPrice,
    0
  );

  const handleConfirm = async () => {
    setFieldErrors(null);
    setGeneralErrors([]);
    
    // Zod Validation
    const result = returnValidationSchema.safeParse({
      reason,
      notes,
      items: returnItems
    });

    if (!result.success) {
      const flattened = result.error.flatten();
      setFieldErrors(flattened.fieldErrors);
      
      const combinedGeneralErrors = [
        ...flattened.formErrors,
        ...(flattened.fieldErrors['items'] || [])
      ];
      
      setGeneralErrors(combinedGeneralErrors);
      return;
    }

    try {
      const code = await onConfirm(reason, notes);
      setVoucherCode(code);
      
      setTimeout(() => {
        onCancel();
      }, 100);
    } catch (err) {
      setGeneralErrors([String(err)]);
    }
  };

  if (voucherCode === "UNDER_CONSTRUCTION") {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div className="bg-yellow-100 p-4 rounded-full mb-6">
          <AlertCircle className="h-12 w-12 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Devolución Confirmada</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          La devolución ha sido registrada en el sistema.
        </p>

        <Alert className="bg-blue-50 border-blue-200 max-w-md mb-8 text-left">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">En Construcción</AlertTitle>
          <AlertDescription className="text-blue-700 mt-1">
            La funcionalidad de generación e impresión de vales está en desarrollo.
            Próximamente podrás imprimir el comprobante directamente desde aquí.
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button className="w-48" onClick={onCancel}>
            Entendido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ERROR MODAL */}
      <AlertDialog open={generalErrors.length > 0} onOpenChange={(open) => !open && setGeneralErrors([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error de Validación
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>Por favor corrige los siguientes problemas antes de continuar:</p>
              <ul className="list-disc list-inside text-destructive font-medium space-y-1">
                {generalErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGeneralErrors([])} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">

        <div className="flex-[3] flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="p-4 bg-muted/30 border-b font-medium flex justify-between">
            <span>Resumen de Productos</span>
            <span className="text-sm font-normal text-muted-foreground">Venta: {sale.folio}</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {Array.from(new Set(selectedItems.map(i => i.promotionId || i.kitOptionId || ""))).map(groupId => {
                const groupItems = selectedItems.filter(i => (i.promotionId || i.kitOptionId || "") === groupId);
                const isCombo = !!groupId;
                const promotionName = groupItems[0]?.promotionName || (groupItems[0]?.kitOptionId ? "Kit" : "");

                return (
                  <div key={groupId || 'individual'} className={`bg-white ${isCombo ? 'border rounded-lg overflow-hidden my-3 mx-2 shadow-sm' : 'my-1'}`}>
                    {isCombo && (
                      <div className="px-4 py-2 border-b flex items-center gap-2 bg-purple-50">
                        <Package className="h-3.5 w-3.5 text-purple-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                          {promotionName}
                        </span>
                      </div>
                    )}
                    <div className="divide-y divide-gray-100">
                      {groupItems.map((item) => (
                        <div key={item.saleItemId} className={`p-4 flex items-center gap-4 ${!isCombo ? 'border-b last:border-0' : ''}`}>
                          <div className="h-10 w-10 shrink-0">
                            <AppAvatar
                              name={item.productName}
                              path={item.productImage}
                              className="h-10 w-10 border border-zinc-100"
                              variant="muted"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-slate-800">{item.productName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {item.isGift ? (
                                  <Badge 
                                    className={BADGE_CONFIGS.gift.className}
                                    variant={BADGE_CONFIGS.gift.variant}
                                  >
                                    {BADGE_CONFIGS.gift.label}
                                  </Badge>
                                ) : (
                                <span className="text-xs text-muted-foreground font-medium">{formatCurrency(item.unitPrice)} c/u</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-sm text-slate-900">x{item.returnQuantity}</p>
                            <p className="text-xs font-bold text-slate-500">
                              {item.isGift
                                ? formatCurrency(0)
                                : formatCurrency(item.returnQuantity * item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
            <h3 className="font-semibold mb-4 text-lg">
              {isCancellation ? "Detalles de Cancelación" : "Detalles de Devolución"}
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">
                  {isCancellation ? "Motivo de cancelación" : "Motivo de la devolución"} <span className="text-red-500">*</span>
                </Label>
                {isCancellation ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 font-medium">
                    Cancelación de venta
                  </div>
                ) : (
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason" className={fieldErrors?.reason ? "border-red-500" : ""}>
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
                )}
                {fieldErrors?.reason && (
                  <p className="text-sm font-medium text-destructive">
                    {fieldErrors.reason[0]}
                  </p>
                )}
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

      <div className="border-t bg-white p-6 flex justify-between items-center">
        {isCancellation ? (
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isProcessing}
            className="h-11 px-6 border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 gap-2"
          >
            Cancelar
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={onBack} 
            disabled={isProcessing}
            className="h-11 px-6 border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </Button>
        )}

        <Button 
          variant="destructive"
          onClick={handleConfirm} 
          disabled={isProcessing}
          className={cn(BUTTON_STYLES.destructive, isCancellation ? "bg-red-700 hover:bg-red-800" : "bg-purple-900 hover:bg-purple-950")}
        >
          {isProcessing ? (
            "Procesando..."
          ) : (
            <>
              {isCancellation ? "Confirmar Cancelación" : "Confirmar Devolución"}
              <Check className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
