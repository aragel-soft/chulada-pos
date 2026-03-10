import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  SortingState,
  OnChangeFn,
} from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getShiftsHistory } from "@/lib/api/cash-register/details";
import { columns as shiftColumns } from "../components/history/columns";
import { ShiftHistoryToolbar } from "../components/history/ShiftHistoryToolbar";
import { useQuery } from "@tanstack/react-query";
import { usePersistedTableState } from "@/hooks/use-persisted-table-state";

export default function ShiftHistoryPage() {
  const { 
    globalFilter, pagination, columnFilters, extraFilters,
    onGlobalFilterChange: setPersistedGlobalFilter, 
    onPaginationChange: setPersistedPagination,
    onColumnFiltersChange: setPersistedColumnFilters,
    setExtraFilter,
  } = usePersistedTableState('cash-register.history');
  const [sorting, setSorting] = useState<SortingState>([
    { id: "opening_date", desc: true }
  ]);
  
  const dateRange = extraFilters.dateRange as DateRange | undefined;

  const { data: response, isLoading } = useQuery({
    queryKey: [
      "shifts-history",
      pagination.pageIndex,
      pagination.pageSize,
      globalFilter,
      sorting,
      dateRange,
    ],
    queryFn: () =>
      getShiftsHistory(
        pagination.pageIndex + 1,
        pagination.pageSize,
        sorting.length > 0 ? sorting[0].id : "closing_date",
        sorting.length > 0 && sorting[0].desc ? "desc" : "asc",
        {
          user_search: globalFilter || undefined,
          date_from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
          date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        }
      ),
  });

  const data = response?.data ?? [];
  const totalRows = response?.total ?? 0;

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

  const columns = useMemo(() => shiftColumns, []);

  // Navigate to full details page
  const navigate = useNavigate();

  const handleRowClick = (row: any) => {
    navigate(`/cash-register/history/${row.original.id}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          columnTitles={{
            code: "Folio",
            opening_date: "Apertura",
            closing_date: "Cierre",
            opening_user_name: "Abrió",
            closing_user_name: "Cerró",
            status: "Estado",
            initial_cash: "Fondo Inicial",
            cash_withdrawal: "Retiro de Efectivo",
            total_sales: "Total Ventas",
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
          onRowClick={handleRowClick}
          toolbar={(table) => (
            <ShiftHistoryToolbar
              table={table}
              dateRange={dateRange}
              setDateRange={handleDateRangeChange}
            />
          )}
        />
      </div>
    </div>
  );
}
