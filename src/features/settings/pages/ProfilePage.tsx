import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Separator } from '@/components/ui/separator';

import { useAuthStore } from '@/stores/authStore';
import { saveAvatar } from '@/lib/api/users';
import {
  updateOwnProfile,
  changeOwnPassword,
  type UpdateProfilePayload,
  type ChangePasswordPayload,
} from '@/lib/api/users';

import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileForm,
  type ChangePasswordForm,
} from '../schemas/profileSchema';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  // --- Formulario General ---
  const generalForm = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: user?.full_name || '',
      avatar_url: user?.avatar_url || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      if (!user) throw new Error("No hay usuario autenticado");

      let finalAvatarUrl: string | undefined | null = user.avatar_url;

      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        finalAvatarUrl = await saveAvatar(Array.from(uint8Array), user.username);
      } else if (avatarRemoved) {
        finalAvatarUrl = null;
      }

      const payload: UpdateProfilePayload = {
        id: user.id,
        full_name: data.full_name,
        avatar_url: finalAvatarUrl,
      };

      return await updateOwnProfile(payload);
    },
    onSuccess: (updatedUser) => {
      updateUser({
        full_name: updatedUser.full_name,
        avatar_url: updatedUser.avatar_url ?? undefined,
      });
      toast.success('Perfil actualizado correctamente');
      setAvatarFile(null);
      setAvatarRemoved(false);
      generalForm.reset({
        full_name: updatedUser.full_name,
        avatar_url: updatedUser.avatar_url || '',
      });
    },
    onError: (error: any) => {
      toast.error('Error al actualizar el perfil', {
        description: error.message || 'Ocurrió un error inesperado',
      });
    },
  });

  const onGeneralSubmit = (data: UpdateProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      setAvatarFile(file);
      setAvatarRemoved(false);
      generalForm.setValue('avatar_url', 'changed', { shouldDirty: true });
    } else {
      setAvatarFile(null);
      setAvatarRemoved(true);
      generalForm.setValue('avatar_url', '', { shouldDirty: true });
    }
  };

  // --- Formulario Seguridad ---
  const securityForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      if (!user) throw new Error("No hay usuario autenticado");

      const payload: ChangePasswordPayload = {
        id: user.id,
        current_password: data.current_password,
        new_password: data.new_password,
      };

      return await changeOwnPassword(payload);
    },
    onSuccess: () => {
      toast.success('Contraseña cambiada con éxito');
      securityForm.reset();
    },
    onError: (error: any) => {
      toast.error('Error al cambiar la contraseña', {
        description: error.message || 'Verifica tu contraseña actual.',
      });
    },
  });

  const onSecuritySubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mi Perfil</h2>
          <p className="text-muted-foreground">
            Actualiza tu información personal y administra la seguridad de tu cuenta.
          </p>
        </div>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Información General</h3>
        <Form {...generalForm}>
          <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-4">
            <AvatarUpload
              existingPath={
                avatarRemoved
                  ? null
                  : avatarFile
                  ? URL.createObjectURL(avatarFile)
                  : user.avatar_url
              }
              onChange={handleAvatarChange}
            />

            <FormField
              control={generalForm.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Nombre completo <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Seguridad</h3>
        <Form {...securityForm}>
          <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
            <FormField
              control={securityForm.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">Contraseña actual <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Tu contraseña actual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={securityForm.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">Nueva contraseña <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 4 caracteres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={securityForm.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">Confirmar nueva contraseña <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Repite la nueva contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="destructive"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
              </Button>
            </div>
          </form>
        </Form>
      </section>
      </div>
    </div>
  );
}
