// Importaciones
import {useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsersList } from "@/lib/api/users";
import type { User } from "@/types/users";
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAuthStore } from "@/stores/authStore";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import {
  Pencil,
  PlusCircle,
  Trash,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import { CreateUserDialog } from "../components/CreateUserDialog";
import { DeleteUsersDialog } from "../components/DeleteUsersDialog";
import { EditUserDialog } from "../components/EditUserDialog";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";

// Funcion para convertir la fecha
const processUsers = (users: User[]): User[] => {
  return users.map(user => ({
    ...user,
    created_at: format(new Date(user.created_at), 'yyyy-MM-dd HH:mm'),
  }));
};

// Componente principal
export function UsersListPage() {
  // Hooks de React Query
  const { data: users = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await getUsersList();
      return processUsers(data);
    },
  });
  
  // Hooks de Zustand
  const { user: currentUser, can } = useAuthStore();

  // Hooks de React
  const data = useMemo(() => users, [users]);

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
            <Avatar className="h-8 w-8">
              <AvatarImage src={row.original.avatar_url ? convertFileSrc(row.original.avatar_url) : undefined} alt={row.original.full_name} />
              <AvatarFallback>
                {row.original.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
          <div>{(row.getValue("created_at") as string)}</div>
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
        data={data}
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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
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
                Eliminar
              </Button>
            )}
          </div>
        )}
      />

      {/* Modal de Crear */}
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