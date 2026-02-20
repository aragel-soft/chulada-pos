import { DataTable } from "@/components/ui/data-table/data-table";
import { deadStockColumns } from "@/features/reports/components/columns/dead-stock-columns";
import { useDeadStock } from "@/hooks/use-dead-stock";
import { useReportsContext } from "@/features/reports/context/ReportsContext";

export default function DeadStockPage() {
  const { dateRange } = useReportsContext();
  const { data, isLoading, error } = useDeadStock(dateRange);

  return (
    <div className="flex flex-col gap-4 h-full">
      <DataTable
        columns={deadStockColumns}
        data={data}
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
