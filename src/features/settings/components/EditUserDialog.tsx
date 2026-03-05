import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { useAuthStore } from '@/stores/authStore';

import { getAllRoles, saveAvatar, updateUser } from '@/lib/api/users';
import type { User, UpdateUserPayload } from '@/types/users';
import { editUserSchema, type EditUserForm } from '../schemas/userSchema';


interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentUserId: string;
}

export function EditUserDialog({ open, onOpenChange, user, currentUserId }: EditUserDialogProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const updateAuthUser = useAuthStore((state) => state.updateUser);

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      username: '',
      role_id: '',
      is_active: true,
      avatar_url: undefined,
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        full_name: user.full_name,
        username: user.username,
        role_id: user.role_id,
        is_active: user.is_active,
        avatar_url: user.avatar_url || undefined,
      });
      setAvatarFile(null);
      setAvatarRemoved(false);
    }
  }, [user, open, form]);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRoles,
    enabled: open,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserForm) => {
      if (!user) throw new Error("No user selected");

      let avatarUrl = user.avatar_url;

      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        avatarUrl = await saveAvatar(Array.from(uint8Array), data.username);
      } else if (avatarRemoved) {
        avatarUrl = undefined;
      }

      const payload: UpdateUserPayload = {
        id: user.id,
        username: data.username,
        full_name: data.full_name,
        role_id: data.role_id,
        is_active: data.is_active,
        avatar_url: avatarUrl,
        current_user_id: currentUserId,
      };

      return { updatedUser: await updateUser(payload), avatarUrl };
    },
    onSuccess: ({ updatedUser, avatarUrl }) => {
      if (user?.id === currentUserId) {
        updateAuthUser({
          full_name: updatedUser.full_name,
          avatar_url: avatarUrl,
        });
      }
      toast.success('Usuario actualizado correctamente');
      handleClose();
    },
    onError: (error: any) => {
      if (error.code === "SELF_DEGRADE") {
        toast.error("No se puede Actualizar", {
          description: error.message,
          duration: 5000,
        });
      } else if (error.code === "SELF_DEACTIVATION") {
        toast.error("Acción no permitida", {
          description: error.message,
        });
      } else if (error.code === "LAST_ADMIN") {
        toast.error("Acción no permitida", {
          description: error.message,
        });
      } else {
        toast.error("Error al actualizar", {
          description: error.message || "Ocurrió un error inesperado.",
        });
      }
    },
  });

  const handleClose = () => {
    form.reset();
    setAvatarFile(null);
    setAvatarRemoved(false);
    onOpenChange(false);
  };

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      setAvatarFile(file);
      setAvatarRemoved(false);
      form.setValue('avatar_url', 'changed', { shouldDirty: true });
    } else {
      setAvatarFile(null);
      setAvatarRemoved(true);
      form.setValue('avatar_url', '', { shouldDirty: true });
    }
  };

  const onSubmit = (data: EditUserForm) => {
    updateUserMutation.mutate(data);
  };

  const isSelf = user?.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para editar un usuario
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AvatarUpload
              existingPath={avatarRemoved ? null : user?.avatar_url}
              onChange={handleAvatarChange}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Nombre completo <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} data-testid="input-fullname" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      className="bg-gray-100 text-gray-500"
                      data-testid="input-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Rol <span className="text-destructive">*</span>
                  </FormLabel>
                   <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={rolesLoading || isSelf}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </div>
                      </TooltipTrigger>
                      {isSelf && (
                        <TooltipContent>
                          <p>No puedes cambiar tu propio rol</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado</FormLabel>
                    <div className="text-sm text-gray-500">
                      {field.value ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                  <FormControl>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSelf}
                              data-testid="switch-active"
                            />
                          </div>
                        </TooltipTrigger>
                        {isSelf && (
                          <TooltipContent>
                            <p>No puedes desactivar tu propia cuenta</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || !form.formState.isDirty || updateUserMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="btn-save-user"
              >
                {updateUserMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}