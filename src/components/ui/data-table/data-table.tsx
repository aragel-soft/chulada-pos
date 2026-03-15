import { ReactNode, useState, useEffect } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Table,
  OnChangeFn,
  RowSelectionState,
  PaginationState,
  Row,
} from "@tanstack/react-table";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableLayout } from "@/components/layouts/DataTableLayout";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  actions?: ReactNode | ((table: Table<TData>) => ReactNode);
  searchPlaceholder?: string;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  initialPageSize?: number;
  columnTitles?: Record<string, string>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  rowCount?: number;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  getRowId?: (originalRow: TData, index: number, parent?: any) => string;
  onRowClick?: (row: Row<TData>) => void;
  showColumnFilters?: boolean;
  toolbar?: ReactNode | ((table: Table<TData>) => ReactNode);
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  isSelectingAllPages?: boolean;
  onSelectAllPages?: (isSelectingAll: boolean) => void;
  enableSelectAllPages?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  actions,
  searchPlaceholder = "Buscar...",
  initialSorting = [],
  initialColumnVisibility = {},
  initialPageSize = 16,
  columnTitles = {},
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,

  rowCount,
  manualPagination = false,
  manualFiltering = false,
  pagination: externalPagination,
  onPaginationChange: externalOnPaginationChange,
  globalFilter: externalGlobalFilter,
  onGlobalFilterChange: externalOnGlobalFilterChange,
  manualSorting = false,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  getRowId,
  onRowClick,
  showColumnFilters = true,
  toolbar,
  columnFilters: externalColumnFilters,
  onColumnFiltersChange: externalOnColumnFiltersChange,
  isSelectingAllPages = false,
  onSelectAllPages,
  enableSelectAllPages = false,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] =
    useState<SortingState>(initialSorting);
  const [internalColumnFilters, setInternalColumnFilters] =
    useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  );
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    {
      pageIndex: 0,
      pageSize: initialPageSize,
    },
  );
  const [internalRowSelection, setInternalRowSelection] =
    useState<RowSelectionState>({});

  const [showSelectAllBanner, setShowSelectAllBanner] = useState(false);

  const sorting = externalSorting ?? internalSorting;
  const globalFilter = externalGlobalFilter ?? internalGlobalFilter;
  const pagination = externalPagination ?? internalPagination;
  const rowSelection = externalRowSelection ?? internalRowSelection;

  const onSortingChange = externalOnSortingChange ?? setInternalSorting;
  const onGlobalFilterChange =
    externalOnGlobalFilterChange ?? setInternalGlobalFilter;

  const basePaginationChange =
    externalOnPaginationChange ?? setInternalPagination;
  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (!isSelectingAllPages) {
      setInternalRowSelection({});
      externalOnRowSelectionChange?.({});
      setShowSelectAllBanner(false);
      onSelectAllPages?.(false);
    }
    basePaginationChange(updater);
  };

  const onRowSelectionChange =
    externalOnRowSelectionChange ?? setInternalRowSelection;
  const columnFilters = externalColumnFilters ?? internalColumnFilters
  const onColumnFiltersChange = externalOnColumnFiltersChange ?? setInternalColumnFilters

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updaterOrValue) => {
    const currentSelection = rowSelection;
    const newSelection = typeof updaterOrValue === 'function'
      ? updaterOrValue(currentSelection)
      : updaterOrValue;

    const visibleRows = table.getRowModel().rows;
    const allVisibleSelected = visibleRows.length > 0 &&
      visibleRows.every(row => newSelection[row.id]);

    if (enableSelectAllPages && allVisibleSelected && rowCount && rowCount > pagination.pageSize) {
      setShowSelectAllBanner(true);
    } else {
      setShowSelectAllBanner(false);
      onSelectAllPages?.(false);
    }

    onRowSelectionChange(newSelection);
  };

  const table = useReactTable({
    data,
    columns,
    rowCount,
    manualPagination,
    manualFiltering,
    manualSorting,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination
      ? undefined
      : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getRowId,
  });

  useEffect(() => {
    if (Object.keys(rowSelection).length === 0) {
      setShowSelectAllBanner(false);
    }
  }, [rowSelection]);

  useEffect(() => {
    if (isSelectingAllPages) {
      const rows = table.getRowModel().rows;
      const someUnselected = rows.some(row => !row.getIsSelected());
      if (someUnselected) {
        table.toggleAllPageRowsSelected(true);
      }
    }
  }, [table.getRowModel().rows, isSelectingAllPages, table]);

  const renderToolbar = () => {
    if (toolbar) {
      return typeof toolbar === "function" ? toolbar(table) : toolbar;
    }

    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full print:hidden">
        <div className="flex-1 min-w-[300px]">
          <DebouncedInput
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(value) => onGlobalFilterChange(String(value))}
            className="h-9 w-full"
          />
        </div>
      </div>
    );
  };

  const combinedActions = (
    <div className="flex items-center gap-2">
      {showColumnFilters && (
        <DataTableViewOptions table={table} columnTitles={columnTitles} />
      )}
      {typeof actions === "function" ? actions(table) : actions}
    </div>
  );

  return (
    <DataTableLayout
      actions={combinedActions}
      filters={renderToolbar()}
      filtersClassName={toolbar ? "flex-1 min-w-0 flex items-center" : undefined}
      pagination={<DataTablePagination table={table} />}
    >
      {/* Banner para seleccionar todos */}
      {(showSelectAllBanner || isSelectingAllPages) && (
        <div className="animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row items-center justify-between bg-primary/5 border border-primary/20 backdrop-blur-md rounded-lg p-3 mb-4 mt-2 text-sm text-foreground shadow-sm gap-4 transition-all">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span>
              {isSelectingAllPages ? (
                <>Has seleccionado todos los <strong>{rowCount}</strong> elementos.</>
              ) : (
                <>
                  Has seleccionado los <strong>{table.getRowModel().rows.length}</strong> elementos de esta página. ¿Quieres seleccionar los <strong>{rowCount}</strong> elementos en todas las páginas?
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {!isSelectingAllPages ? (
              <>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all whitespace-nowrap"
                  onClick={() => {
                    onSelectAllPages?.(true);
                    // Marcar visualmente como seleccionados (opcional)
                    table.toggleAllPageRowsSelected(true);
                  }}
                >
                  Seleccionar todos
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/20 hover:bg-primary/10 transition-colors whitespace-nowrap bg-background"
                onClick={() => {
                  setShowSelectAllBanner(false);
                  onSelectAllPages?.(false);
                  table.toggleAllPageRowsSelected(false);
                }}
              >
                Limpiar selección
              </Button>
            )}
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1 rounded-full shrink-0"
              onClick={() => {
                setShowSelectAllBanner(false);
                onSelectAllPages?.(false);
                table.toggleAllPageRowsSelected(false);
              }}
              title="Cancelar selección"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <table className="w-full caption-bottom text-sm">
        <TableHeader className="sticky top-0 z-20 bg-background shadow-sm print:static print:shadow-none print:bg-transparent">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent border-b print:border-0"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="px-4 py-2 whitespace-nowrap h-10 bg-background print:bg-transparent"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const hasSelection = columns.some(
                (col) => "id" in col && col.id === "select",
              );

              const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
                const target = e.target as HTMLElement;
                const interactive = target.closest(
                  "button, a, input, select, textarea, [role='checkbox'], [role='button'], [role='menuitem']",
                );
                if (interactive) return;

                if (hasSelection) row.toggleSelected();
                onRowClick?.(row);
              };

              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={handleRowClick}
                  className={
                    hasSelection || onRowClick
                      ? "cursor-pointer hover:bg-muted/50 transition-colors"
                      : ""
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No se encontraron resultados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </table>
    </DataTableLayout>
  );
}
