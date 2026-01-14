import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Wallet, CreditCard, Banknote, Coins, Lock, Loader2, Printer, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/use-hotkeys";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onProcessSale: (
    method: string,
    cashAmount: number,
    cardAmount: number,
    shouldPrint: boolean
  ) => Promise<void>;
  isProcessing: boolean;
}

type PaymentMethod = "cash" | "card_transfer" | "mixed" | "credit";

const QUICK_CASH_AMOUNTS = [20, 50, 100, 200, 500, 1000];

export function CheckoutModal({
  isOpen,
  onClose,
  total,
  onProcessSale,
  isProcessing,
}: CheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");

  const cashInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setMethod("cash");
      setCashAmount(total.toString());
      setCardAmount("");
      // Autofocus logic is handled by Radix Dialog typically, but we force it
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
  }, [isOpen, total]);

  // Derived state
  const numericCash = parseFloat(cashAmount) || 0;
  const numericCard = parseFloat(cardAmount) || 0;

  // Update logic based on method
  useEffect(() => {
    if (method === "card_transfer") {
      setCardAmount(total.toString());
      setCashAmount("0");
    } else if (method == "cash") {
        setCardAmount("0");
        // Ensure cash amount matches total if we switch back to cash? 
        // User might want to keep what they typed. But let's check requirement: "Si se abre la modal automaticamente se pone en total".
        // Switching methods isn't "opening the modal", so we leave it as is or reset?
        // Let's leave it to user input unless it's startup. 
    }
  }, [method, total]);

  // Auto-calculate Card amount in Mixed mode
  useEffect(() => {
    if (method === "mixed") {
        const currentCash = parseFloat(cashAmount) || 0;
        const remaining = Math.max(0, total - currentCash);
        
        const newCardVal = remaining > 0 ? remaining.toFixed(2) : "0";
        setCardAmount(newCardVal);
    }
  }, [cashAmount, method, total]);

  const handleNumericInput = (value: string, setter: (val: string) => void) => {
      // Allow empty string, or positive numbers/decimals only
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
          setter(value);
      }
  };

  const methods: PaymentMethod[] = ["cash", "card_transfer", "mixed", "credit"];

  const handleNextMethod = () => {
    const currentIndex = methods.indexOf(method);
    const nextIndex = (currentIndex + 1) % methods.length;
    setMethod(methods[nextIndex]);
  };
  
  const handlePrevMethod = () => {
    const currentIndex = methods.indexOf(method);
    const prevIndex = (currentIndex - 1 + methods.length) % methods.length;
    setMethod(methods[prevIndex]);
  };

  // Keyboard navigation
  useHotkeys("ArrowRight", () => {
      if(isOpen) handleNextMethod();
  }, [isOpen, method]);
  
  useHotkeys("ArrowLeft", () => {
      if(isOpen) handlePrevMethod();
  }, [isOpen, method]);

  useHotkeys("F1", () => {
      if(isOpen) handleConfirm(true);
  }, [isOpen, method, numericCash, numericCard, total]);

    useHotkeys("F2", () => {
      if(isOpen) handleConfirm(false);
  }, [isOpen, method, numericCash, numericCard, total]);
  
  useHotkeys("Escape", () => {
      if(isOpen) onClose();
  }, [isOpen]);


  const calculateChange = () => {
    if (method === "cash") {
      return numericCash - total;
    }
    if (method === "mixed") {
      return (numericCash + numericCard) - total;
    }
    return 0;
  };

  const change = calculateChange();
  const missing = total - (numericCash + numericCard);
  
  const isValid = () => {
      if (method === "credit") return false; // Blocked per requirements
      if (method === "card_transfer") return true; 
      if (method === "cash") return numericCash >= total - 0.01; // tolerance
      if (method === "mixed") return (numericCash + numericCard) >= total - 0.01;
      return false;
  };

  const handleConfirm = (shouldPrint: boolean) => {
      if (isProcessing) return;
      
      if (method === "credit") {
          toast.error("Módulo de Crédito no disponible");
          return;
      }

      if (!isValid()) {
          toast.error("Monto insuficiente para cubrir el total");
          return;
      }
      
      onProcessSale(method, numericCash, numericCard, shouldPrint);
  };

  const addQuickCash = (amount: number) => {
      // Logic: Replace value (as requested, and common behavior)
      setCashAmount(amount.toString());
      if (cashInputRef.current) {
          cashInputRef.current.focus();
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-zinc-50 gap-0">
        <DialogHeader className="p-6 bg-white border-b pr-20">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#480489]" />
              Cobro Ticket
            </span>
            <div className="text-right">
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Total a Pagar</p>
              <p className="text-5xl font-extrabold text-[#480489] tabular-nums">
                {formatCurrency(total)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[480px]">
          {/* Left: Payment Method Selection */}
          <div className="w-1/3 bg-zinc-100/50 border-r p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Forma de Pago</p>
            
            <MethodButton
              active={method === "cash"}
              onClick={() => setMethod("cash")}
              icon={<Banknote className="w-6 h-6" />}
              label="Efectivo"
              shortcut="←/→"
            />
            <MethodButton
              active={method === "card_transfer"}
              onClick={() => setMethod("card_transfer")}
              icon={<CreditCard className="w-6 h-6" />}
              label="Tarjeta / Transferencia"
            />
            <MethodButton
              active={method === "mixed"}
              onClick={() => setMethod("mixed")}
              icon={<Coins className="w-6 h-6" />}
              label="Combinado"
            />
            <MethodButton
              active={method === "credit"}
              onClick={() => {
                  setMethod("credit");
                  toast.error("Módulo de Crédito no disponible");
              }}
              icon={<Lock className="w-5 h-5" />}
              label="Crédito (No disponible)"
              disabled
              className="opacity-50"
            />
          </div>

          {/* Right: Inputs & Details */}
          <div className="flex-1 p-8 bg-white flex flex-col justify-center space-y-6">
            
            {method === "cash" && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-lg font-medium block">¿Con cuánto paga?</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-6xl font-bold text-zinc-400">$</span>
                            <Input
                                ref={cashInputRef}
                                className="pl-16 h-32 !text-7xl font-bold shadow-sm"
                                value={cashAmount}
                                onChange={(e) => handleNumericInput(e.target.value, setCashAmount)}
                                onFocus={(e) => e.target.select()}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Quick Cash Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                        {QUICK_CASH_AMOUNTS.map((amount) => (
                            <Button 
                                key={amount} 
                                variant="outline" 
                                className="h-12 text-xl font-bold border-zinc-300 text-zinc-600 hover:text-[#480489] hover:border-[#480489] hover:bg-purple-50"
                                onClick={() => addQuickCash(amount)}
                            >
                                ${amount}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {method === "card_transfer" && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                    <CreditCard className="w-24 h-24 opacity-20" />
                    <p className="text-xl font-medium">Cobro exacto a tarjeta</p>
                    <p className="text-3xl font-bold text-zinc-900">{formatCurrency(total)}</p>
                </div>
            )}

            {method === "mixed" && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Efectivo</label>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-4xl">$</span>
                                <Input
                                    ref={cashInputRef}
                                    className="pl-12 h-24 !text-5xl font-bold"
                                    value={cashAmount}
                                    onChange={(e) => handleNumericInput(e.target.value, setCashAmount)} // Validation
                                    placeholder="0.00"
                                    autoFocus
                                />
                             </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Tarjeta (Automático)</label>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-4xl">$</span>
                                <Input
                                    ref={cardInputRef}
                                    className="pl-12 h-24 !text-5xl font-bold bg-zinc-50"
                                    value={cardAmount}
                                    readOnly // Auto-calculated
                                    tabIndex={-1}
                                    placeholder="0.00"
                                />
                             </div>
                        </div>
                    </div>

                    {/* Quick Cash Buttons for Mixed Mode too */}
                    <div className="grid grid-cols-6 gap-2">
                        {QUICK_CASH_AMOUNTS.map((amount) => (
                            <Button 
                                key={amount} 
                                variant="outline" 
                                size="sm"
                                className="h-12 text-xl font-bold border-zinc-300 text-zinc-600 hover:text-[#480489] hover:border-[#480489] hover:bg-purple-50"
                                onClick={() => addQuickCash(amount)}
                            >
                                ${amount}
                            </Button>
                        ))}
                    </div>
                    
                    {missing > 0.01 && (
                         <div className="bg-red-50 text-red-700 p-4 rounded-lg flex justify-between items-center">
                            <span className="font-medium">Faltante:</span>
                            <span className="text-2xl font-bold">{formatCurrency(missing)}</span>
                         </div>
                    )}
                 </div>
            )}
            
            {(method === "cash" || method === "mixed") && (
                 <div className={`p-6 rounded-xl flex justify-between items-center transition-colors ${
                     change >= 0 ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
                 }`}>
                     <span className="text-xl font-bold">Cambio</span>
                     <span className="text-5xl font-extrabold tracking-tight">
                         {formatCurrency(change > 0 ? change : 0)}
                     </span>
                 </div>
            )}

          </div>
        </div>

        <div className="p-6 bg-zinc-50 border-t flex justify-end gap-4">
             <Button variant="ghost" size="lg" onClick={onClose} className="mr-auto text-zinc-500 text-lg">
                 Cancelar (Esc)
             </Button>

             <div className="flex gap-4">
                <Button 
                    variant="outline"
                    size="lg" 
                    className="h-14 text-xl border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold min-w-[200px]"
                    onClick={() => handleConfirm(false)}
                    disabled={!isValid() || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <XCircle className="w-6 h-6 mr-2 opacity-50"/>}
                    Cobrar sin Ticket (F2)
                </Button>

                <Button 
                    size="lg" 
                    className="h-14 text-xl bg-[#480489] hover:bg-[#360368] px-10 font-bold min-w-[240px] shadow-md transition-all active:scale-[0.98]"
                    onClick={() => handleConfirm(true)}
                    disabled={!isValid() || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Printer className="w-6 h-6 mr-2" />}
                    Cobrar e Imprimir (F1)
                </Button>
             </div>
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
  shortcut,
  disabled,
  className
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left px-4 py-4 rounded-lg flex items-center justify-between transition-all border-2",
        active
          ? "bg-white border-[#480489] text-[#480489] shadow-md ring-1 ring-[#480489]/20"
          : "bg-white border-transparent hover:bg-zinc-200 text-zinc-600",
        disabled && "cursor-not-allowed opacity-50 bg-zinc-100 hover:bg-zinc-100",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-lg">{label}</span>
      </div>
      {shortcut && <span className="text-xs text-muted-foreground font-mono bg-zinc-100 px-2 py-1 rounded">{shortcut}</span>}
    </button>
  );
}
