import { useState, useEffect, useCallback, useMemo } from "react";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { deadStockColumns } from "@/features/reports/components/columns/dead-stock-columns";
import { ReportToolbar } from "@/features/reports/components/ReportToolbar";
import { useDeadStock } from "@/hooks/use-dead-stock";
import { useReportsContext } from "@/features/reports/context/ReportsContext";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { buildCategoryOptions, expandCategoryIdsWithChildren } from "@/lib/utils/categoryUtils";
import { CategoryListDto } from "@/types/categories";

export default function DeadStockPage() {
  const { dateRange } = useReportsContext();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [categories, setCategories] = useState<CategoryListDto[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "stagnant_value", desc: true }]);

  const categoryIds = useMemo(
    () => selectedCategories.size > 0 
      ? expandCategoryIdsWithChildren(Array.from(selectedCategories), categories) 
      : undefined,
    [selectedCategories, categories]
  );

  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder = sorting.length > 0 && sorting[0].desc ? "desc" : undefined;

  const { data, isLoading, error } = useDeadStock(
    dateRange, 
    categoryIds,
    pagination.pageIndex + 1,
    pagination.pageSize,
    sortField,
    sortOrder,
  );

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await getAllCategories();
      setCategoryOptions(buildCategoryOptions(cats));
      setCategories(cats);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <DataTable
        columns={deadStockColumns}
        data={data?.data || []}
        isLoading={isLoading}
        initialSorting={[{ id: "stagnant_value", desc: true }]}
        showColumnFilters={false}
        manualPagination={true}
        manualSorting={true}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        rowCount={data?.total || 0}
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
