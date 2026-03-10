// Importaciones
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsersList } from "@/lib/api/users";
import type { User } from "@/types/users";
import { PaginationParams } from "@/types/pagination";
import { useAuthStore } from "@/stores/authStore";
import { ColumnDef, RowSelectionState, SortingState, OnChangeFn } from "@tanstack/react-table"
import {
  Pencil,
  PlusCircle,
  Trash,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AppAvatar } from "@/components/ui/app-avatar"

import { CreateUserDialog } from "../components/CreateUserDialog";
import { DeleteUsersDialog } from "../components/DeleteUsersDialog";
import { EditUserDialog } from "../components/EditUserDialog";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { usePersistedTableState } from "@/hooks/use-persisted-table-state";

// Componente principal
export function UsersListPage() {
  // Estado de paginación, ordenamiento y búsqueda (server-side)
  const [sorting, setSorting] = useState<SortingState>([]);
  const { 
    globalFilter, pagination, columnFilters,
    onGlobalFilterChange: setPersistedGlobalFilter, 
    onPaginationChange: setPersistedPagination,
    onColumnFiltersChange: setPersistedColumnFilters,
  } = usePersistedTableState('settings.users');
  
  const handleColumnFiltersChange: OnChangeFn<any> = (updaterOrValue) => {
    setPersistedColumnFilters(updaterOrValue);
  };

  const handleGlobalFilterChange: OnChangeFn<string> = (updaterOrValue) => {
    const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter) : updaterOrValue;
    setPersistedGlobalFilter(newValue);
    setPersistedPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };
  // Parámetros de consulta para el servidor
  const queryParams: PaginationParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: globalFilter,
      sortBy: sorting.length > 0 ? sorting[0].id : undefined,
      sortOrder:
        sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined,
    }),
    [pagination, globalFilter, sorting],
  );

  // Hooks de React Query
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => getUsersList(queryParams),
  });
  
  // Hooks de Zustand
  const { user: currentUser, can } = useAuthStore();

  // Hooks de React
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [usersToDelete, setUsersToDelete] = useState<User[]>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Columnas de la tabla
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
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
      {
        accessorKey: "full_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nombre" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <AppAvatar
              path={row.original.avatar_url || ""}
              name={row.original.full_name || row.original.username}
              className="h-5 w-5 text-[9px]"
            />
            <span className="font-medium">{row.original.full_name}</span>
          </div>
        ),
      },
      {
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Usuario" />
        ),
        cell: ({ row }) => <div className="lowercase">@{row.getValue("username")}</div>,
      },
      {
        accessorKey: "role_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Rol" />
        ),
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("role_name")}</div>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fecha de Creación" />
        ),
        cell: ({ row }) => (
          <div>{format(new Date(row.getValue("created_at")), 'yyyy-MM-dd HH:mm')}</div>
        ),
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => {
          const estado = row.getValue("is_active") as boolean

          return (
            <Badge
              className={`capitalize min-w-[80px] justify-center ${estado
                ? "bg-green-600 text-white hover:bg-green-600/80"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                }`}
            >
              {estado ? "activo" : "inactivo"}
            </Badge>
          )
        },
      },
    ],
    [currentUser?.id]
  );

  // Funcion para eliminar usuarios
  const handleDeleteClick = (selectedRows: any[]) => {
    const users = selectedRows.map((row) => row.original);
    setUsersToDelete(users);
    setDeleteDialogOpen(true);
  };

  if (error) {
    return (
      <div className="w-full p-8 text-center text-red-500">
        <strong>Error al cargar:</strong> {(error as Error).message}
      </div>
    );
  }

  // Renderizado
  return (
    <>
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={loading}
        initialSorting={[{ id: "created_at", desc: true }]}
        initialColumnVisibility={{ created_at: false }}
        columnTitles={{
          full_name: "Nombre",
          username: "Usuario",
          role_name: "Rol",
          created_at: "Fecha de Creación",
          is_active: "Estado"
        }}
        manualPagination={true}
        manualFiltering={true}
        manualSorting={true}
        sorting={sorting}
        onSortingChange={setSorting}
        rowCount={data?.total || 0}
        columnFilters={columnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        globalFilter={globalFilter}
        onGlobalFilterChange={handleGlobalFilterChange}
        pagination={pagination}
        onPaginationChange={setPersistedPagination}
        actions={(table) => (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {can('users:create') && (
              <Button className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap" onClick={() => setIsCreateDialogOpen(true)} data-testid="open-create-user-dialog">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Usuario</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
            {can('users:edit') && <Button
              variant="default"
              size="sm"
              disabled={table.getFilteredSelectedRowModel().rows.length !== 1}
              className="rounded-l bg-[#480489] hover:bg-[#480489]/90"
              onClick={() => { 
                const selected = table.getFilteredSelectedRowModel().rows[0].original;
                setSelectedUser(selected);
                setIsEditDialogOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>}
            {can('users:delete') && (
              <Button
                variant="destructive"
                size="sm"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                onClick={() => handleDeleteClick(table.getFilteredSelectedRowModel().rows)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Eliminar {table.getFilteredSelectedRowModel().rows.length > 0 && `(${table.getFilteredSelectedRowModel().rows.length})`}
              </Button>
            )}
          </div>
        )}
      />
      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            refetch();
            setRowSelection({});
          }
        }}
      />

      {/* Modal de Editar */}
      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            refetch();
            setSelectedUser(null);
            setRowSelection({});
          }
        }}
        user={selectedUser}
        currentUserId={useAuthStore.getState()?.user?.id || ''}
      />

      {/* Modal de Eliminar */}
      <DeleteUsersDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        users={usersToDelete}
        onSuccess={() => {
          refetch();
          setRowSelection({});
        }}
        
      />
      
    </>
  )
}