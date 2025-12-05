// Importaciones
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Role } from "@/types/users";
import { Permission } from "@/types/permission";
import { Check, X } from "lucide-react";

// Interfaz para los cambios de permisos
interface PermissionChange {
  roleId: string;
  permissionId: string;
  type: "added" | "removed";
}

// Interfaz para las propiedades del modal
interface PermissionsChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: PermissionChange[];
  roles: Role[];
  permissions: Permission[];
  onConfirm: () => void;
  isSaving: boolean;
}

// Componente principal
export function PermissionsChangesModal({
  open,
  onOpenChange,
  changes,
  roles,
  permissions,
  onConfirm,
  isSaving,
}: PermissionsChangesModalProps) {
  // Agrupar los cambios por rol
  const changesByRole = changes.reduce((acc, change) => {
    if (!acc[change.roleId]) {
      acc[change.roleId] = [];
    }
    acc[change.roleId].push(change);
    return acc;
  }, {} as Record<string, PermissionChange[]>);

  // Función para obtener el nombre del rol
  const getRoleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.display_name || "Rol Desconocido";

  // Función para obtener el nombre del permiso
  const getPermissionName = (permissionId: string) =>
    permissions.find((p) => p.id === permissionId)?.display_name ||
    "Permiso Desconocido";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Cambios</AlertDialogTitle>
          <AlertDialogDescription>
            Revisa los cambios de permisos antes de guardar. Esta acción
            actualizará los accesos del sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {Object.entries(changesByRole).map(([roleId, roleChanges]) => (
              <div key={roleId} className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {getRoleName(roleId)}
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {roleChanges.length} cambios
                  </span>
                </h3>
                <div className="grid gap-2">
                  {roleChanges.map((change) => (
                    <div
                      key={`${change.roleId}-${change.permissionId}`}
                      className={`flex items-center gap-2 text-sm p-2 rounded-md border ${
                        change.type === "added"
                          ? "bg-green-50/50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400"
                          : "bg-red-50/50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
                      }`}
                    >
                      {change.type === "added" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {change.type === "added" ? "Agregado:" : "Quitado:"}
                      </span>
                      <span>{getPermissionName(change.permissionId)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSaving} className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap">
            {isSaving ? "Guardando..." : "Confirmar Guardado"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
