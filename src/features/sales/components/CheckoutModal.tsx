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
  Lock,
  Loader2,
  Printer,
  XCircle,
  Search,
  User,
  Check,
  AlertCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getCustomers } from "@/lib/api/customers";
import { Customer } from "@/types/customers";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  // In 'sale' mode, this is the Ticket Total. In 'debt' mode, this is the Current Balance (Debt Limit).
  total: number;
  onProcessSale: (
    method: string,
    cashAmount: number,
    cardAmount: number,
    shouldPrint: boolean,
    customerId?: string,
    notes?: string,
  ) => Promise<void>;
  isProcessing: boolean;
  variant?: "sale" | "debt";
  defaultCustomerId?: string; // Used in 'debt' mode to lock the customer
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
  variant = "sale",
  defaultCustomerId,
}: CheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Credit / Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const debouncedSearch = useDebounce(customerSearchQuery, 300);

  const cashInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  const numericCash = parseFloat(cashAmount) || 0;
  const numericCard = parseFloat(cardAmount) || 0;
  const currentPaymentSum = numericCash + numericCard;

  const displayTotal = variant === "sale" ? total : currentPaymentSum;
  const debtLimit = variant === "debt" ? total : Infinity;

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setMethod("cash");
      // In Sale: Default to Total. In Debt: Default to Empty (User enters amount)
      setCashAmount(variant === "sale" ? total.toString() : "");
      setCardAmount("");
      setNotes("");
      setSelectedCustomer(null);
      setCustomerSearchQuery("");
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
  }, [isOpen, total, variant]);

  // Update logic based on method
  useEffect(() => {
    if (method === "card_transfer") {
      // In Sale: auto-fill. In Debt: keep user input if they typed something, otherwise empty.
      if (variant === "sale") {
        setCardAmount(total.toString());
        setCashAmount("0");
      } else {
        const valToMove = numericCash > 0 ? numericCash.toString() : "";
        setCardAmount(valToMove);
        setCashAmount("0");
      }
    } else if (method === "cash") {
      setCardAmount("0");
      if (variant === "debt" && numericCard > 0) {
        setCashAmount(numericCard.toString());
      }
    }
  }, [method, total, variant]);

  // Auto-calculate Card amount in Mixed mode (Only for Sale)
  useEffect(() => {
    if (method === "mixed" && variant === "sale") {
      const currentCash = parseFloat(cashAmount) || 0;
      const remaining = Math.max(0, total - currentCash);

      const newCardVal = remaining > 0 ? remaining.toFixed(2) : "0";
      setCardAmount(newCardVal);
    }
  }, [cashAmount, method, total, variant]);

  // Search Customers (Only used if Credit method is active)
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
          sortOrder: "asc",
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

  const methods: PaymentMethod[] =
    variant === "sale"
      ? ["cash", "card_transfer", "mixed", "credit"]
      : ["cash", "card_transfer", "mixed"];

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
  useHotkeys(
    "ArrowDown",
    () => {
      if (isOpen && !customerSearchOpen) handleNextMethod();
    },
    [isOpen, method, customerSearchOpen, methods],
  );

  useHotkeys(
    "ArrowUp",
    () => {
      if (isOpen && !customerSearchOpen) handlePrevMethod();
    },
    [isOpen, method, customerSearchOpen, methods],
  );

  useHotkeys(
    "F1",
    () => {
      if (isOpen) handleConfirm(true);
    },
    [isOpen, method, numericCash, numericCard, total, selectedCustomer],
  );

  useHotkeys(
    "F2",
    () => {
      if (isOpen) handleConfirm(false);
    },
    [isOpen, method, numericCash, numericCard, total, selectedCustomer],
  );

  useHotkeys(
    "Escape",
    () => {
      if (isOpen) {
        if (customerSearchOpen) setCustomerSearchOpen(false);
        else onClose();
      }
    },
    [isOpen, customerSearchOpen],
  );

  const calculateChange = () => {
    if (variant === "debt") return 0; // No change in debt payments
    if (method === "cash") return numericCash - total;
    if (method === "mixed") return numericCash + numericCard - total;
    return 0;
  };

  const change = calculateChange();
  const missing = variant === "sale" ? total - (numericCash + numericCard) : 0;

  const isCreditLimitExceeded = () => {
    if (!selectedCustomer) return false;
    return (
      selectedCustomer.current_balance + total > selectedCustomer.credit_limit
    );
  };

  const isValid = () => {
    if (method === "credit") {
      return !!selectedCustomer && !isCreditLimitExceeded();
    }

    if (variant === "sale") {
      if (method === "card_transfer") return true;
      if (method === "cash") return numericCash >= total - 0.01;
      if (method === "mixed") return numericCash + numericCard >= total - 0.01;
    } else {
      // Debt Validations
      if (currentPaymentSum <= 0) return false;
      if (currentPaymentSum > debtLimit + 0.01) return false;
      return true;
    }
    return false;
  };

  const handleConfirm = (shouldPrint: boolean) => {
    if (isProcessing) return;

    if (!isValid()) {
      if (method === "credit") {
        if (!selectedCustomer) toast.error("Seleccione un cliente");
        else if (isCreditLimitExceeded())
          toast.error("Límite de crédito excedido");
      } else {
        if (variant === "debt" && currentPaymentSum > debtLimit) {
          toast.error("El abono excede la deuda actual");
        } else {
          toast.error("Monto inválido para cubrir el total");
        }
      }
      return;
    }

    const customerId =
      variant === "debt" ? defaultCustomerId : selectedCustomer?.id;

    let finalMethod = method === "card_transfer" ? "card" : method;

    onProcessSale(
      finalMethod,
      numericCash,
      numericCard,
      shouldPrint,
      customerId,
      notes,
    );
  };

  const addQuickCash = (amount: number) => {
    if (method === "cash") setCashAmount(amount.toString());
    if (method === "cash" && cashInputRef.current) {
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
              {variant === "sale" ? "Cobro Ticket" : "Registrar Abono"}
            </span>
            <div className="text-right">
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">
                {variant === "sale" ? "Total a Pagar" : "Monto del Abono"}
              </p>
              <div className="flex items-baseline justify-end gap-2">
                <p
                  className={cn(
                    "text-5xl font-extrabold tabular-nums",
                    variant === "debt" && currentPaymentSum > debtLimit
                      ? "text-red-500"
                      : "text-[#480489]",
                  )}
                >
                  {formatCurrency(displayTotal)}
                </p>
                {variant === "debt" && (
                  <span className="text-sm text-muted-foreground font-medium">
                    / {formatCurrency(debtLimit)} (Deuda)
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[480px]">
          {/* Left: Payment Method Selection */}
          <div className="w-1/3 bg-zinc-100/50 border-r p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Forma de Pago
            </p>

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
            {variant === "sale" && (
              <MethodButton
                active={method === "credit"}
                onClick={() => setMethod("credit")}
                icon={<Lock className="w-5 h-5" />}
                label="Crédito a Cliente"
              />
            )}
          </div>

          {/*Inputs & Details */}
          <div className="flex-1 p-4 bg-white flex flex-col justify-center space-y-6 overflow-y-auto">
            {/* CREDIT SEARCH (Only for Sale Mode) */}
            {method === "credit" && variant === "sale" && (
              <div className="flex flex-col h-full justify-start space-y-4 pt-0 overflow-y-auto">
                <div className="space-y-4">
                  <label className="text-lg font-bold block text-[#480489]">
                    Cliente para Crédito
                  </label>
                  <Popover
                    open={customerSearchOpen}
                    onOpenChange={setCustomerSearchOpen}
                    modal={true}
                  >
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
                            <span className="font-semibold">
                              {selectedCustomer.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Buscar cliente...
                          </span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command
                        shouldFilter={false}
                        className="rounded-lg border-0"
                      >
                        <CommandInput
                          placeholder="Buscar por nombre..."
                          value={customerSearchQuery}
                          onValueChange={setCustomerSearchQuery}
                        />
                        <CommandList>
                          <div className="max-h-[300px] overflow-y-auto">
                            {isSearchingCustomers && (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />{" "}
                                Buscando...
                              </div>
                            )}
                            {!isSearchingCustomers &&
                              customers.length === 0 && (
                                <CommandEmpty>
                                  No se encontraron clientes.
                                </CommandEmpty>
                              )}
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
                                      selectedCustomer?.id === customer.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{customer.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Saldo:{" "}
                                      {formatCurrency(customer.current_balance)}{" "}
                                      / Lim:{" "}
                                      {formatCurrency(customer.credit_limit)}
                                    </span>
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
                  <div
                    className={cn(
                      "rounded-xl p-6 border-2 transition-all",
                      isCreditLimitExceeded()
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-200",
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg">
                          {selectedCustomer.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Estado de Cuenta
                        </p>
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
                        <span className="font-medium">
                          {formatCurrency(selectedCustomer.current_balance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>+ Esta Venta:</span>
                        <span className="font-bold">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <div className="h-px bg-black/10 my-2" />
                      <div className="flex justify-between text-base font-bold">
                        <span>Nuevo Saldo:</span>
                        <span
                          className={
                            isCreditLimitExceeded()
                              ? "text-red-600"
                              : "text-zinc-900"
                          }
                        >
                          {formatCurrency(
                            selectedCustomer.current_balance + total,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 text-muted-foreground">
                        <span>Límite de Crédito:</span>
                        <span>
                          {formatCurrency(selectedCustomer.credit_limit)}
                        </span>
                      </div>
                    </div>

                    {isCreditLimitExceeded() && (
                      <div className="mt-4 bg-red-100 text-red-800 p-3 rounded-md text-sm font-semibold flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Límite de crédito excedido por{" "}
                        {formatCurrency(
                          selectedCustomer.current_balance +
                            total -
                            selectedCustomer.credit_limit,
                        )}
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

            {/* CASH PAYMENT */}
            {method === "cash" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-lg font-medium block">
                    {variant === "sale"
                      ? "¿Con cuánto paga?"
                      : "Monto a Abonar"}
                  </label>
                  <div className="relative">
                    <MoneyInput
                      ref={cashInputRef}
                      className="pl-16 h-32 !text-7xl font-bold shadow-sm"
                      symbolClassName="left-4 top-1/2 -translate-y-1/2 text-6xl text-zinc-400"
                      value={cashAmount}
                      onChange={(e) =>
                        handleNumericInput(e.target.value, setCashAmount)
                      }
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
                  {variant === "debt" && (
                    <Button
                      variant="outline"
                      className="h-12 text-xl font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      onClick={() => setCashAmount(total.toString())}
                    >
                      Total
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* CARD / TRANSFER */}
            {method === "card_transfer" && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                <CreditCard className="w-24 h-24 opacity-20" />
                {variant === "sale" ? (
                  <>
                    <p className="text-xl font-medium">
                      Cobro exacto a tarjeta
                    </p>
                    <p className="text-3xl font-bold text-zinc-900">
                      {formatCurrency(total)}
                    </p>
                  </>
                ) : (
                  <div className="w-full space-y-4">
                    <label className="text-lg font-medium block text-zinc-900">
                      Monto a Abonar (Tarjeta)
                    </label>
                    <MoneyInput
                      ref={cardInputRef}
                      className="pl-16 h-32 !text-7xl font-bold shadow-sm text-zinc-900"
                      symbolClassName="left-4 top-1/2 -translate-y-1/2 text-6xl text-zinc-400"
                      value={cardAmount}
                      onChange={(e) =>
                        handleNumericInput(e.target.value, setCardAmount)
                      }
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}

            {/* MIXED PAYMENT */}
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
                        onChange={(e) =>
                          handleNumericInput(e.target.value, setCashAmount)
                        }
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {variant === "sale" ? "Tarjeta (Automático)" : "Tarjeta"}
                    </label>
                    <div className="relative">
                      <MoneyInput
                        ref={cardInputRef}
                        className={cn(
                          "pl-12 h-24 !text-5xl font-bold",
                          variant === "sale" ? "bg-zinc-50" : "bg-white",
                        )}
                        symbolClassName="left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-4xl"
                        value={cardAmount}
                        onChange={(e) =>
                          handleNumericInput(e.target.value, setCardAmount)
                        }
                        readOnly={variant === "sale"}
                        tabIndex={variant === "sale" ? -1 : 0}
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

                {variant === "sale" && missing > 0.01 && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg flex justify-between items-center">
                    <span className="font-medium">Faltante:</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(missing)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* FOOTER AREA */}
            {(method === "cash" || method === "mixed") &&
              variant === "sale" && (
                <div
                  className={`p-6 rounded-xl flex justify-between items-center transition-colors ${
                    change >= 0
                      ? "bg-green-50 text-green-900"
                      : "bg-red-50 text-red-900"
                  }`}
                >
                  <span className="text-xl font-bold">Cambio</span>
                  <span className="text-5xl font-extrabold tracking-tight">
                    {formatCurrency(change > 0 ? change : 0)}
                  </span>
                </div>
              )}

            {variant === "debt" && (
              <div className="pt-2">
                <Label className="mb-2 block">Notas / Referencia</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Folio, referencia..."
                  className="h-12 text-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS FOOTER */}
        <div className="p-6 bg-zinc-50 border-t flex justify-end gap-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="mr-auto text-zinc-500 text-lg"
          >
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
              {isProcessing ? (
                <Loader2 className="animate-spin mr-2" />
              ) : variant === "sale" ? (
                <XCircle className="w-6 h-6 mr-2 opacity-50" />
              ) : (
                <Save className="w-6 h-6 mr-2 opacity-50" />
              )}
              {variant === "sale" ? "Cobrar sin Ticket (F2)" : "Guardar (F2)"}
            </Button>

            <Button
              size="lg"
              className="h-14 text-xl bg-[#480489] hover:bg-[#360368] px-10 font-bold min-w-[240px] shadow-md transition-all active:scale-[0.98]"
              onClick={() => handleConfirm(true)}
              disabled={!isValid() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Printer className="w-6 h-6 mr-2" />
              )}
              {variant === "sale"
                ? "Cobrar e Imprimir (F1)"
                : "Guardar e Imprimir (F1)"}
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
  className,
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
        disabled &&
          "cursor-not-allowed opacity-50 bg-zinc-100 hover:bg-zinc-100",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-lg">{label}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-muted-foreground font-mono bg-zinc-100 px-2 py-1 rounded">
          {shortcut}
        </span>
      )}
    </button>
  );
}
