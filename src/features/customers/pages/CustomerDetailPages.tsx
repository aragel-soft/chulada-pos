import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, User, AlertCircle, Wallet } from "lucide-react";
import { format, subYears, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyablePhone } from "@/components/ui/copyable-phone";
import { DataTable } from "@/components/ui/data-table/data-table";
import {
  getCustomerAccountStatement,
  registerDebtPayment,
} from "@/lib/api/account";
import { getCustomers } from "@/lib/api/customers";
import { formatCurrency, cn } from "@/lib/utils";
import { AccountMovement } from "@/types/account";
import SalesHistoryModule from "@/features/sales/components/SalesHistoryModule";
import { CheckoutModal } from "@/features/sales/components/CheckoutModal";
import { useAuthStore } from "@/stores/authStore";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const shift = useCashRegisterStore((state) => state.shift);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const initialCustomer = location.state?.customer;

  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const response = await getCustomers({ page: 1, pageSize: 1, search: id });
      return response.data[0] || null;
    },
    initialData: initialCustomer,
    enabled: !!id,
  });

  const { data: statement, isLoading: isLoadingStatement } = useQuery({
    queryKey: ["account-statement", id],
    queryFn: () => getCustomerAccountStatement(id!),
    enabled: !!id,
  });

  const customerHistoryFilters = useMemo(
    () => ({
      customer_id: id,
      start_date: format(subYears(new Date(), 1), "yyyy-MM-dd"),
      end_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    }),
    [id],
  );

  const customer = customerData;
  const columns = useMemo<ColumnDef<AccountMovement>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs font-mono">
            {format(new Date(row.getValue("date")), "dd/MM/yyyy HH:mm", {
              locale: es,
            })}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "reference",
        header: "Folio / Concepto",
        cell: ({ row }) => {
          const isCharge = row.original.movement_type === "charge";
          return (
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                {isCharge ? "Compra a Crédito" : "Abono a Cuenta"}
              </span>
              <span className="text-xs text-muted-foreground uppercase">
                {row.original.reference}{" "}
                {row.original.notes && `• ${row.original.notes}`}
              </span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "charge",
        header: () => <div className="text-right">Cargo (+)</div>,
        cell: ({ row }) => {
          const isCharge = row.original.movement_type === "charge";
          return (
            <div className="text-right font-medium text-gray-900">
              {isCharge ? formatCurrency(row.original.amount) : "-"}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "payment",
        header: () => <div className="text-right">Abono (-)</div>,
        cell: ({ row }) => {
          const isCharge = row.original.movement_type === "charge";
          return (
            <div className="text-right font-medium text-emerald-600">
              {!isCharge ? formatCurrency(row.original.amount) : "-"}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "balance_after",
        header: () => <div className="text-right">Saldo</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-gray-800 tabular-nums">
            {formatCurrency(row.getValue("balance_after"))}
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const handleProcessPayment = async (
    method: string,
    cashAmount: number,
    cardAmount: number,
    shouldPrint: boolean,
    _customerId?: string,
    notes?: string,
  ) => {
    if (!customer) return;

    if (!shift || shift.status !== "open") {
      toast.error("Caja cerrada. Debes abrir un turno para recibir pagos.");
      return;
    }
    if (!user) {
      toast.error("Sesión inválida. Recarga la página.");
      return;
    }

    try {
      setIsProcessingPayment(true);
      const apiMethod = method === "card_transfer" ? "card" : method;

      await registerDebtPayment({
        customer_id: customer.id,
        user_id: user.id,
        shift_id: shift.id.toString(),
        total_amount: cashAmount + cardAmount,
        payment_method: apiMethod as any,
        cash_amount: cashAmount,
        card_amount: cardAmount,
        notes: notes || null,
      });

      toast.success("Abono registrado correctamente");
      queryClient.invalidateQueries({ queryKey: ["account-statement", id] });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setIsPaymentModalOpen(false);

      if (shouldPrint) {
        toast.info("Imprimiendo recibo...");
        // TODO: Call printer service here
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar el abono");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!customer && isLoadingCustomer) {
    return <CustomerDetailSkeleton />;
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
        <p>No se encontró información del cliente.</p>
        <Button variant="link" onClick={() => navigate("/customers")}>
          Regresar
        </Button>
      </div>
    );
  }

  const currentBalance = statement?.current_balance ?? customer.current_balance;
  const isDebt = currentBalance > 0.01;
  const balanceColorClass = isDebt ? "text-destructive" : "text-emerald-600";

  return (
    <div className="flex flex-col h-full p-4 mt-2 gap-4 bg-background animate-in fade-in duration-300">
      {/* Header Compacto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-4 mt-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <User className="h-7 w-7" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {customer.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <Badge
                variant="outline"
                className="font-mono text-xs font-normal"
              >
                {customer.code || "S/C"}
              </Badge>
              <CopyablePhone phone={customer.phone} />
            </div>
          </div>
        </div>

        <div className="text-right min-w-[120px]">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Saldo Actual
          </p>
          <div className={`text-3xl font-bold ${balanceColorClass}`}>
            {formatCurrency(currentBalance)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ledger" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none bg-transparent p-0 border-b h-auto">
          <TabsTrigger
            value="ledger"
            className={cn(
              "relative rounded-none bg-transparent px-4 pb-3 pt-2 text-muted-foreground shadow-none transition-none",
              "data-[state=active]:border-b-2 data-[state=active]:border-[#480489] data-[state=active]:text-[#480489] data-[state=active]:font-bold data-[state=active]:shadow-none",
              "hover:text-foreground",
            )}
          >
            Estado de Cuenta
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className={cn(
              "relative rounded-none bg-transparent px-4 pb-3 pt-2 text-muted-foreground shadow-none transition-none",
              "data-[state=active]:border-b-2 data-[state=active]:border-[#480489] data-[state=active]:text-[#480489] data-[state=active]:font-bold data-[state=active]:shadow-none",
              "hover:text-foreground",
            )}
          >
            Historial de Ventas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="flex-1 mt-4">
          <div className="h-full border rounded-md overflow-auto bg-white">
            <DataTable
              columns={columns}
              data={statement?.movements || []}
              isLoading={isLoadingStatement}
              searchPlaceholder="Buscar folio..."
              manualPagination={false}
              manualSorting={false}
              initialPageSize={16}
              showColumnFilters={false}
              actions={
                isDebt && (
                  <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="bg-[#480489] hover:bg-[#360368] text-white font-bold shadow-sm"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Abonar a Deuda
                  </Button>
                )
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-4">
          <SalesHistoryModule
            initialFilters={{ ...customerHistoryFilters }}
            defaultCollapsed={true}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Integration */}
      {customer && (
        <CheckoutModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          total={currentBalance}
          variant="debt"
          defaultCustomerId={customer.id}
          onProcessSale={handleProcessPayment}
          isProcessing={isProcessingPayment}
        />
      )}
    </div>
  );
}

function CustomerDetailSkeleton() {
  return (
    <div className="p-6 space-y-6 h-full bg-background">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-32" />
      </div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  );
}
