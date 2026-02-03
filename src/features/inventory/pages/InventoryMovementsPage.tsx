import { useState, useMemo, useEffect } from "react";
import {
  PaginationState,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { useAuthStore } from "@/stores/authStore";
import { InventoryMovement } from "@/types/inventory-movements";
import { getInventoryMovements } from "@/lib/api/inventory/inventory-movements";
import { getColumns } from "../components/inventory-movements/columns";
import { InventoryMovementsTableToolbar } from "../components/inventory-movements/InventoryMovementsTableToolbar";

export default function InventoryMovementsPage() {
  const { can } = useAuthStore();
  const [data, setData] = useState<InventoryMovement[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const typeFilter = columnFilters.find((f) => f.id === "type")?.value as string[];
      const sortField = sorting.length > 0 ? sorting[0].id : undefined;
      const sortOrder = sorting.length > 0 && sorting[0].desc ? "desc" : "asc";

      const response = await getInventoryMovements(
        {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          sortBy: sortField,
          sortOrder: sortOrder,
        },
        {
          search: globalFilter || undefined,
          movement_type: typeFilter && typeFilter.length === 1 ? (typeFilter[0] as "IN" | "OUT") : undefined,
          start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
          end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        },
      );

      setData(response.data);
      setTotalRows(response.total);
    } catch (error) {
      console.error("Error cargando movimientos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    globalFilter,
    sorting,
    columnFilters,
    dateRange, 
  ]);

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleColumnFiltersChange = (updaterOrValue: any) => {
    setColumnFilters((prev) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
      return next;
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo(() => getColumns(), []);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        columnTitles={{
          created_at: "Fecha",
          product: "Producto",
          type: "Tipo",
          reason: "Razón",
          quantity: "Cantidad",
          snapshot: "Existencias",
          user: "Usuario",
        }}
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        rowCount={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={globalFilter}
        onGlobalFilterChange={(val) => handleGlobalFilterChange(String(val))}
        columnFilters={columnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        toolbar={(table) => (
          <InventoryMovementsTableToolbar
            table={table}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        )}
        actions={() => (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {can("inventory_movements:create") && (
              <Button
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Movimiento</span>
              </Button>
            )}
          </div>
        )}
      />
    </>
  );
}
