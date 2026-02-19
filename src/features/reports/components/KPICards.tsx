import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportKpis } from "@/types/reports";
import { DollarSign, TrendingUp, CreditCard, Activity } from "lucide-react";

interface KPICardsProps {
  data: ReportKpis;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);

const kpiConfig = [
  {
    key: "gross_sales" as const,
    title: "Venta Bruta",
    subtitle: "Ingresos totales del periodo",
    icon: DollarSign,
    iconClass: "text-muted-foreground",
    valueClass: "",
    format: formatCurrency,
  },
  {
    key: "net_profit" as const,
    title: "Utilidad Estimada",
    subtitle: "Margen real (Venta - Costo)",
    icon: TrendingUp,
    iconClass: "text-emerald-500",
    valueClass: "text-emerald-600",
    format: formatCurrency,
  },
  {
    key: "transaction_count" as const,
    title: "Transacciones",
    subtitle: "Ventas completadas",
    icon: CreditCard,
    iconClass: "text-muted-foreground",
    valueClass: "",
    format: (v: number) => v.toLocaleString("es-MX"),
  },
  {
    key: "average_ticket" as const,
    title: "Ticket Promedio",
    subtitle: "Promedio por venta",
    icon: Activity,
    iconClass: "text-muted-foreground",
    valueClass: "",
    format: formatCurrency,
  },
];

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiConfig.map(({ key, title, subtitle, icon: Icon, iconClass, valueClass, format }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${iconClass}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${valueClass}`}>
              {format(data[key])}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
