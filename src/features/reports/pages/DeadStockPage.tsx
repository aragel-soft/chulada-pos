import { DataTable } from "@/components/ui/data-table/data-table";
import { deadStockColumns } from "@/features/reports/components/columns/dead-stock-columns";
import { useCatalogReport } from "@/hooks/use-catalog-report";
import { useReportsContext } from "@/features/reports/context/ReportsContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);

export default function DeadStockPage() {
  const { dateRange } = useReportsContext();
  const { data, isLoading, error } = useCatalogReport(dateRange);

  const totalStagnantValue = data.dead_stock.reduce(
    (sum, item) => sum + item.stagnant_value,
    0
  );

  return (
    <div className="flex flex-col gap-4 h-full pt-2">
      {data.dead_stock.length > 0 && (
        <div className="flex items-center gap-2 text-sm px-1">
          <span className="text-muted-foreground">Dinero estancado:</span>
          <span className="font-bold text-destructive text-base">
            {formatCurrency(totalStagnantValue)}
          </span>
          <span className="text-muted-foreground">
            ({data.dead_stock.length} productos)
          </span>
        </div>
      )}

      <DataTable
        columns={deadStockColumns}
        data={data.dead_stock}
        isLoading={isLoading}
        searchPlaceholder="Buscar producto sin movimiento..."
        initialSorting={[{ id: "stagnant_value", desc: true }]}
        showColumnFilters={false}
        columnTitles={{
          product_name: "Producto",
          category_name: "Categoría",
          current_stock: "Stock Actual",
          purchase_price: "Costo Unitario",
          stagnant_value: "Valor Estancado",
          last_sale_date: "Última Venta",
        }}
      />

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
