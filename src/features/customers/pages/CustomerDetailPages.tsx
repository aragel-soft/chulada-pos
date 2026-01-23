import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query"; 
import { 
  ArrowLeft, 
  Receipt, 
  ShoppingBag, 
  Calendar,
  User,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { getCustomerAccountStatement } from "@/lib/api/account";
import { getCustomers } from "@/lib/api/customers";
import { formatCurrency } from "@/lib/utils";
import { CopyablePhone } from "@/components/ui/copyable-phone";

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
  const balanceColorClass = isDebt ? "text-orange-600" : "text-emerald-600";

  return (
    <div className="flex flex-col h-full space-y-6 p-6 bg-gray-50/50 min-h-screen animate-in fade-in duration-300">
      
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/customers")}
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Clientes
        </Button>
      </div>

      {/* Hero Header */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Badge variant="outline" className="font-mono text-xs text-gray-500">
                                    {customer.code || "S/C"}
                                </Badge>
                            </span>
                            <span className="flex items-center gap-1">
                                <CopyablePhone phone={customer.phone} />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Saldo Actual
                    </p>
                    <div className={`text-4xl font-extrabold tracking-tight ${balanceColorClass}`}>
                        {formatCurrency(currentBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {isDebt ? "Saldo Pendiente de Pago" : "Cuenta al corriente"}
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="ledger" className="flex-1 flex flex-col">
        <div className="flex items-center justify-between">
            <TabsList className="bg-white border p-1 h-auto">
                <TabsTrigger value="ledger" className="px-4 py-2 gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                    <Receipt className="h-4 w-4" />
                    Estado de Cuenta
                </TabsTrigger>
                <TabsTrigger value="history" className="px-4 py-2 gap-2 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                    <ShoppingBag className="h-4 w-4" />
                    Historial de Ventas
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="ledger" className="mt-4 flex-1">
            <Card className="h-full border shadow-sm min-h-[400px]">
                {isLoadingStatement ? (
                    <div className="p-8 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="w-[180px]">Fecha</TableHead>
                                <TableHead>Folio / Concepto</TableHead>
                                <TableHead className="text-right">Cargo (+)</TableHead>
                                <TableHead className="text-right">Abono (-)</TableHead>
                                <TableHead className="text-right bg-gray-100/50 font-bold">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {statement?.movements.map((mov) => {
                                const isCharge = mov.movement_type === 'charge';
                                return (
                                    <TableRow key={mov.id} className="hover:bg-gray-50/50">
                                        <TableCell className="text-muted-foreground text-xs font-mono">
                                            {format(new Date(mov.date), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {isCharge ? "Compra a Crédito" : "Abono a Cuenta"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {mov.reference} {mov.notes && `• ${mov.notes}`}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-gray-900">
                                            {isCharge ? formatCurrency(mov.amount) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-emerald-600">
                                            {!isCharge ? formatCurrency(mov.amount) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-gray-800 bg-gray-50/30 tabular-nums">
                                            {formatCurrency(mov.balance_after)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {statement?.movements.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        Sin movimientos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>
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
        <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
}