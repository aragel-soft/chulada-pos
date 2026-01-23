import { useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query"; 
import { ColumnDef } from "@tanstack/react-table";
import { 
  ArrowLeft, 
  User,
  AlertCircle, 
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyablePhone } from "@/components/ui/copyable-phone";
import { DataTable } from "@/components/ui/data-table/data-table"; 
import { getCustomerAccountStatement } from "@/lib/api/account";
import { getCustomers } from "@/lib/api/customers";
import { formatCurrency, cn } from "@/lib/utils";
import { AccountMovement } from "@/types/account";
import { Card } from "@/components/ui/card";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

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

  const customer = customerData;
  const columns = useMemo<ColumnDef<AccountMovement>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs font-mono">
            {format(new Date(row.getValue("date")), "dd/MM/yyyy HH:mm", { locale: es })}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "reference",
        header: "Folio / Concepto",
        cell: ({ row }) => {
          const isCharge = row.original.movement_type === 'charge';
          return (
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                {isCharge ? "Compra a Crédito" : "Abono a Cuenta"}
              </span>
              <span className="text-xs text-muted-foreground uppercase">
                {row.original.reference} {row.original.notes && `• ${row.original.notes}`}
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
          const isCharge = row.original.movement_type === 'charge';
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
          const isCharge = row.original.movement_type === 'charge';
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
    []
  );

  if (!customer && isLoadingCustomer) {
      return <CustomerDetailSkeleton />;
  }

  if (!customer) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
            <p>No se encontró información del cliente.</p>
            <Button variant="link" onClick={() => navigate("/customers")}>Regresar</Button>
        </div>
    );
  }

  const currentBalance = statement?.current_balance ?? customer.current_balance;
  const isDebt = currentBalance > 0;
  const balanceColorClass = isDebt ? "text-destructive" : "text-emerald-600";

  return (
    <div className="flex flex-col h-full p-4 mt-2 gap-4 bg-background animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/customers")}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Clientes
            </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{customer.name}</h1>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <Badge variant="outline" className="font-mono text-xs font-normal">
                            {customer.code || "S/C"}
                        </Badge>
                        <CopyablePhone phone={customer.phone} />
                    </div>
                </div>
            </div>

            <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Saldo Actual
                </p>
                <div className={`text-3xl font-bold ${balanceColorClass}`}>
                    {formatCurrency(currentBalance)}
                </div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ledger" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none bg-transparent p-0 border-b h-auto flex-none">
            <TabsTrigger 
                value="ledger"
                className={cn(
                    "relative rounded-none bg-transparent px-4 pb-3 pt-2 text-muted-foreground shadow-none transition-none",
                    "data-[state=active]:border-b-2 data-[state=active]:border-[#480489] data-[state=active]:text-[#480489] data-[state=active]:font-bold data-[state=active]:shadow-none",
                    "hover:text-foreground"
                )}
            >
                Estado de Cuenta
            </TabsTrigger>
            
            <TabsTrigger 
                value="history"
                className={cn(
                    "relative rounded-none bg-transparent px-4 pb-3 pt-2 text-muted-foreground shadow-none transition-none",
                    "data-[state=active]:border-b-2 data-[state=active]:border-[#480489] data-[state=active]:text-[#480489] data-[state=active]:font-bold data-[state=active]:shadow-none",
                    "hover:text-foreground"
                )}
            >
                Historial de Ventas
            </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="flex-1 mt-4 overflow-hidden flex flex-col">
            <div className="flex-1 border rounded-md overflow-auto flex flex-col bg-white">
                <DataTable 
                    columns={columns} 
                    data={statement?.movements || []} 
                    isLoading={isLoadingStatement}
                    searchPlaceholder="Buscar folio..."
                    manualPagination={false} 
                    manualSorting={false}
                    initialPageSize={16} 
                />
            </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
            <Card className="border shadow-sm p-8 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Calendar className="h-8 w-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Historial en Construcción</h3>
                <p className="max-w-sm mt-2">
                    Próximamente verás aquí el desglose de productos comprados.
                </p>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerDetailSkeleton() {
    return (
        <div className="p-6 space-y-6 h-full bg-background">
            <div className="flex justify-between items-center">
                <div className="flex gap-4">
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