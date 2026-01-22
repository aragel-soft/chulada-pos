import { useState, useMemo } from "react";
import {
  ColumnDef,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Card } from "@/components/ui/card";
import { useSalesHistory } from "@/hooks/use-sales-history";
import { FiltersPanel } from "@/features/dashboard/components/FiltersPanel";
import { historyColumns } from "@/features/dashboard/components/columns";
// 🔥 Importamos la versión Panel si la creaste separada, o usa la misma si lograste adaptarla
// Si hiciste el refactor del paso 1, importa SaleDetailPanel.
import { SaleDetailPanel } from "@/features/dashboard/components/SaleDetailSheet"; 
import { SaleMaster } from "@/types/sales-history";

export default function HistoryPage() {
  const { data, isLoading, filters, actions } = useSalesHistory();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  const columns = useMemo<ColumnDef<SaleMaster>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      ...historyColumns,
    ],
    [historyColumns],
  );

  const paginationState: PaginationState = {
    pageIndex: filters.page - 1,
    pageSize: filters.page_size,
  };

  const sortingState: SortingState = useMemo(() => [
    {
      id: filters.sort_by || "folio",
      desc: filters.sort_order === "desc",
    },
  ], [filters.sort_by, filters.sort_order]);

  const handlePaginationChange = (updaterOrValue: any) => {
    const newPagination =
      typeof updaterOrValue === "function"
        ? updaterOrValue(paginationState)
        : updaterOrValue;

    actions.setPage(newPagination.pageIndex + 1);
    actions.setPageSize(newPagination.pageSize);
  };

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newSorting = typeof updater === "function"
      ? updater(sortingState)
      : updater;

    const sort = newSorting[0];

    if (sort) {
      actions.setSorting(sort.id, sort.desc ? "desc" : "asc");
    } else {
      actions.setSorting("folio", "desc");
    }
  };

  return (
    <div className="flex h-full w-full bg-muted/10 overflow-hidden">
      {/* LEFT SIDE PANEL (FILTERS) */}
      <FiltersPanel
        filters={filters}
        actions={actions}
        isCollapsed={filtersCollapsed}
        onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex min-w-0 transition-all duration-300">
        
        <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          selectedSaleId ? "w-[65%] border-r" : "w-full"
        }`}>
          <main className="flex-1 p-6 overflow-hidden flex flex-col">
            <Card className="flex-1 overflow-hidden border-none shadow-sm flex flex-col bg-white">
              <div className="flex-1 overflow-auto p-1">
                <DataTable
                  columns={columns}
                  data={data?.data || []}
                  isLoading={isLoading}
                  rowCount={data?.total || 0}
                  manualPagination={true}
                  manualFiltering={true}
                  manualSorting={true}
                  pagination={paginationState}
                  onPaginationChange={handlePaginationChange}
                  sorting={sortingState}
                  onSortingChange={handleSortingChange}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  globalFilter={filters.folio || ""}
                  onGlobalFilterChange={(val) =>
                    actions.setSearch("folio", String(val))
                  }
                  searchPlaceholder="Buscar por Folio..."
                  columnTitles={{
                    folio: "Folio",
                    sale_date: "Fecha",
                    status: "Estado",
                    payment_method: "Método Pago",
                    total: "Total",
                  }}
                  onRowClick={(row) => setSelectedSaleId(
                      selectedSaleId === row.original.id ? null : row.original.id
                  )}
                  showColumnFilters={false}
                />
              </div>
            </Card>
          </main>
        </div>

        {selectedSaleId && (
          <div className="w-[35%] bg-white h-full overflow-hidden shadow-xl animate-in slide-in-from-right-5 duration-300 flex flex-col z-20">
             <SaleDetailPanel 
                saleId={selectedSaleId} 
                onClose={() => setSelectedSaleId(null)} 
             />
          </div>
        )}

      </div>
    </div>
  );
}