"use client"

import * as React from "react"
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
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash,
  Pencil,
} from "lucide-react"

// import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// import { Checkbox } from "@/components/ui/checkbox"
// import {
//   DropdownMenu,
//   DropdownMenuCheckboxItem,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// import {
//   Avatar,
//   AvatarFallback,
//   AvatarImage,
// } from "@/components/ui/avatar"
// import {
//   Pagination,
//   PaginationContent,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// --- Definición de Tipo y Datos de Muestra ---
// (En una app real, esto vendría de tu comando Rust get_all_users)

type UserRole = "admin" | "editor" | "viewer"
type UserStatus = "activo" | "inactivo"

export type User = {
  id: string
  avatarUrl?: string
  nombreCompleto: string
  username: string
  rol: UserRole
  estado: UserStatus
}

const mockData: User[] = [
  { id: "u-001", avatarUrl: "https://github.com/shadcn.png", nombreCompleto: "Ana Torres", username: "atorres", rol: "admin", estado: "activo" },
  { id: "u-002", avatarUrl: "", nombreCompleto: "Carlos Gómez", username: "cgomez", rol: "editor", estado: "activo" },
  { id: "u-003", avatarUrl: "https://github.com/react.png", nombreCompleto: "David Ruiz", username: "druiz", rol: "viewer", estado: "inactivo" },
  { id: "u-004", avatarUrl: "", nombreCompleto: "Elena Soto", username: "esoto", rol: "viewer", estado: "activo" },
  // ... (añadir más usuarios para probar la paginación, hasta 16+)
  { id: "u-005", nombreCompleto: "Felipe Neri", username: "fneri", rol: "editor", estado: "activo" },
  { id: "u-006", nombreCompleto: "Gabriela Paz", username: "gpaz", rol: "admin", estado: "activo" },
  { id: "u-007", nombreCompleto: "Hector Landa", username: "hlanda", rol: "viewer", estado: "inactivo" },
  { id: "u-008", nombreCompleto: "Inés Morales", username: "imorales", rol: "editor", estado: "activo" },
  { id: "u-009", nombreCompleto: "Juan Kuri", username: "jkuri", rol: "viewer", estado: "activo" },
  { id: "u-010", nombreCompleto: "Laura Mesta", username: "lmesta", rol: "viewer", estado: "activo" },
  { id: "u-011", nombreCompleto: "Marcos Días", username: "mdias", rol: "admin", estado: "inactivo" },
  { id: "u-012", nombreCompleto: "Nora Silva", username: "nsilva", rol: "editor", estado: "activo" },
  { id: "u-013", nombreCompleto: "Oscar Pardo", username: "opardo", rol: "viewer", estado: "activo" },
  { id: "u-014", nombreCompleto: "Patricia Vera", username: "pvera", rol: "admin", estado: "activo" },
  { id: "u-015", nombreCompleto: "Raúl Solís", username: "rsolis", rol: "editor", estado: "inactivo" },
  { id: "u-016", nombreCompleto: "Sofía Luna", username: "sluna", rol: "viewer", estado: "activo" },
  { id: "u-017", nombreCompleto: "Tomás Peña", username: "tpena", rol: "viewer", estado: "activo" },
]

// --- Definición de Columnas (TanStack Table) ---

export const columns: ColumnDef<User>[] = [
  // Columna de Selección (Checkbox)
  {
    id: "select", // TODO: Descomentar cuando el componente Checkbox esté disponible
    // header: ({ table }) => (
    //   <Checkbox
    //     checked={
    //       table.getIsAllPageRowsSelected() ||
    //       (table.getIsSomePageRowsSelected() && "indeterminate")
    //     }
    //     onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //     aria-label="Seleccionar todas"
    //   />
    // ),
    // cell: ({ row }) => (
    //   <Checkbox
    //     checked={row.getIsSelected()}
    //     onCheckedChange={(value) => row.toggleSelected(!!value)}
    //     aria-label="Seleccionar fila"
    //   />
    // ),
    enableSorting: false,
    enableHiding: false,
  },

  // Columna Nombre Completo (con Avatar)
  {
    accessorKey: "nombreCompleto",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nombre
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {/* <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.avatarUrl} alt={row.original.nombreCompleto} />
          <AvatarFallback>
            {row.original.nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar> */}
        <span className="font-medium">{row.original.nombreCompleto}</span>
      </div>
    ),
  },

  // Columna Usuario (username)
  {
    accessorKey: "username",
    header: "Usuario",
    cell: ({ row }) => <div className="lowercase">@{row.getValue("username")}</div>,
  },

  // Columna Rol
  {
    accessorKey: "rol",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Rol
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("rol")}</div>
    ),
  },
  
  // Columna Estado (con Badges)
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.getValue("estado") as UserStatus
      const variant = estado === "activo" ? "default" : "destructive"
      
      // return <Badge variant={variant} className="capitalize">{estado}</Badge> // TODO: Descomentar cuando el componente Badge esté disponible
      return <span className={`capitalize p-2 rounded-md ${estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{estado}</span>
    },
  },

  // Columna de Acciones (Menú ...)
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      // const user = row.original
      return (
        // <DropdownMenu> // TODO: Descomentar cuando el componente DropdownMenu esté disponible
        //   <DropdownMenuTrigger asChild>
        //     <Button variant="ghost" className="h-8 w-8 p-0">
        //       <span className="sr-only">Abrir menú</span>
        //       <MoreHorizontal className="h-4 w-4" />
        //     </Button>
        //   </DropdownMenuTrigger>
        //   <DropdownMenuContent align="end">
        //     <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        //     <DropdownMenuItem>
        //       <Pencil className="mr-2 h-4 w-4" />
        //       Editar usuario
        //     </DropdownMenuItem>
        //     <DropdownMenuSeparator />
        //     <DropdownMenuItem className="text-red-600">
        //       <Trash className="mr-2 h-4 w-4" />
        //       Eliminar usuario
        //     </DropdownMenuItem>
        //   </DropdownMenuContent>
        // </DropdownMenu>
        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
      )
    },
  },
]

// --- Componente Principal de la Página ---

export function UsersListPage() {
  const [data, setData] = React.useState(() => [...mockData]) // Datos
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
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

  return (
    <div className="w-full p-4 md:p-8">
      {/* --- Barra de Herramientas (Toolbar) --- */}
      <div className="flex items-center justify-between py-4">
        
        {/* Barra de Búsqueda (Filtra por nombre o username) */}
        <div className="relative w-full max-w-sm">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
            placeholder="Buscar por nombre o usuario..."
            value={(table.getColumn("nombreCompleto")?.getFilterValue() as string) ?? ""}
            onChange={(event) => {
              // Filtra en ambas columnas simultáneamente
              table.getColumn("nombreCompleto")?.setFilterValue(event.target.value)
              table.getColumn("username")?.setFilterValue(event.target.value)
            }}
            className="pl-10"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2">
          {/* Botón de Filtros (Columnas) */}
          {/* <DropdownMenu> // TODO: Descomentar cuando el componente DropdownMenu esté disponible
            <DropdownMenuTrigger asChild> */}
              <Button variant="outline" className="ml-auto" disabled>
                Filtros <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            {/* </DropdownMenuTrigger>
            <DropdownMenuContent align="end"> */}
              {/* {table
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
                      {column.id === 'nombreCompleto' ? 'Nombre' : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })} */}
            {/* </DropdownMenuContent>
          </DropdownMenu> */}

          {/* Botón Agregar Usuario */}
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        </div>
      </div>
      
      {/* --- Tabla de Datos --- */}
      <div className="rounded-md border">
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

      {/* --- Paginación (Estilo de la imagen) --- */}
      <div className="flex items-center justify-between space-x-2 py-4">
        
        {/* Info de filas seleccionadas */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
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