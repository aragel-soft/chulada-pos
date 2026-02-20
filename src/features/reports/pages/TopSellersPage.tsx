import { DataTable } from "@/components/ui/data-table/data-table";
import { topSellersColumns } from "@/features/reports/components/columns/top-sellers-columns";
import { useTopSellers } from "@/hooks/use-top-sellers";
import { useReportsContext } from "@/features/reports/context/ReportsContext";

export default function TopSellersPage() {
  const { dateRange } = useReportsContext();
  const { data, isLoading, error } = useTopSellers(dateRange);

  return (
    <div className="flex flex-col gap-4 h-full">
      <DataTable
        columns={topSellersColumns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Buscar producto..."
        initialSorting={[{ id: "total_revenue", desc: true }]}
        showColumnFilters={false}
        columnTitles={{
          ranking: "#",
          product_name: "Producto",
          category_name: "Categoría",
          quantity_sold: "Cantidad Vendida",
          total_revenue: "Ingreso Total",
          percentage_of_total: "% del Total",
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
