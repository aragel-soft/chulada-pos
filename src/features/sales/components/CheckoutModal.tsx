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
  Ticket as TicketIcon,
  StickyNote,
  Pencil,
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
import { validateVoucher } from "@/lib/api/cash-register/sales";
import { VoucherValidationResponse } from "@/types/sale";


import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { OpenShiftModal } from "@/features/cash-register/components/OpenShiftModal";

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
    voucherCode?: string,
    notes?: string,
  ) => Promise<void>;
  isProcessing: boolean;
  variant?: "sale" | "debt";
  defaultCustomerId?: string;
}

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
  const shift = useCashRegisterStore((state) => state.shift);
  const user = useAuthStore((state) => state.user);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
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
  const voucherInputRef = useRef<HTMLInputElement>(null);

  // Voucher State (only for sale variant)
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherData, setVoucherData] =
    useState<VoucherValidationResponse | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const isShiftOpen = shift && shift.status === "open";

  useEffect(() => {
    if (isOpen) {
      setMethod("cash");
      setCashAmount(variant === "sale" ? total.toString() : "");
      setCardAmount("");
      setNotes("");
      setSelectedCustomer(null);
      setCustomerSearchQuery("");
      setVoucherCode("");
      setVoucherData(null);
      setIsVoucherOpen(false);
      setIsNotesOpen(false);
      if (isShiftOpen) {
        setTimeout(() => cashInputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, total, variant, isShiftOpen]);

  const numericCash = parseFloat(cashAmount) || 0;
  const numericCard = parseFloat(cardAmount) || 0;
  const currentPaymentSum = numericCash + numericCard;
  const debtLimit = variant === "debt" ? total : Infinity;

  // --- Voucher Logic (sale only) ---
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    setIsValidatingVoucher(true);
    try {
      const voucher = await validateVoucher(voucherCode);
      setVoucherData(voucher);
      setIsVoucherOpen(false);
      setVoucherCode("");
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

  // Calculations with Voucher (sale variant only)
  const voucherBalance = voucherData?.current_balance || 0;
  const voucherAppliedAmount =
    variant === "sale" && voucherData ? Math.min(total, voucherBalance) : 0;
  const remainingTotal =
    variant === "sale" ? Math.max(0, total - voucherAppliedAmount) : total;

  // Display total: for sale it's the remaining (after voucher), for debt it's what the user is paying
  const displayTotal =
    variant === "sale" ? remainingTotal : currentPaymentSum;

  // Update amounts when method changes
  useEffect(() => {
    if (method === "card_transfer") {
      if (variant === "sale") {
        setCardAmount(remainingTotal.toString());
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
  }, [method, variant]);

  // Auto-calculate card in mixed mode for sale
  useEffect(() => {
    if (method === "mixed" && variant === "sale") {
      const currentCash = parseFloat(cashAmount) || 0;
      const remaining = Math.max(0, remainingTotal - currentCash);
      const newCardVal = remaining > 0 ? remaining.toFixed(2) : "0";
      setCardAmount(newCardVal);
    }
  }, [cashAmount, method, remainingTotal, variant]);

  // Update default amounts when voucher changes (sale only)
  useEffect(() => {
    if (variant !== "sale" || !voucherData) return;
    if (method === "cash") {
      setCashAmount(remainingTotal.toString());
    } else if (method === "card_transfer") {
      setCardAmount(remainingTotal.toString());
    } else if (method === "mixed") {
      setCashAmount("");
      setCardAmount(remainingTotal.toString());
    }
  }, [voucherAppliedAmount]);

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
    if (method === "credit") searchCustomers();
  }, [debouncedSearch, method, isOpen]);

  const handleNumericInput = (
    value: string,
    setter: (val: string) => void,
  ) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) setter(value);
  };

  const methods: PaymentMethod[] =
    variant === "sale"
      ? ["cash", "card_transfer", "mixed", "credit"]
      : ["cash", "card_transfer", "mixed"];

  const handleNextMethod = () => {
    const idx = methods.indexOf(method);
    setMethod(methods[(idx + 1) % methods.length]);
  };
  const handlePrevMethod = () => {
    const idx = methods.indexOf(method);
    setMethod(methods[(idx - 1 + methods.length) % methods.length]);
  };

  useHotkeys(
    "ArrowDown",
    () => isOpen && isShiftOpen && !customerSearchOpen && handleNextMethod(),
    [isOpen, isShiftOpen, method, customerSearchOpen],
  );
  useHotkeys(
    "ArrowUp",
    () => isOpen && isShiftOpen && !customerSearchOpen && handlePrevMethod(),
    [isOpen, isShiftOpen, method, customerSearchOpen],
  );
  useHotkeys("F1", () => isShiftOpen && handleConfirm(true), [
    isOpen,
    isShiftOpen,
    method,
    numericCash,
    numericCard,
  ]);
  useHotkeys("F2", () => isShiftOpen && handleConfirm(false), [
    isOpen,
    isShiftOpen,
    method,
    numericCash,
    numericCard,
  ]);
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

  // Change calculation
  const calculateChange = () => {
    if (variant === "debt") return 0;
    if (method === "cash") return numericCash - remainingTotal;
    if (method === "mixed")
      return numericCash + numericCard - remainingTotal;
    return 0;
  };
  const change = calculateChange();

  const missing =
    variant === "sale"
      ? remainingTotal - (numericCash + numericCard)
      : 0;

  const isCreditLimitExceeded = () => {
    if (!selectedCustomer) return false;
    return (
      selectedCustomer.current_balance + remainingTotal >
      selectedCustomer.credit_limit
    );
  };

  const isValid = () => {
    if (!isShiftOpen) return false;

    // If fully paid by voucher (sale only)
    if (variant === "sale" && remainingTotal === 0 && voucherData) return true;

    if (method === "credit")
      return !!selectedCustomer && !isCreditLimitExceeded();

    if (variant === "sale") {
      if (method === "card_transfer") return true;
      if (method === "cash") return numericCash >= remainingTotal - 0.01;
      if (method === "mixed")
        return numericCash + numericCard >= remainingTotal - 0.01;
    } else {
      // debt variant
      if (currentPaymentSum <= 0) return false;
      if (currentPaymentSum > debtLimit + 0.01) return false;
      return true;
    }
    return false;
  };

  const handleConfirm = (shouldPrint: boolean) => {
    if (isProcessing || !isValid()) {
      if (!isShiftOpen) toast.error("Caja cerrada");
      else if (variant === "debt" && currentPaymentSum > debtLimit)
        toast.error("El abono excede la deuda");
      else if (method === "credit") {
        if (!selectedCustomer) toast.error("Seleccione un cliente");
        else if (isCreditLimitExceeded())
          toast.error("Límite de crédito excedido");
      } else toast.error("Monto insuficiente para cubrir el total");
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
      voucherData?.code,
      notes,
    );
  };

  const addQuickCash = (amount: number) => {
    if (method === "cash" || method === "mixed") {
      setCashAmount(amount.toString());
      cashInputRef.current?.focus();
    }
  };

  const hasPermissionToOpen = user?.permissions?.includes("cash_register:open");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "p-0 overflow-hidden bg-zinc-50 gap-0 transition-all duration-200",
          !isShiftOpen
            ? "sm:max-w-md bg-white border-zinc-200 shadow-xl"
            : "sm:max-w-4xl",
        )}
      >
        {!isShiftOpen ? (
          // --- CLOSED SHIFT STATE ---
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[320px]">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
              <Lock className="w-8 h-8 text-[#480489]" />
            </div>
            <h3 className="text-xl font-bold text-zinc-800 mb-3">
              Caja Cerrada
            </h3>
            <p className="text-sm text-zinc-500 mb-8 max-w-[280px] leading-relaxed">
              Para realizar cobros o registrar abonos, es necesario iniciar un
              turno de caja.
            </p>

            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              {hasPermissionToOpen && (
                <OpenShiftModal
                  trigger={
                    <Button className="flex-1 bg-[#480489] hover:bg-[#360368] font-semibold shadow-md">
                      Abrir Caja
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        ) : (
          // --- STANDARD PAYMENT STATE ---
          <>
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
                  <div className="flex flex-col items-end">
                    {variant === "sale" && voucherData && (
                      <span className="text-sm text-green-600 font-bold line-through decoration-zinc-400 decoration-2">
                        {formatCurrency(total)}
                      </span>
                    )}
                    <div className="flex items-baseline justify-end gap-2">
                      <p
                        className={cn(
                          "text-5xl font-extrabold tabular-nums",
                          variant === "debt" &&
                            currentPaymentSum > debtLimit
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
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex h-[480px]">
              {/* Left: Methods */}
              <div className="w-1/3 bg-zinc-100/50 border-r p-4 space-y-3 overflow-y-auto">
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

                {/* Voucher Section (sale only) */}
                {variant === "sale" && (
                  <div className="pt-4 border-t mt-4">
                    {!voucherData ? (
                      <Dialog
                        open={isVoucherOpen}
                        onOpenChange={setIsVoucherOpen}
                      >
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              Aplicar Vale de Tienda
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Código del Vale / Escanear
                              </label>
                              <input
                                ref={voucherInputRef}
                                className="w-full text-2xl font-bold p-3 border rounded-md uppercase tracking-wider text-center"
                                placeholder="VALE-XXXX"
                                value={voucherCode}
                                onChange={(e) =>
                                  setVoucherCode(
                                    e.target.value.toUpperCase(),
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleValidateVoucher();
                                }}
                                autoFocus
                              />
                            </div>
                            <Button
                              className="w-full h-12 text-lg bg-[#480489] hover:bg-[#360368]"
                              onClick={handleValidateVoucher}
                              disabled={
                                !voucherCode || isValidatingVoucher
                              }
                            >
                              {isValidatingVoucher ? (
                                <Loader2 className="animate-spin mr-2" />
                              ) : (
                                "Validar y Aplicar"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 text-zinc-600 border-dashed border-2 hover:border-[#480489] hover:text-[#480489] hover:bg-purple-50"
                          onClick={() => setIsVoucherOpen(true)}
                        >
                          <TicketIcon className="w-5 h-5" />
                          <span className="font-semibold">
                            Usar Vale de Tienda
                          </span>
                        </Button>
                      </Dialog>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 relative group">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">
                              Vale Aplicado
                            </p>
                            <p className="font-mono font-bold text-green-900">
                              {voucherData.code}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Saldo rest.:{" "}
                              {formatCurrency(
                                Math.max(
                                  0,
                                  voucherData.current_balance -
                                    voucherAppliedAmount,
                                ),
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-700">
                              -{formatCurrency(voucherAppliedAmount)}
                            </p>
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
                )}

                {/* Notes Section (both variants) */}
                <div className="pt-3 border-t mt-3">
                  {!isNotesOpen && !notes.trim() ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-10 text-zinc-500 border-dashed border-2 hover:border-[#480489] hover:text-[#480489] hover:bg-purple-50 text-sm"
                      onClick={() => setIsNotesOpen(true)}
                    >
                      <StickyNote className="w-4 h-4" />
                      <span className="font-medium">Agregar Nota</span>
                    </Button>
                  ) : isNotesOpen ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          Nota
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-400 hover:text-zinc-600"
                          onClick={() => setIsNotesOpen(false)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={variant === "debt" ? "Folio, referencia..." : "Observaciones..."}
                        className="w-full text-sm border rounded-lg p-2.5 resize-none h-[72px] focus:outline-none focus:ring-2 focus:ring-[#480489]/30 focus:border-[#480489] transition-all placeholder:text-zinc-400"
                        autoFocus
                        maxLength={200}
                      />
                      <p className="text-[10px] text-zinc-400 text-right">
                        {notes.length}/200
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 relative group">
                      <div className="flex items-start gap-2">
                        <StickyNote className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed line-clamp-2 flex-1">
                          {notes}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 text-amber-500 hover:text-[#480489]"
                          onClick={() => setIsNotesOpen(true)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 p-4 bg-white flex flex-col justify-center space-y-6 overflow-y-auto">
                {/* CUSTOMER SEARCH (Only Sale-Credit) */}
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
                            <Search className="ml-2 h-4 w-4 opacity-50" />
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
                              placeholder="Buscar..."
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
                                      No hay resultados.
                                    </CommandEmpty>
                                  )}
                                <CommandGroup>
                                  {customers.map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.name}
                                      onSelect={() => {
                                        setSelectedCustomer(c);
                                        setCustomerSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedCustomer?.id === c.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{c.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Saldo:{" "}
                                          {formatCurrency(c.current_balance)}
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

                    {selectedCustomer ? (
                      <div
                        className={cn(
                          "rounded-xl p-6 border-2",
                          isCreditLimitExceeded()
                            ? "bg-red-50 border-red-200"
                            : "bg-blue-50 border-blue-200",
                        )}
                      >
                        <div className="flex justify-between mb-4">
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
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Saldo Actual:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                selectedCustomer.current_balance,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>+ Compra:</span>
                            <span className="font-bold">
                              {formatCurrency(remainingTotal)}
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
                                selectedCustomer.current_balance +
                                  remainingTotal,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground pt-2">
                            <span>Límite:</span>
                            <span>
                              {formatCurrency(selectedCustomer.credit_limit)}
                            </span>
                          </div>
                        </div>
                        {isCreditLimitExceeded() && (
                          <div className="mt-4 bg-red-100 text-red-800 p-3 rounded-md text-sm font-semibold flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Excedido por{" "}
                            {formatCurrency(
                              selectedCustomer.current_balance +
                                remainingTotal -
                                selectedCustomer.credit_limit,
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 border-2 border-dashed rounded-xl border-zinc-200">
                        <Search className="w-12 h-12 mb-2 opacity-20" />
                        <p>Busca un cliente</p>
                      </div>
                    )}
                  </div>
                )}

                {/* INPUTS - CASH */}
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
                    <div className="grid grid-cols-3 gap-3">
                      {QUICK_CASH_AMOUNTS.map((amt) => (
                        <Button
                          key={amt}
                          variant="outline"
                          className="h-12 text-xl font-bold text-zinc-600 hover:text-[#480489] hover:bg-purple-50"
                          onClick={() => addQuickCash(amt)}
                        >
                          ${amt}
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

                {/* INPUTS - CARD */}
                {method === "card_transfer" && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                    <CreditCard className="w-24 h-24 opacity-20" />
                    {variant === "sale" ? (
                      <>
                        <p className="text-xl font-medium">
                          Cobro exacto a tarjeta
                        </p>
                        <p className="text-3xl font-bold text-zinc-900">
                          {formatCurrency(remainingTotal)}
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

                {/* INPUTS - MIXED */}
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
                              handleNumericInput(
                                e.target.value,
                                setCashAmount,
                              )
                            }
                            placeholder="0.00"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {variant === "sale"
                            ? "Tarjeta (Automático)"
                            : "Tarjeta"}
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
                              handleNumericInput(
                                e.target.value,
                                setCardAmount,
                              )
                            }
                            readOnly={variant === "sale"}
                            tabIndex={variant === "sale" ? -1 : 0}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {QUICK_CASH_AMOUNTS.map((amt) => (
                        <Button
                          key={amt}
                          variant="outline"
                          size="sm"
                          className="h-12 text-xl font-bold text-zinc-600 hover:text-[#480489] hover:bg-purple-50"
                          onClick={() => addQuickCash(amt)}
                        >
                          ${amt}
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

                {/* CHANGE DISPLAY */}
                {(method === "cash" || method === "mixed") &&
                  variant === "sale" && (
                    <div
                      className={cn(
                        "p-6 rounded-xl flex justify-between items-center transition-colors",
                        change >= 0
                          ? "bg-green-50 text-green-900"
                          : "bg-red-50 text-red-900",
                      )}
                    >
                      <span className="text-xl font-bold">Cambio</span>
                      <span className="text-5xl font-extrabold tracking-tight">
                        {formatCurrency(change > 0 ? change : 0)}
                      </span>
                    </div>
                  )}


              </div>
            </div>

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
                  className="h-14 text-xl min-w-[200px]"
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
                  {variant === "sale"
                    ? "Cobrar sin Ticket (F2)"
                    : "Abonar (F2)"}
                </Button>
                <Button
                  size="lg"
                  className="h-14 text-xl bg-[#480489] hover:bg-[#360368] px-10 font-bold min-w-[240px]"
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
                    : "Abonar e Imprimir (F1)"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MethodButton({ active, onClick, icon, label, shortcut }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-4 rounded-lg flex items-center justify-between transition-all border-2",
        active
          ? "bg-white border-[#480489] text-[#480489] shadow-md ring-1 ring-[#480489]/20"
          : "bg-white border-transparent hover:bg-zinc-200 text-zinc-600",
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
