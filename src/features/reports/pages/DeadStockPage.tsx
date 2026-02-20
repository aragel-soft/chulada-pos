import { useState, useEffect, useCallback, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { deadStockColumns } from "@/features/reports/components/columns/dead-stock-columns";
import { ReportToolbar } from "@/features/reports/components/ReportToolbar";
import { useDeadStock } from "@/hooks/use-dead-stock";
import { useReportsContext } from "@/features/reports/context/ReportsContext";
import { getAllCategories } from "@/lib/api/inventory/categories";

export default function DeadStockPage() {
  const { dateRange } = useReportsContext();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const categoryIds = useMemo(
    () => (selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined),
    [selectedCategories]
  );

  const { data, isLoading, error } = useDeadStock(dateRange, categoryIds);

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
        columns={deadStockColumns}
        data={data}
        isLoading={isLoading}
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
        toolbar={(table) => (
          <ReportToolbar
            table={table}
            categoryOptions={categoryOptions}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            searchPlaceholder="Buscar producto sin movimiento..."
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
