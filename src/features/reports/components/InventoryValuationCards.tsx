import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryValuation } from "@/types/reports";
import { Package, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InventoryValuationCardsProps {
  data: InventoryValuation;
}

const valuationConfig = [
  {
    key: "total_cost" as const,
    title: "Costo de Inventario (Activos)",
    subtitle: "Capital inmovilizado en stock",
    icon: Package,
    iconClass: "text-muted-foreground",
    valueClass: "",
    format: formatCurrency,
  },
  {
    key: "total_retail" as const,
    title: "Venta Potencial",
    subtitle: "Si vendes todo hoy",
    icon: DollarSign,
    iconClass: "text-blue-500",
    valueClass: "text-blue-600",
    format: formatCurrency,
  },
  {
    key: "projected_profit" as const,
    title: "Ganancia Proyectada",
    subtitle: "Venta Potencial − Costo",
    icon: TrendingUp,
    iconClass: "text-emerald-500",
    valueClass: "text-emerald-600",
    format: formatCurrency,
  },
];

export function InventoryValuationCards({ data }: InventoryValuationCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {valuationConfig.map(({ key, title, subtitle, icon: Icon, iconClass, valueClass, format }) => (
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
