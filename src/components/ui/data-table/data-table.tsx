// Importaciones
import {ReactNode, useState} from "react"
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
} from "@tanstack/react-table"
import { Search, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DebouncedInput } from "@/components/ui/debounced-input"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTableLayout } from "@/components/layouts/DataTableLayout"
import { DataTablePagination } from "./data-table-pagination"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  actions?: ReactNode | ((table: Table<TData>) => ReactNode)
  searchPlaceholder?: string
  initialSorting?: SortingState
  initialColumnVisibility?: VisibilityState
  initialPageSize?: number
  columnTitles?: Record<string, string>
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>

  rowCount?: number; 
  manualPagination?: boolean;
  manualFiltering?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility)
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("")
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const rowSelection = externalRowSelection ?? internalRowSelection
  const setRowSelection = externalOnRowSelectionChange ?? setInternalRowSelection

  const table = useReactTable({
    data,
    columns,
    rowCount,
    manualPagination,
    manualFiltering,
    state: { sorting, columnFilters, globalFilter, columnVisibility, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
  })

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>

  return (
    <DataTableLayout
      actions={typeof actions === 'function' ? actions(table) : actions}
      filters={
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(value) => setGlobalFilter(String(value))}
              className="pl-10 h-9 w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9">Filtros <ChevronDown className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {columnTitles[column.id] || column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      pagination={<DataTablePagination table={table} />}
    >
      <table className="w-full caption-bottom text-sm">
        <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="px-4 py-2 whitespace-nowrap h-10 bg-background">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
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
  )
}