// Importaciones
import { useQuery } from "@tanstack/react-query";
import { getRoles, getPermissions, getRolePermissions } from "@/lib/api/permissions";
import { Permission } from "@/types/permission";
import { DataTableLayout } from "@/components/layouts/DataTableLayout";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { DebouncedInput } from "@/components/ui/debounced-input";

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

// Componente principal
export function PermissionsMatrixPage() {
  // Estados
  const [globalFilter, setGlobalFilter] = useState("");

  // Consultas
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const { data: rolePermissions = [], isLoading: loadingRolePermissions } = useQuery({
    queryKey: ["rolePermissions"],
    queryFn: getRolePermissions,
  });

  const isLoading = loadingRoles || loadingPermissions || loadingRolePermissions;

  // Create lookup map: roleId -> Set<permissionId>
  const rolePermissionsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rolePermissions.forEach((rp) => {
      if (!map.has(rp.role_id)) {
        map.set(rp.role_id, new Set());
      }
      map.get(rp.role_id)?.add(rp.permission_id);
    });
    return map;
  }, [rolePermissions]);

  // Filtro de permisos
  const filteredPermissions = useMemo(() => {
      if (!globalFilter) return permissions;
      const lowerFilter = globalFilter.toLowerCase();
      return permissions.filter(p => 
          p.name.toLowerCase().includes(lowerFilter) || 
          (p.description && p.description.toLowerCase().includes(lowerFilter)) ||
          p.module.toLowerCase().includes(lowerFilter)
      );
  }, [permissions, globalFilter]);

  // Columnas
  const columnHelper = createColumnHelper<Permission>();

  const columns = useMemo(() => {
    if (roles.length === 0) return [];

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
    const roleColumns = roles.map((role) =>
      columnHelper.display({
        id: role.id,
        header: () => (
            <div className="text-center whitespace-nowrap">
                {role.display_name}
            </div>
        ),
        cell: (info) => {
            const permissionId = info.row.original.id;
            const hasPermission = rolePermissionsMap.get(role.id)?.has(permissionId);
            return (
                <div className="flex justify-center">
                    <Checkbox checked={hasPermission || false} disabled />
                </div>
            );
        },
      })
    );

    return [...baseColumns, ...roleColumns];
  }, [roles, rolePermissionsMap, columnHelper]);

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
            <div className="flex items-center gap-2 w-full max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <DebouncedInput
                    placeholder="Buscar permisos..."
                    value={globalFilter}
                    onChange={(value) => setGlobalFilter(String(value))}
                    className="pl-10 h-9 w-full"
                />
            </div>
        }
    >

        <table className="w-full caption-bottom text-sm text-left">
          <thead className="sticky top-0 z-20 bg-background shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={`h-12 px-4 align-middle font-medium text-muted-foreground bg-background [&:has([role=checkbox])]:pr-0 ${
                        index === 0 ? "sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" : ""
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
                                <td colSpan={columns.length} className="p-2 font-semibold text-primary sticky left-0 z-10 bg-muted/30">
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
                                    index === 0 ? "sticky left-0 bg-background z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" : ""
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
      
    </DataTableLayout>
  );
}
