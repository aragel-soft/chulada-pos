import { useState } from "react";
import { toast } from "sonner";
import { User } from "@/types/users";
import { deleteUsers } from "@/lib/api/users";
import { useAuthStore } from "@/stores/authStore";
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
import { Trash2 } from "lucide-react";

interface DeleteUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onSuccess: () => void;
}

export function DeleteUsersDialog({
  open,
  onOpenChange,
  users,
  onSuccess,
}: DeleteUsersDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useAuthStore();

  const handleConfirm = async () => {
    if (!currentUser) return;

    try {
      setIsDeleting(true);
      const userIds = users.map((u) => u.id);
      
      await deleteUsers(userIds, currentUser.id);

      toast.success(
        users.length === 1
          ? "Usuario eliminado correctamente"
          : `${users.length} usuarios eliminados correctamente`
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.code === "LAST_ADMIN_PROTECTION") {
        toast.error("No se puede eliminar", {
          description: error.message,
          duration: 5000,
        });
      } else if (error.code === "SELF_DELETION") {
        toast.error("Acción no permitida", {
          description: error.message,
        });
      } else {
        toast.error("Error al eliminar", {
          description: error.message || "Ocurrió un error inesperado.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isPlural = users.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trash2 className="inline-block mr-2 -mt-1 h-5 w-5" />
            {isPlural
              ? `¿Eliminar ${users.length} usuarios?`
              : "¿Eliminar usuario?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPlural
              ? "Esta acción marcará a los usuarios seleccionados como eliminados y perderán el acceso al sistema."
              : `Esta acción eliminará al usuario "${users[0]?.full_name}".`}
            <br />
            <span className="font-medium">
              ¿Confirmas que deseas proceder?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); 
              handleConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}