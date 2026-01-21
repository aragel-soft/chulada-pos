import { useState, useMemo } from "react";
import {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Card } from "@/components/ui/card";
import { useSalesHistory } from "@/hooks/use-sales-history";
import { FiltersPanel } from "@/features/dashboard/components/FiltersPanel";
import { historyColumns } from "@/features/dashboard/components/columns";
import { SaleDetailSheet } from "@/features/dashboard/components/SaleDetailSheet";
import { SaleMaster } from "@/types/sales-history";

export default function HistoryPage() {
  const { data, isLoading, filters, actions } = useSalesHistory();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
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

  const handlePaginationChange = (updaterOrValue: any) => {
    const newPagination =
      typeof updaterOrValue === "function"
        ? updaterOrValue(paginationState)
        : updaterOrValue;

    actions.setPage(newPagination.pageIndex + 1);
    actions.setPageSize(newPagination.pageSize);
  };

  return (
    <div className="flex h-full w-full bg-muted/10 overflow-hidden">
      {/* LEFT SIDE PANEL */}
      <FiltersPanel
        filters={filters}
        actions={actions}
        isCollapsed={filtersCollapsed}
        onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
      />

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-6 border-b bg-white flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Historial de Ventas
            </h1>
            <p className="text-muted-foreground text-sm">
              Auditoría y consulta de tickets cerrados.
            </p>
          </div>
          <div className="text-sm text-right text-muted-foreground">
            <span className="font-mono font-bold text-black">
              {data?.total || 0}
            </span>{" "}
            registros
          </div>
        </header>

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
                sorting={sorting}
                onSortingChange={setSorting}
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
                onRowClick={(row) => setSelectedSaleId(row.original.id)}
              />
            </div>
          </Card>
        </main>
      </div>

      {/* Sheet de Detalle (Overlay Derecho) */}
      <SaleDetailSheet
        saleId={selectedSaleId}
        isOpen={!!selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
      />
    </div>
  );
}
