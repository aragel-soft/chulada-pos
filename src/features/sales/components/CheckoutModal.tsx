import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Wallet, CreditCard, Banknote, Coins, Lock, Loader2, Printer, XCircle, Search, User, Check, AlertCircle, Ticket as TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCustomers } from "@/lib/api/customers";
import { Customer } from "@/types/customers";
import { useDebounce } from "@/hooks/use-debounce";
import { validateVoucher } from "@/lib/api/cash-register/sales";
import { VoucherValidationResponse } from "@/types/sale";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onProcessSale: (
    method: string,
    cashAmount: number,
    cardAmount: number,
    shouldPrint: boolean,
    customerId?: string,
    voucherCode?: string
  ) => Promise<void>;
  isProcessing: boolean;
}
// Payment methods
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
  
  // Credit / Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const debouncedSearch = useDebounce(customerSearchQuery, 300);

  const cashInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const voucherInputRef = useRef<HTMLInputElement>(null);

  // Voucher State
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherData, setVoucherData] = useState<VoucherValidationResponse | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setMethod("cash");
      setCashAmount(total.toString());
      setCardAmount("");
      setSelectedCustomer(null);
      setCustomerSearchQuery("");
      setVoucherCode("");
      setVoucherData(null);
      setIsVoucherOpen(false);
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
  }, [isOpen, total]);

  // Derived state
  const numericCash = parseFloat(cashAmount) || 0;
  const numericCard = parseFloat(cardAmount) || 0;

  // Voucher Logic
  const handleValidateVoucher = async () => {
      if (!voucherCode.trim()) return;
      setIsValidatingVoucher(true);
      try {
          const voucher = await validateVoucher(voucherCode);
          setVoucherData(voucher);
          setIsVoucherOpen(false);
          setVoucherCode(""); // Clear input
          toast.success("Vale aplicado correctamente");
      } catch (error: any) {
          toast.error(error?.toString() || "Error al validar vale");
          setVoucherData(null);
      } finally {
          setIsValidatingVoucher(false);
      }
  };

  const removeVoucher = () => {
      setVoucherData(null);
  };

  // Calculations with Voucher
  const voucherBalance = voucherData?.current_balance || 0;
  // Amount applied is Min(Total, VoucherBalance)
  const voucherAppliedAmount = voucherData ? Math.min(total, voucherBalance) : 0;
  
  // Remaining total to pay after voucher
  const remainingTotal = Math.max(0, total - voucherAppliedAmount);

  // Update logic based on method
  useEffect(() => {
    if (method === "card_transfer") {
      setCardAmount(remainingTotal.toString());
      setCashAmount("0");
    } else if (method == "cash") {
        setCardAmount("0");
    }
  }, [method, remainingTotal]);

  // Auto-calculate Card amount in Mixed mode
  useEffect(() => {
    if (method === "mixed") {
        const currentCash = parseFloat(cashAmount) || 0;
        const remaining = Math.max(0, remainingTotal - currentCash);
        
        // Exact calculation to avoid floating point issues
        const newCardVal = remaining > 0 ? remaining.toFixed(2) : "0";
        setCardAmount(newCardVal);
    }
  }, [cashAmount, method, remainingTotal]);

  // Search Customers
  useEffect(() => {
    async function searchCustomers() {
        if (!isOpen || method !== "credit") return;
        
        setIsSearchingCustomers(true);
        try {
            const result = await getCustomers({
                page: 1,
                pageSize: 10,
                search: debouncedSearch,
                sortBy: "name",
                sortOrder: "asc"
            });
            setCustomers(result.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearchingCustomers(false);
        }
    }
    
    if (method === "credit") {
        searchCustomers();
    }
  }, [debouncedSearch, method, isOpen]);


  const handleNumericInput = (value: string, setter: (val: string) => void) => {
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
  useHotkeys("ArrowDown", () => {
      if(isOpen && !customerSearchOpen) handleNextMethod();
  }, [isOpen, method, customerSearchOpen]);
  
  useHotkeys("ArrowUp", () => {
      if(isOpen && !customerSearchOpen) handlePrevMethod();
  }, [isOpen, method, customerSearchOpen]);

  useHotkeys("F1", () => {
      if(isOpen) handleConfirm(true);
  }, [isOpen, method, numericCash, numericCard, total, selectedCustomer]);

  useHotkeys("F2", () => {
      if(isOpen) handleConfirm(false);
  }, [isOpen, method, numericCash, numericCard, total, selectedCustomer]);
  
  useHotkeys("Escape", () => {
      if(isOpen) {
          if (customerSearchOpen) setCustomerSearchOpen(false);
          else onClose();
      }
  }, [isOpen, customerSearchOpen]);




  // Re-calculate change and missing based on remainingTotal
  const calculateChange = () => {
    if (method === "cash") {
      return numericCash - remainingTotal;
    }
    if (method === "mixed") {
      return (numericCash + numericCard) - remainingTotal;
    }
    return 0;
  };

  const change = calculateChange();
  const missing = remainingTotal - (numericCash + numericCard);
  
  const isCreditLimitExceeded = () => {
      if (!selectedCustomer) return false;
      return (selectedCustomer.current_balance + remainingTotal) > selectedCustomer.credit_limit;
  };

  const isValid = () => {
      if (remainingTotal === 0 && voucherData) return true; // Fully paid by voucher

      if (method === "credit") {
          return !!selectedCustomer && !isCreditLimitExceeded();
      }
      if (method === "card_transfer") return true; 
      if (method === "cash") return numericCash >= remainingTotal - 0.01; // tolerance
      if (method === "mixed") return (numericCash + numericCard) >= remainingTotal - 0.01;
      return false;
  };

  // Update default amounts when voucher changes
  useEffect(() => {
      if (method === "cash") {
          setCashAmount(remainingTotal.toString());
      } else if (method === "card_transfer") {
          setCardAmount(remainingTotal.toString());
      } else if (method === "mixed") {
         // Reset mixed or adjust? Let's reset for safety or adjust card
         setCashAmount("");
         setCardAmount(remainingTotal.toString());
      }
  }, [voucherAppliedAmount, method, remainingTotal]); // Depend on voucherAppliedAmount

  const handleConfirm = (shouldPrint: boolean) => {
      if (isProcessing) return;
      
      if (!isValid()) {
          if (method === "credit") {
             if (!selectedCustomer) toast.error("Seleccione un cliente");
             else if (isCreditLimitExceeded()) toast.error("Límite de crédito excedido");
          } else {
             toast.error("Monto insuficiente para cubrir el total");
          }
          return;
      }
      
      onProcessSale(
          method, 
          numericCash, 
          numericCard, 
          shouldPrint, 
          selectedCustomer?.id,
          voucherData?.code // Pass voucher code
      );
  };

  const addQuickCash = (amount: number) => {
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
              <div className="flex flex-col items-end">
                {voucherData && (
                    <span className="text-sm text-green-600 font-bold strike-through decoration-zinc-400 decoration-2">
                        {formatCurrency(total)}
                    </span>
                )}
                <p className="text-5xl font-extrabold text-[#480489] tabular-nums">
                    {formatCurrency(remainingTotal)}
                </p>
              </div>
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
              shortcut="↑/↓"
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
              onClick={() => setMethod("credit")}
              icon={<Lock className="w-5 h-5" />}
              label="Crédito a Cliente"
            />
            
            <div className="pt-4 border-t mt-4">
                 {!voucherData ? (
                    <Dialog open={isVoucherOpen} onOpenChange={setIsVoucherOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Aplicar Vale de Tienda</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Código del Vale / Escanear</label>
                                    <input
                                        ref={voucherInputRef}
                                        className="w-full text-2xl font-bold p-3 border rounded-md uppercase tracking-wider text-center"
                                        placeholder="VALE-XXXX"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleValidateVoucher();
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <Button 
                                    className="w-full h-12 text-lg bg-[#480489] hover:bg-[#360368]"
                                    onClick={handleValidateVoucher}
                                    disabled={!voucherCode || isValidatingVoucher}
                                >
                                    {isValidatingVoucher ? <Loader2 className="animate-spin mr-2"/> : "Validar y Aplicar"}
                                </Button>
                            </div>
                        </DialogContent>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start gap-3 h-12 text-zinc-600 border-dashed border-2 hover:border-[#480489] hover:text-[#480489] hover:bg-purple-50"
                            onClick={() => setIsVoucherOpen(true)}
                        >
                            <TicketIcon className="w-5 h-5" />
                            <span className="font-semibold">Usar Vale de Tienda</span>
                        </Button>
                    </Dialog>
                 ) : (
                     <div className="bg-green-50 border border-green-200 rounded-lg p-3 relative group">
                         <div className="flex justify-between items-start">
                             <div>
                                 <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Vale Aplicado</p>
                                 <p className="font-mono font-bold text-green-900">{voucherData.code}</p>
                                 <p className="text-xs text-green-600 mt-1">Saldo rest.: {formatCurrency(Math.max(0, voucherData.current_balance - voucherAppliedAmount))}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-lg font-bold text-green-700">-{formatCurrency(voucherAppliedAmount)}</p>
                             </div>
                         </div>
                         <Button
                            variant="ghost" 
                            size="icon"
                            className="absolute -top-2 -right-2 bg-white shadow-sm border rounded-full w-6 h-6 hover:bg-red-50 hover:text-red-600"
                            onClick={removeVoucher}
                         >
                             <XCircle className="w-4 h-4" />
                         </Button>
                     </div>
                 )}
            </div>
          </div>

          {/*Inputs & Details */}
          <div className="flex-1 p-4 bg-white flex flex-col justify-center space-y-6">
            
            {method === "credit" && (
                <div className="flex flex-col h-full justify-start space-y-4 pt-0 overflow-y-auto">
                     <div className="space-y-4">
                        <label className="text-lg font-bold block text-[#480489]">Cliente para Crédito</label>
                        <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen} modal={true}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={customerSearchOpen}
                                    className="w-full justify-between h-14 text-lg"
                                >
                                    {selectedCustomer ? (
                                        <div className="flex items-center gap-2">
                                            <User className="w-5 h-5 text-[#480489]" />
                                            <span className="font-semibold">{selectedCustomer.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">Buscar cliente...</span>
                                    )}
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command shouldFilter={false} className="rounded-lg border-0">
                                    <CommandInput 
                                        placeholder="Buscar por nombre..." 
                                        value={customerSearchQuery}
                                        onValueChange={setCustomerSearchQuery}
                                    />
                                    <CommandList>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {isSearchingCustomers && <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2"/> Buscando...</div>}
                                            {!isSearchingCustomers && customers.length === 0 && <CommandEmpty>No se encontraron clientes.</CommandEmpty>}
                                            <CommandGroup>
                                                {customers.map((customer) => (
                                                    <CommandItem
                                                        key={customer.id}
                                                        value={customer.name}
                                                        onSelect={() => {
                                                            setSelectedCustomer(customer);
                                                            setCustomerSearchOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span>{customer.name}</span>
                                                            <span className="text-xs text-muted-foreground">Saldo: {formatCurrency(customer.current_balance)} / Lim: {formatCurrency(customer.credit_limit)}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </div>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                     </div>

                     {/* Credit Status Card */}
                     {selectedCustomer ? (
                         <div className={cn(
                             "rounded-xl p-6 border-2 transition-all",
                             isCreditLimitExceeded() 
                                ? "bg-red-50 border-red-200" 
                                : "bg-blue-50 border-blue-200"
                         )}>
                             <div className="flex justify-between items-start mb-4">
                                 <div>
                                     <h4 className="font-bold text-lg">{selectedCustomer.name}</h4>
                                     <p className="text-sm text-muted-foreground">Estado de Cuenta</p>
                                 </div>
                                 {isCreditLimitExceeded() ? (
                                     <AlertCircle className="w-8 h-8 text-red-500" />
                                 ) : (
                                     <Check className="w-8 h-8 text-blue-500" />
                                 )}
                             </div>

                             <div className="space-y-3">
                                 <div className="flex justify-between text-sm">
                                     <span>Saldo Actual:</span>
                                     <span className="font-medium">{formatCurrency(selectedCustomer.current_balance)}</span>
                                 </div>
                                 <div className="flex justify-between text-sm">
                                     <span>+ Esta Venta:</span>
                                     <span className="font-bold">{formatCurrency(remainingTotal)}</span>
                                 </div>
                                 <div className="h-px bg-black/10 my-2" />
                                 <div className="flex justify-between text-base font-bold">
                                     <span>Nuevo Saldo:</span>
                                     <span className={isCreditLimitExceeded() ? "text-red-600" : "text-zinc-900"}>
                                         {formatCurrency(selectedCustomer.current_balance + remainingTotal)}
                                     </span>
                                 </div>
                                 <div className="flex justify-between text-sm pt-2 text-muted-foreground">
                                     <span>Límite de Crédito:</span>
                                     <span>{formatCurrency(selectedCustomer.credit_limit)}</span>
                                 </div>
                             </div>

                             {isCreditLimitExceeded() && (
                                 <div className="mt-4 bg-red-100 text-red-800 p-3 rounded-md text-sm font-semibold flex items-center gap-2">
                                     <XCircle className="w-4 h-4" />
                                     Límite de crédito excedido por {formatCurrency((selectedCustomer.current_balance + remainingTotal) - selectedCustomer.credit_limit)}
                                 </div>
                             )}
                         </div>
                     ) : (
                         <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 border-2 border-dashed rounded-xl border-zinc-200">
                             <Search className="w-12 h-12 mb-2 opacity-20" />
                             <p>Busca un cliente para asignar el crédito</p>
                         </div>
                     )}
                </div>
            )}
            
            {method === "cash" && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-lg font-medium block">¿Con cuánto paga?</label>
                        <div className="relative">
                            <MoneyInput
                                ref={cashInputRef}
                                className="pl-16 h-32 !text-7xl font-bold shadow-sm"
                                symbolClassName="left-4 top-1/2 -translate-y-1/2 text-6xl text-zinc-400"
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
                    <p className="text-3xl font-bold text-zinc-900">{formatCurrency(remainingTotal)}</p>
                </div>
            )}

            {method === "mixed" && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Efectivo</label>
                             <div className="relative">
                                <MoneyInput
                                    ref={cashInputRef}
                                    className="pl-12 h-24 !text-5xl font-bold"
                                    symbolClassName="left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-4xl"
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
                                <MoneyInput
                                    ref={cardInputRef}
                                    className="pl-12 h-24 !text-5xl font-bold bg-zinc-50"
                                    symbolClassName="left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-4xl"
                                    value={cardAmount}
                                    readOnly
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
