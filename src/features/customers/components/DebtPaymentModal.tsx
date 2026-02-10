import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useAuthStore } from "@/stores/authStore";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { registerDebtPayment } from "@/lib/api/account";
import { Customer } from "@/types/customers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onPaymentSuccess: () => void;
}

type PaymentMethod = "cash" | "card" | "mixed" | "transfer";
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export function DebtPaymentModal({
  isOpen,
  onClose,
  customer,
  onPaymentSuccess,
}: DebtPaymentModalProps) {
  const user = useAuthStore((state) => state.user);
  const shift = useCashRegisterStore((state) => state.shift);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<string>(""); 
  const [cashAmount, setCashAmount] = useState<string>(""); 
  const [cardAmount, setCardAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const mainInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMethod("cash");
      setAmount("");
      setCashAmount("");
      setCardAmount("");
      setNotes("");
      setTimeout(() => mainInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const numericTotal = parseFloat(amount) || 0;
  const numericCash = parseFloat(cashAmount) || 0;
  const numericCard = parseFloat(cardAmount) || 0;
  const currentDebt = customer.current_balance;

  useEffect(() => {
    if (method === "mixed" && numericTotal > 0) {
      const remaining = Math.max(0, numericTotal - numericCash);
      setCardAmount(remaining > 0 ? remaining.toFixed(2) : "0");
    }
  }, [amount, cashAmount, method]);

  const validate = () => {
    if (!shift || shift.status !== "open")
      return "Caja cerrada. No se pueden recibir abonos.";
    if (!user) return "Usuario no identificado.";
    if (numericTotal <= 0) return "El monto debe ser mayor a 0.";
    if (numericTotal > currentDebt)
      return "El abono no puede superar la deuda actual.";

    if (method === "mixed") {
      if (Math.abs(numericCash + numericCard - numericTotal) > 0.01) {
        return "La suma de efectivo y tarjeta debe igualar el total.";
      }
    }
    return null;
  };

  const error = validate();
  const isValid = error === null;

  const handleConfirm = async () => {
    if (isProcessing || !isValid) return;

    try {
      setIsProcessing(true);

      await registerDebtPayment({
        customer_id: customer.id,
        user_id: user!.id,
        shift_id: shift!.id.toString(),
        total_amount: numericTotal,
        payment_method: method,
        cash_amount:
          method === "mixed"
            ? numericCash
            : method === "cash"
              ? numericTotal
              : 0,
        card_amount:
          method === "mixed"
            ? numericCard
            : method === "card" || method === "transfer"
              ? numericTotal
              : 0,
        notes: notes || null,
      });

      toast.success("Abono registrado correctamente");
      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar el abono");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNumericInput = (val: string, setter: (v: string) => void) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) setter(val);
  };

  useHotkeys("Escape", () => !isProcessing && onClose(), [isProcessing]);
  useHotkeys("Enter", () => isValid && handleConfirm(), [
    isValid,
    isProcessing,
  ]);

  if (!shift) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12" />
            <h3 className="text-lg font-bold">Caja Cerrada</h3>
            <p className="text-muted-foreground">
              Necesitas abrir un turno de caja para poder recibir dinero.
            </p>
            <Button onClick={onClose}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isProcessing && onClose()}
    >
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden bg-zinc-50">
        <DialogHeader className="p-6 bg-white border-b">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#480489]" />
              Abonar a Cuenta
            </span>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                Saldo Pendiente
              </p>
              <p className="text-2xl font-bold text-destructive tabular-nums">
                {formatCurrency(currentDebt)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[420px]">
          {/* Left: Methods */}
          <div className="w-1/3 bg-zinc-100/50 border-r p-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 ml-1">
              Método
            </p>
            <MethodButton
              active={method === "cash"}
              onClick={() => setMethod("cash")}
              icon={<Banknote className="w-5 h-5" />}
              label="Efectivo"
            />
            <MethodButton
              active={method === "card"}
              onClick={() => setMethod("card")}
              icon={<CreditCard className="w-5 h-5" />}
              label="Tarjeta"
            />
            <MethodButton
              active={method === "transfer"}
              onClick={() => setMethod("transfer")}
              icon={<CreditCard className="w-5 h-5" />}
              label="Transferencia"
            />
            <MethodButton
              active={method === "mixed"}
              onClick={() => setMethod("mixed")}
              icon={<Coins className="w-5 h-5" />}
              label="Mixto"
            />
          </div>

          {/* Right: Inputs */}
          <div className="flex-1 p-6 bg-white flex flex-col space-y-6 overflow-y-auto">
            {/* Main Amount Input */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Monto a Abonar</Label>
              <MoneyInput
                ref={mainInputRef}
                value={amount}
                onChange={(e) => handleNumericInput(e.target.value, setAmount)}
                className={cn(
                  "text-4xl font-bold h-16 pl-10",
                  numericTotal > currentDebt
                    ? "text-red-500"
                    : "text-emerald-700",
                )}
                symbolClassName="text-2xl top-1/2 -translate-y-1/2 left-3"
                placeholder="0.00"
              />
              {numericTotal > currentDebt && (
                <p className="text-xs text-red-500 font-medium">
                  El monto excede la deuda actual
                </p>
              )}
            </div>

            {/* Quick Amounts (Only for Cash/Single method) */}
            {method === "cash" && (
              <div className="grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map((val) => (
                  <Button
                    key={val}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(val.toString())}
                    className="text-xs font-semibold hover:border-[#480489] hover:text-[#480489]"
                  >
                    ${val}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(currentDebt.toString())}
                  className="text-xs font-bold text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                >
                  Total
                </Button>
              </div>
            )}

            {/* Mixed Inputs Detail */}
            {method === "mixed" && (
              <div className="bg-zinc-50 p-4 rounded-lg space-y-4 border border-zinc-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo</Label>
                    <MoneyInput
                      value={cashAmount}
                      onChange={(e) =>
                        handleNumericInput(e.target.value, setCashAmount)
                      }
                      className="h-10 text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarjeta</Label>
                    <MoneyInput
                      value={cardAmount}
                      onChange={(e) =>
                        handleNumericInput(e.target.value, setCardAmount)
                      }
                      className="h-10 text-sm font-medium bg-zinc-100 text-muted-foreground"
                      readOnly // Auto-calculated
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas (Opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Referencia, folio bancario, etc."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isProcessing}
            className="bg-[#480489] hover:bg-[#360368] min-w-[140px]"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Confirmar Abono
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 rounded-md flex items-center gap-3 transition-all text-sm font-medium",
        active
          ? "bg-white text-[#480489] shadow-sm ring-1 ring-[#480489]/20"
          : "text-zinc-600 hover:bg-white/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
