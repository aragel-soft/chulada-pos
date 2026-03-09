import { useState, useMemo, useEffect } from "react";
import {
  SortingState,
  OnChangeFn,
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
import { CreateInventoryMovementDialog } from "../components/inventory-movements/CreateInventoryMovementDialog";
import { usePersistedTableState } from "@/hooks/use-persisted-table-state";

export default function InventoryMovementsPage() {
  const { can } = useAuthStore();
  const [data, setData] = useState<InventoryMovement[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { 
    globalFilter, pagination, columnFilters, extraFilters,
    onGlobalFilterChange: setPersistedGlobalFilter, 
    onPaginationChange: setPersistedPagination,
    onColumnFiltersChange: setPersistedColumnFilters,
    setExtraFilter,
  } = usePersistedTableState('inventory.movements');
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true }
  ]);
  const dateRange = extraFilters.dateRange as DateRange | undefined;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const typeFilter = columnFilters.find((f) => f.id === "type")?.value as string[];
      const sortField = sorting.length > 0 ? sorting[0].id : "created_at";
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

  const handleMovementSuccess = () => {
    setPersistedPagination((prev) => ({ ...prev, pageIndex: 0 }));
    const newSorting = [{ id: "created_at", desc: true }];
    setSorting(newSorting);

    if (
      pagination.pageIndex === 0 && 
      sorting.length > 0 && 
      sorting[0].id === "created_at" && 
      sorting[0].desc === true
    ) {
      fetchMovements();
    }
  };

  const handleGlobalFilterChange: OnChangeFn<string> = (updaterOrValue) => {
    const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter) : updaterOrValue;
    setPersistedGlobalFilter(newValue);
  };

  const handleColumnFiltersChange: OnChangeFn<any> = (updaterOrValue) => {
    setPersistedColumnFilters(updaterOrValue);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setExtraFilter('dateRange', range);
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
        onPaginationChange={setPersistedPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={globalFilter}
        onGlobalFilterChange={handleGlobalFilterChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        toolbar={(table) => (
          <InventoryMovementsTableToolbar
            table={table}
            dateRange={dateRange}
            setDateRange={handleDateRangeChange}
          />
        )}
        actions={() => (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {can("inventory_movements:create") && (
              <Button
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Movimiento</span>
              </Button>
            )}
          </div>
        )}
      />

      <CreateInventoryMovementDialog 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleMovementSuccess}
      />
    </>
  );
}
