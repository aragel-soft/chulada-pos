import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Upload, X } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
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

import { getAllRoles, saveAvatar, updateUser } from '@/lib/api/users';
import type { User, UpdateUserPayload } from '@/types/users';

// Schema for editing - password is optional
const editUserSchema = z.object({
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  username: z.string(), // Read only
  role_id: z.string().min(1, 'El rol es requerido'),
  is_active: z.boolean(),
  avatar_url: z.string().optional(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentUserId: string;
}

export function EditUserDialog({ open, onOpenChange, user, currentUserId }: EditUserDialogProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Reset form when user changes
  useEffect(() => {
    if (user && open) {
      form.reset({
        full_name: user.full_name,
        username: user.username,
        role_id: user.role_id,
        is_active: user.is_active,
        avatar_url: user.avatar_url || undefined,
      });
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      } else {
        setAvatarPreview(null);
      }
      setAvatarFile(null);
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

      let avatarUrl = user.avatar_url; // Default to existing

      // If new file, upload it
      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        avatarUrl = await saveAvatar(Array.from(uint8Array), data.username);
      } 
      // If preview is null but we had an avatar, it means it was removed
      else if (!avatarPreview && user.avatar_url) {
        avatarUrl = undefined; // Or handle deletion if backend supports it explicitly
      }

      const payload: UpdateUserPayload = {
        id: user.id,
        username: data.username, // Not used for update but kept for consistency
        full_name: data.full_name,
        role_id: data.role_id,
        is_active: data.is_active,
        avatar_url: avatarUrl,
        current_user_id: currentUserId,
      };

      console.time("Actualización de usuario");
      const updatedUser = await updateUser(payload);
      console.timeEnd("Actualización de usuario");

      return updatedUser;
    },
    onSuccess: () => {
      toast.success('Usuario actualizado correctamente');
      handleClose();
    },
    onError: (error: any) => {
        toast.error(error.message || 'Error al actualizar usuario');
    },
  });

  const handleClose = () => {
    form.reset();
    setAvatarPreview(null);
    setAvatarFile(null);
    setImagePosition({ x: 50, y: 50 });
    onOpenChange(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setImagePosition({ x: 50, y: 50 });
        form.setValue('avatar_url', 'changed', { shouldDirty: true }); // Mark as dirty
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setImagePosition({ x: 50, y: 50 });
    form.setValue('avatar_url', '', { shouldDirty: true }); // Mark as dirty
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Inverted controls
    const x = 100 - ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;

    setImagePosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              {!avatarPreview ? (
                <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-2">Subir avatar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              ) : (
                <div className="relative">
                  <div
                    ref={containerRef}
                    className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      ref={imageRef}
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                      }}
                      draggable={false}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Arrastra para centrar
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo *</FormLabel>
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
                  <FormLabel>Rol *</FormLabel>
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
                disabled={updateUserMutation.isPending || !form.formState.isDirty}
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