import { useState, useMemo, useEffect } from "react";
import {
  PaginationState,
  SortingState,
  ColumnFiltersState,
  OnChangeFn,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ShiftDto } from "@/types/cast-cut";
import { getShiftsHistory } from "@/lib/api/cash-register/details";
import { columns as shiftColumns } from "../components/history/columns";

export default function ShiftHistoryPage() {
  const [data, setData] = useState<ShiftDto[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "closing_date", desc: true }
  ]);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const sortField = sorting.length > 0 ? sorting[0].id : "closing_date";
      const sortOrder = sorting.length > 0 && sorting[0].desc ? "desc" : "asc";

      const response = await getShiftsHistory(
        pagination.pageIndex + 1,
        pagination.pageSize,
        sortField,
        sortOrder,
        {
          user_search: globalFilter || undefined,
        }
      );

      setData(response.data);
      setTotalRows(response.total);
    } catch (error) {
      console.error("Error fetching shift history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    globalFilter,
    sorting,
    columnFilters,
  ]);

  const handleGlobalFilterChange: OnChangeFn<string> = (updaterOrValue) => {
    setGlobalFilter((prev) => 
      typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue
    );
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updaterOrValue) => {
    setColumnFilters((prev) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
      return next;
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo(() => shiftColumns, []);

  // Row click logic for Commit 4 (Detail Modal) will go here
  const handleRowClick = (row: any) => {
    console.log("Selected shift:", row.original.id);
  };

  return (

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
            expected_cash: "Efectivo Teórico",
            final_cash: "Cierre Real",
            cash_difference: "Dif. Efectivo",
            card_difference: "Dif. Tarjeta",
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
          onGlobalFilterChange={handleGlobalFilterChange}
          columnFilters={columnFilters}
          onColumnFiltersChange={handleColumnFiltersChange}
          onRowClick={handleRowClick}
        />
  );
}
