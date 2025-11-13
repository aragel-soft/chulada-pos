import { invoke } from "@tauri-apps/api/core"
import * as React from "react"
import { useUsersStore, UserView } from "@/stores/usersStore";
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
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash,
  Pencil,
  User,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// --- Definición de Tipo y Datos de Muestra ---
// (En una app real, esto vendría de tu comando Rust get_all_users)


type UserStatus = "activo" | "inactivo";


// --- Definición de Columnas (TanStack Table) ---
export const columns: ColumnDef<UserView>[] = [
  
  // Columna de Selección (Checkbox)
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todas"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Columna Nombre Completo (con Avatar)
  {
    accessorKey: "full_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.avatar_url} alt={row.original.full_name} />
          <AvatarFallback>
            {row.original.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.original.full_name}</span>
      </div>
    ),
  },

  // Columna Usuario (username)
  {
    accessorKey: "username",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Usuario
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => <div className="lowercase">@{row.getValue("username")}</div>,
  },

  // Columna Rol
  {
    accessorKey: "role_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Rol
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("role_name")}</div>
    ),
  },

  // Columna Fecha de Creación (EXISTE PERO ESTARÁ OCULTA)
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha de Creación
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => (
      <div>{(row.getValue("created_at") as string)}</div>
    ),
  },

  // Columna Estado (con Badges)
  {
    accessorKey: "is_active",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Estado
        {column.getIsSorted() === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => {
    const estado = row.getValue("is_active") as boolean

    return (
      <Badge
        className={`capitalize min-w-[80px] justify-center ${
          estado
            ? "bg-green-600 text-white hover:bg-green-600/80" // <-- 2. Color Verde
            : "bg-destructive text-destructive-foreground hover:bg-destructive/80" // <-- 3. Color Rojo
        }`}
      >
        {estado ? "activo" : "inactivo"}
      </Badge>
      )
    },
  },
]

// --- Componente Principal de la Página ---
export function UsersListPage() {
  const { users, loading, error, fetchUsers } = useUsersStore();
  const data = React.useMemo(() => users, [users]);
  // CAMBIO: El estado de ordenamiento sigue apuntando a fechaCreacion
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ])
  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  
  // CAMBIO: Se oculta la columna 'fechaCreacion' por defecto
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    fechaCreacion: false,
  })
  
  const [rowSelection, setRowSelection] = React.useState({})

  // Estado de paginación
  const [pagination, setPagination] = React.useState({
    pageIndex: 0, // Página 0 por defecto
    pageSize: 16, // 16 usuarios por página (como en C.A.)
  })

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  const selectedRowsCount = Object.keys(rowSelection).length;
 // 7. MANEJO DE CARGA Y ERROR
  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        Cargando usuarios...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 text-center text-red-500">
        <strong>Error al cargar:</strong> {error}
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-8">
      {/* --- Barra de Herramientas (Toolbar) --- */}
      {/* CAMBIO RESPONSIVO: Usamos flex-col y gap-4 por defecto, y md:flex-row para pantallas grandes */}
      <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
        
        {/* Barra de Búsqueda (Filtra por nombre o username) */}
        {/* CAMBIO RESPONSIVO: w-full en móvil, md:max-w-sm en escritorio */}
        <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o usuario..."
              // Obtén el valor del filtro global
              value={(table.getState().globalFilter as string) ?? ""}
              // Establece el valor del filtro global
              onChange={(event) => {
                table.setGlobalFilter(event.target.value);
              }}
              className="pl-10"
            />
        </div>

        {/* Botones de Acción */}
        {/* CAMBIO RESPONSIVO: flex-col-reverse en móvil (para poner "Agregar" arriba) y sm:flex-row */}
        {/* w-full en móvil para que los botones se estiren, md:w-auto en escritorio */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Botones de acción contextuales */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={selectedRowsCount !== 1} className="flex-1 sm:flex-none">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" disabled={selectedRowsCount === 0} className="flex-1 sm:flex-none">
              <Trash className="mr-2 h-4 w-4" />
              Eliminar ({selectedRowsCount})
            </Button>
          </div>

          {/* CAMBIO RESPONSIVO: Ocultamos el separador en móvil (flex-col) */}
          <DropdownMenuSeparator className="h-6 mx-2 hidden sm:block" />

          {/* Botón de Filtros (Columnas) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Filtros <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === 'full_name' 
                        ? 'Nombre' 
                        : column.id === 'created_at'
                        ? 'Fecha de Creación'
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón Agregar Usuario */}
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        </div>
      </div>

      {/* --- Tabla de Datos --- */}
      {/* CAMBIO RESPONSIVO: Este es el cambio MÁS IMPORTANTE. */}
      {/* 1. Un 'div' exterior con 'overflow-x-auto' para permitir el scroll horizontal SÓLO en este bloque. */}
      <div className="w-full overflow-x-auto">
        {/* 2. Un 'min-w-[768px]' (o el que necesites) al contenedor de la tabla para forzarla a mantener su ancho. */}
        <div className="rounded-md border min-w-[768px]"> 
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                // Estado si no hay resultados (para búsqueda)
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No se encontraron usuarios con ese criterio.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* --- Paginación --- */}
      {/* CAMBIO RESPONSIVO: flex-col y gap-6 por defecto, md:flex-row en escritorio */}
      <div className="flex flex-col md:flex-row items-center justify-between space-x-2 py-4 gap-6 md:gap-0">

        {/* Info de filas seleccionadas */}
        {/* CAMBIO RESPONSIVO: Texto centrado en móvil y a la izquierda en escritorio */}
        <div className="flex-1 text-sm text-muted-foreground text-center md:text-left">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>

        {/* CAMBIO RESPONSIVO: flex-col en móvil (apilado), sm:flex-row en tablet+ */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0 sm:space-x-6 lg:space-x-8">
          {/* Selector de Items por Página */}
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas por página</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[16, 24, 48, 96].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contador de Páginas (Ej: 1-16 de 168) */}
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </div>

          {/* Botones de Paginación */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Primera página</span>
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Página siguiente</span>
              {">"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Última página</span>
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}