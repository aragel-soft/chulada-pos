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
import {
  Loader2,
  Search, Save,
  Package,
  Home,
  CreditCard,
  ClipboardList,
  UserCog,
  User,
  Settings,
  Users,
  Shield,
  Check,
  PlusCircle
} from "lucide-react";

import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

const MODULE_ICONS: Record<string, React.ElementType> = {
  inventory: Package,
  sales: Home,
  cash_register: CreditCard,
  reports: ClipboardList,
  users: UserCog,
  profile: User,
  settings: Settings,
  customers: Users,
  permissions: Shield,
};

// Componente principal
export function PermissionsMatrixPage() {
  // Queries
  const queryClient = useQueryClient();

  // Auth
  const { user: currentUser, can } = useAuthStore();

  // Estados
  const [globalFilter, setGlobalFilter] = useState("");
  const [localRolePermissions, setLocalRolePermissions] = useState<
    RolePermission[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [moduleFilters, setModuleFilters] = useState<string[]>([]);

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
    mutationFn: (data: RolePermission[]) =>
      updateRolePermissions({
        rolePermissions: data,
        userId: currentUser?.id || "",
      }),
    onSuccess: () => {
      toast.success("Permisos actualizados correctamente");
      queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error.message || String(error);

      try {
        const jsonMatch = errorMessage.match(/\[.*\]/s);
        if (jsonMatch) {
          const errors = JSON.parse(jsonMatch[0]);
          if (Array.isArray(errors)) {
            errors.forEach((err: { message: string }) => {
              toast.error(err.message);
            });
            return;
          }
        }
      } catch (e) {
      }

      toast.error(`Error al actualizar permisos: ${errorMessage}`);
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
    let result = permissions;

    // Filtrar por módulo (Multi-Select)
    if (moduleFilters.length > 0) {
      result = result.filter(p => moduleFilters.includes(p.module));
    }

    // Filtrar por texto (Search)
    if (globalFilter) {
      const lowerFilter = globalFilter.toLowerCase();
      result = result.filter(p => {
        const displayNameMatch = p.display_name.toLowerCase().includes(lowerFilter);
        const descriptionMatch = p.description && p.description.toLowerCase().includes(lowerFilter);

        // Buscar por nombre de módulo (localizado)
        const moduleName = MODULE_NAMES[p.module] || p.module;
        const moduleMatch = moduleName.toLowerCase().includes(lowerFilter);

        return displayNameMatch || descriptionMatch || moduleMatch;
      });
    }

    return result;
  }, [permissions, globalFilter, moduleFilters]);

  // Ordenar roles
  const sortedRoles = useMemo(() => {
    const priority = ["admin", "manager", "cashier"];

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

    // Revisar por adicionales
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

    // Revisar por eliminaciones
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

          // Revisar por cambios pendientes
          const isAdded = !rolePermissions.some(rp => rp.role_id === role.id && rp.permission_id === permissionId) && hasPermission;
          const isRemoved = rolePermissions.some(rp => rp.role_id === role.id && rp.permission_id === permissionId) && !hasPermission;

          // Lógica para deshabilitar checkboxes
          const isAdmin = role.id === ADMIN_ROLE_ID;
          const isSelf = currentUser?.role_id === role.id;
          const currentUserHasPermission = can(info.row.original.name);
          const isDisabled = isAdmin || isSelf || !currentUserHasPermission;

          return (
            <div className="flex justify-center items-center h-full w-full">
              <Checkbox
                checked={hasPermission || false}
                onCheckedChange={() =>
                  handleCheckboxChange(role.id, permissionId)
                }
                disabled={isDisabled}
                className={cn(
                  isAdded && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600",
                  isRemoved && "border-red-500 bg-red-50"
                )}
              />
            </div>
          );
        },
      })
    );

    return [...baseColumns, ...roleColumns];
  }, [sortedRoles, rolePermissionsMap, columnHelper, currentUser, rolePermissions, can]);

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
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              placeholder="Buscar permisos..."
              value={globalFilter}
              onChange={(value) => setGlobalFilter(String(value))}
              className="pl-10 h-10 w-full text-base"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-dashed"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Módulos
                {moduleFilters.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal lg:hidden"
                    >
                      {moduleFilters.length}
                    </Badge>
                    <div className="hidden space-x-1 lg:flex">
                      {moduleFilters.length > 2 ? (
                        <Badge
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {moduleFilters.length} seleccionados
                        </Badge>
                      ) : (
                        Object.entries(MODULE_NAMES)
                          .filter(([key]) => moduleFilters.includes(key))
                          .map(([key, label]) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="rounded-sm px-1 font-normal"
                            >
                              {label}
                            </Badge>
                          ))
                      )}
                    </div>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Módulos" />
                <CommandList>
                  <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                  <CommandGroup>
                    {Object.entries(MODULE_NAMES).map(([key, label]) => {
                      const isSelected = moduleFilters.includes(key);
                      const Icon = MODULE_ICONS[key];
                      return (
                        <CommandItem
                          key={key}
                          onSelect={() => {
                            if (isSelected) {
                              setModuleFilters(moduleFilters.filter((f) => f !== key));
                            } else {
                              setModuleFilters([...moduleFilters, key]);
                            }
                          }}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            <Check className={cn("h-4 w-4")} />
                          </div>
                          {Icon && (
                            <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {moduleFilters.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => setModuleFilters([])}
                          className="justify-center text-center"
                        >
                          Limpiar filtros
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      }
      actions={can('permissions:edit') && (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
          disabled={!isDirty}
        >
          <Save className="h-4 w-4" />
          Guardar Cambios
        </Button>
      )}
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
                  className={`h-12 px-4 align-middle font-medium text-muted-foreground bg-background [&:has([role=checkbox])]:pr-0 ${index === 0
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
                      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${index === 0 ? "sticky left-0 bg-background z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" : ""
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
