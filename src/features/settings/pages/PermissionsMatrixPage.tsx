// Importaciones
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
} from "@/lib/api/permissions";
import { Permission, RolePermission } from "@/types/permission";
import { DataTableLayout } from "@/components/layouts/DataTableLayout";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState, useEffect } from "react";
import { Loader2, Search, Save } from "lucide-react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Button } from "@/components/ui/button";
import { PermissionsChangesModal } from "../components/PermissionsChangesModal";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

// Constantes de nombre de módulos
const MODULE_NAMES: Record<string, string> = {
  inventory: "Inventario",
  sales: "Ventas",
  cash_register: "Caja",
  reports: "Reportes",
  users: "Usuarios",
  profile: "Perfil",
  settings: "Configuración",
  customers: "Clientes",
  permissions: "Permisos",
};

const ADMIN_ROLE_ID = "550e8400-e29b-41d4-a716-446655440001";

// Componente principal
export function PermissionsMatrixPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // Estados
  const [globalFilter, setGlobalFilter] = useState("");
  const [localRolePermissions, setLocalRolePermissions] = useState<
    RolePermission[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Consultas
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const { data: rolePermissions = [], isLoading: loadingRolePermissions } =
    useQuery({
      queryKey: ["rolePermissions"],
      queryFn: getRolePermissions,
    });

  // Mutación para guardar cambios
  const updateMutation = useMutation({
    mutationFn: updateRolePermissions,
    onSuccess: () => {
      toast.success("Permisos actualizados correctamente");
      queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
      setIsModalOpen(false);
    },
    onError: (error) => {
      console.error("Error updating permissions:", error);
      toast.error(`Error al actualizar permisos: ${error}`);
    },
  });

  // Inicializar estado local cuando cargan los datos
  useEffect(() => {
    if (rolePermissions.length > 0) {
      setLocalRolePermissions(rolePermissions);
    }
  }, [rolePermissions]);

  const isLoading =
    loadingRoles || loadingPermissions || loadingRolePermissions;

  // Create lookup map: roleId -> Set<permissionId>
  const rolePermissionsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    localRolePermissions.forEach((rp) => {
      if (!map.has(rp.role_id)) {
        map.set(rp.role_id, new Set());
      }
      map.get(rp.role_id)?.add(rp.permission_id);
    });
    return map;
  }, [localRolePermissions]);

  // Filtro de permisos
  const filteredPermissions = useMemo(() => {
    if (!globalFilter) return permissions;
    const lowerFilter = globalFilter.toLowerCase();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerFilter) ||
        (p.description &&
          p.description.toLowerCase().includes(lowerFilter)) ||
        p.module.toLowerCase().includes(lowerFilter)
    );
  }, [permissions, globalFilter]);

  // Ordenar roles: Admin -> Manager -> Cashier -> Otros
  const sortedRoles = useMemo(() => {
    const priority = ["admin", "manager", "cashier"]; // Usamos role_name o display_name si es consistente
    // Mejor usar IDs si son fijos, pero el usuario mencionó nombres.
    // Asumiré que los nombres internos son 'admin', 'manager', 'cashier' basado en la imagen.
    
    return [...roles].sort((a, b) => {
        const indexA = priority.indexOf(a.name);
        const indexB = priority.indexOf(b.name);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.display_name.localeCompare(b.display_name);
    });
  }, [roles]);

  // Manejar cambio de checkbox
  const handleCheckboxChange = (roleId: string, permissionId: string) => {
    setLocalRolePermissions((prev) => {
      const exists = prev.some(
        (rp) => rp.role_id === roleId && rp.permission_id === permissionId
      );

      if (exists) {
        return prev.filter(
          (rp) => !(rp.role_id === roleId && rp.permission_id === permissionId)
        );
      } else {
        return [...prev, { role_id: roleId, permission_id: permissionId }];
      }
    });
  };

  // Calcular cambios
  const changes = useMemo(() => {
    const changesList: {
      roleId: string;
      permissionId: string;
      type: "added" | "removed";
    }[] = [];

    // Check for added permissions
    localRolePermissions.forEach((localRp) => {
      const existsInOriginal = rolePermissions.some(
        (rp) =>
          rp.role_id === localRp.role_id &&
          rp.permission_id === localRp.permission_id
      );
      if (!existsInOriginal) {
        changesList.push({
          roleId: localRp.role_id,
          permissionId: localRp.permission_id,
          type: "added",
        });
      }
    });

    // Check for removed permissions
    rolePermissions.forEach((rp) => {
      const existsInLocal = localRolePermissions.some(
        (localRp) =>
          localRp.role_id === rp.role_id &&
          localRp.permission_id === rp.permission_id
      );
      if (!existsInLocal) {
        changesList.push({
          roleId: rp.role_id,
          permissionId: rp.permission_id,
          type: "removed",
        });
      }
    });

    return changesList;
  }, [localRolePermissions, rolePermissions]);

  const isDirty = changes.length > 0;

  // Columnas
  const columnHelper = createColumnHelper<Permission>();

  const columns = useMemo(() => {
    if (sortedRoles.length === 0) return [];

    const baseColumns = [
      columnHelper.accessor("display_name", {
        header: "Permiso",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-medium">{info.getValue()}</span>
            <span className="text-xs text-muted-foreground">
              {info.row.original.description}
            </span>
          </div>
        ),
        enableSorting: false,
      }),
    ];

    // Columnas de roles
    const roleColumns = sortedRoles.map((role) =>
      columnHelper.display({
        id: role.id,
        header: () => (
          <div className="text-center whitespace-nowrap">
            {role.display_name}
          </div>
        ),
        cell: (info) => {
          const permissionId = info.row.original.id;
          const hasPermission = rolePermissionsMap
            .get(role.id)
            ?.has(permissionId);
          
          // Logic for disabling checkboxes
          const isAdmin = role.id === ADMIN_ROLE_ID;
          const isSelf = currentUser?.role_id === role.id;
          const isDisabled = isAdmin || isSelf;

          return (
            <div className="flex justify-center">
              <Checkbox
                checked={hasPermission || false}
                onCheckedChange={() =>
                  handleCheckboxChange(role.id, permissionId)
                }
                disabled={isDisabled}
              />
            </div>
          );
        },
      })
    );

    return [...baseColumns, ...roleColumns];
  }, [sortedRoles, rolePermissionsMap, columnHelper, currentUser]);

  // Tabla
  const table = useReactTable({
    data: filteredPermissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  let lastModule = "";

  return (
    <DataTableLayout
      filters={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 w-full max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              placeholder="Buscar permisos..."
              value={globalFilter}
              onChange={(value) => setGlobalFilter(String(value))}
              className="pl-10 h-9 w-full"
            />
          </div>
          {isDirty && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Save className="h-4 w-4" />
              Guardar Cambios
            </Button>
          )}
        </div>
      }
    >
      <table className="w-full caption-bottom text-sm text-left">
        <thead className="sticky top-0 z-20 bg-background shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            >
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`h-12 px-4 align-middle font-medium text-muted-foreground bg-background [&:has([role=checkbox])]:pr-0 ${
                    index === 0
                      ? "sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                      : ""
                  }`}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {table.getRowModel().rows.map((row) => {
            const currentModule = row.original.module;
            const showModuleHeader = currentModule !== lastModule;
            lastModule = currentModule;

            return (
              <>
                {showModuleHeader && (
                  <tr className="bg-muted/30">
                    <td
                      colSpan={columns.length}
                      className="p-2 font-semibold text-primary sticky left-0 z-10 bg-muted/30"
                    >
                      <div className="flex items-center gap-2 pl-2">
                        {MODULE_NAMES[currentModule] || currentModule}
                      </div>
                    </td>
                  </tr>
                )}
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <td
                      key={cell.id}
                      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${
                        index === 0
                          ? "sticky left-0 bg-background z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                          : ""
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              </>
            );
          })}
        </tbody>
      </table>

      <PermissionsChangesModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        changes={changes}
        roles={roles}
        permissions={permissions}
        onConfirm={() => updateMutation.mutate(localRolePermissions)}
        isSaving={updateMutation.isPending}
      />
    </DataTableLayout>
  );
}
