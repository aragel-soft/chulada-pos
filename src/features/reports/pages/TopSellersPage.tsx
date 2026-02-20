import { useState, useEffect, useCallback, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { topSellersColumns } from "@/features/reports/components/columns/top-sellers-columns";
import { ReportToolbar } from "@/features/reports/components/ReportToolbar";
import { useTopSellers } from "@/hooks/use-top-sellers";
import { useReportsContext } from "@/features/reports/context/ReportsContext";
import { getAllCategories } from "@/lib/api/inventory/categories";

export default function TopSellersPage() {
  const { dateRange } = useReportsContext();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const categoryIds = useMemo(
    () => (selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined),
    [selectedCategories]
  );

  const { data, isLoading, error } = useTopSellers(dateRange, categoryIds);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await getAllCategories();
      setCategoryOptions(cats.map((c: any) => ({ label: c.name, value: c.id })));
    } catch (error) {
      console.error("Error cargando categorías", error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <DataTable
        columns={topSellersColumns}
        data={data}
        isLoading={isLoading}
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
        toolbar={(table) => (
          <ReportToolbar
            table={table}
            categoryOptions={categoryOptions}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            searchPlaceholder="Buscar producto..."
          />
        )}
      />

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
