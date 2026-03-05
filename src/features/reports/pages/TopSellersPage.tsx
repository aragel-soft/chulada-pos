import { useState, useEffect, useCallback, useMemo } from "react";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getTopSellersColumns } from "@/features/reports/components/columns/top-sellers-columns";
import { ReportToolbar } from "@/features/reports/components/ReportToolbar";
import { useTopSellers } from "@/hooks/use-top-sellers";
import { useReportsContext } from "@/features/reports/context/ReportsContext";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { buildCategoryOptions, expandCategoryIdsWithChildren } from "@/lib/utils/categoryUtils";
import { CategoryListDto } from "@/types/categories";

export default function TopSellersPage() {
  const { dateRange } = useReportsContext();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [categories, setCategories] = useState<CategoryListDto[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "total_revenue", desc: true }]);

  const categoryIds = useMemo(
    () => selectedCategories.size > 0 
      ? expandCategoryIdsWithChildren(Array.from(selectedCategories), categories) 
      : undefined,
    [selectedCategories, categories]
  );

  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder = sorting.length > 0 && sorting[0].desc ? "desc" : undefined;

  const { data, isLoading, error } = useTopSellers(
    dateRange && dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined, 
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

  const columns = useMemo(() => getTopSellersColumns(categories), [categories]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <DataTable
        columns={columns}
        data={data?.data || []} 
        isLoading={isLoading}
        initialSorting={[{ id: "total_revenue", desc: true }]}
        showColumnFilters={false}
        manualPagination={true}
        manualSorting={true}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        rowCount={data?.total || 0}
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
