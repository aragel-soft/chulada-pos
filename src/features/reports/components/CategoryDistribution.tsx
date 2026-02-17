import { CategoryDataPoint } from "@/types/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryDistributionProps {
  data: CategoryDataPoint[];
}

const CATEGORY_COLORS = [
  "bg-primary",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

export function CategoryDistribution({ data }: CategoryDistributionProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Ventas por Categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={item.category_name} className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium truncate mr-2">
                  {item.category_name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(item.total_sales)}
                  </span>
                  <span className="font-semibold w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                  }`}
                  style={{ width: `${Math.max(item.percentage, 1)}%` }}
                />
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay datos de categorías para este periodo.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
