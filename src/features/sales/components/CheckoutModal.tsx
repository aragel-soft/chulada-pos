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
import { Wallet, CreditCard, Banknote, Coins, Lock, Loader2 } from "lucide-react";
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
    cardAmount: number
  ) => Promise<void>;
  isProcessing: boolean;
}

type PaymentMethod = "cash" | "card_transfer" | "mixed" | "credit";

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
      setCashAmount("");
      setCardAmount("");
      // Autofocus logic is handled by Radix Dialog typically, but we force it
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Derived state
  const numericCash = parseFloat(cashAmount) || 0;
  const numericCard = parseFloat(cardAmount) || 0;

  // Update card amount automatically if Card method is selected
  useEffect(() => {
    if (method === "card_transfer") {
      setCardAmount(total.toString());
      setCashAmount("0");
    } else if (method === "mixed") {
        // Just clear or keep? Let's keep logic simple
    } else {
        // Cash
        setCardAmount("0");
    }
  }, [method, total]);

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

  useHotkeys("Enter", () => {
      if(isOpen) handleConfirm();
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

  const handleConfirm = () => {
      if (isProcessing) return;
      
      if (method === "credit") {
          toast.error("Módulo de Crédito no disponible");
          return;
      }

      if (!isValid()) {
          toast.error("Monto insuficiente para cubrir el total");
          return;
      }
      
      onProcessSale(method, numericCash, numericCard);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-zinc-50 gap-0">
        <DialogHeader className="p-6 bg-white border-b">
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

        <div className="flex h-[450px]">
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
          <div className="flex-1 p-8 bg-white flex flex-col justify-center space-y-8">
            
            {method === "cash" && (
                <div className="space-y-4">
                    <label className="text-lg font-medium block">¿Con cuánto paga?</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-zinc-400">$</span>
                        <Input
                            ref={cashInputRef}
                            className="pl-12 h-20 text-4xl font-bold shadow-sm"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)} // TODO: Input validation
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                            autoFocus
                        />
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
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                <Input
                                    ref={cashInputRef}
                                    className="pl-8 text-xl font-bold"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                />
                             </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Tarjeta</label>
                             <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                <Input
                                    ref={cardInputRef}
                                    className="pl-8 text-xl font-bold"
                                    value={cardAmount}
                                    onChange={(e) => setCardAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                             </div>
                        </div>
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

        <div className="p-4 bg-zinc-50 border-t flex justify-end gap-3">
             <Button variant="outline" size="lg" onClick={onClose}>
                 Cancelar (Esc)
             </Button>
             <Button 
                size="lg" 
                className="bg-[#480489] hover:bg-[#360368] px-8 text-lg min-w-[200px]"
                onClick={handleConfirm}
                disabled={!isValid() || isProcessing}
             >
                 {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null}
                 Cobrar (Enter)
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
        <span className="font-medium">{label}</span>
      </div>
      {shortcut && <span className="text-xs text-muted-foreground font-mono bg-zinc-100 px-2 py-1 rounded">{shortcut}</span>}
    </button>
  );
}
