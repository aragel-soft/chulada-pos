import { useState, useEffect, useCallback, useMemo } from "react";
import { Printer } from "lucide-react";
import { SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getLowStockColumns } from "@/features/reports/components/columns/low-stock-columns";
import { InventoryValuationCards } from "@/features/reports/components/InventoryValuationCards";
import { useInventoryReport } from "@/hooks/use-inventory-report";
import { Button } from "@/components/ui/button";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { buildCategoryOptions, expandCategoryIdsWithChildren } from "@/lib/utils/categoryUtils";
import { CategoryListDto } from "@/types/categories";
import { ReportToolbar } from "@/features/reports/components/ReportToolbar";
import { usePersistedTableState } from "@/hooks/use-persisted-table-state";

export default function InventoryReportPage() {
  const { 
    pagination, 
    onPaginationChange: setPagination,
    globalFilter,
    onGlobalFilterChange: setPersistedGlobalFilter,
    getExtraFilter,
    setExtraFilter
  } = usePersistedTableState('reports.inventory');
  
  const [sorting, setSorting] = useState<SortingState>([{ id: "category_name", desc: false }]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [categories, setCategories] = useState<CategoryListDto[]>([]);

  const savedCategories = getExtraFilter<string[]>("categoryIds", []);
  const selectedCategories = useMemo(() => new Set(savedCategories), [savedCategories]);

  const handleCategoryChange = (newValues: Set<string>) => {
    setExtraFilter("categoryIds", Array.from(newValues));
  };

  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder = sorting.length > 0 && sorting[0].desc ? "desc" : undefined;

  const categoryIds = useMemo(
    () => selectedCategories.size > 0
      ? expandCategoryIdsWithChildren(Array.from(selectedCategories), categories)
      : undefined,
    [selectedCategories, categories]
  );

  const { valuation, lowStockProducts, isLoading, error } = useInventoryReport(
    pagination.pageIndex + 1,
    pagination.pageSize,
    categoryIds,
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

  const columns = useMemo(() => getLowStockColumns(categories), [categories]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4 pt-4 h-full overflow-auto">
      {/* Section 1: Inventory Valuation */}
      <div className="print:hidden">
        <InventoryValuationCards data={valuation} />
      </div>

      {/* Section 2: Low Stock Products */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold print:hidden">
            Productos Bajos de Inventario
          </h2>
        </div>

        {/* Visible header only in print mode */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-center">
            Reporte de Reabastecimiento
          </h1>
          <p className="text-sm text-center text-gray-600">
            Fecha:{" "}
            {new Date().toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <DataTable
          columns={columns}
          data={lowStockProducts?.data || []}
          isLoading={isLoading}
          initialSorting={[{ id: "category_name", desc: false }]}
          showColumnFilters={false}
          manualPagination={true}
          manualSorting={true}
          pagination={pagination}
          onPaginationChange={setPagination}
          globalFilter={globalFilter}
          onGlobalFilterChange={(val) => setPersistedGlobalFilter(String(val))}
          sorting={sorting}
          onSortingChange={setSorting}
          rowCount={lowStockProducts?.total || 0}
          columnTitles={{
            product_name: "Producto",
            category_name: "Categoría",
            current_stock: "Existencia",
            minimum_stock: "Stock Mínimo",
            suggested_order: "Sugerido a Pedir",
            purchase_price: "P. Compra",
            retail_price: "P. Venta",
          }}
          toolbar={(table) => (
            <ReportToolbar
              table={table}
              categoryOptions={categoryOptions}
              selectedCategories={selectedCategories}
              onCategoryChange={handleCategoryChange}
              searchPlaceholder="Buscar producto bajo de stock..."
            />
          )}
          actions={() => (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Pedido
            </Button>
          )}
        />
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm print:hidden">
          {error}
        </div>
      )}
    </div>
  );
}
