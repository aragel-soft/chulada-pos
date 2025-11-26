import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Upload, X, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

import { createUser, getAllRoles, saveAvatar, checkUsernameAvailable } from '@/lib/api/users';
import type { CreateUserPayload } from '@/types/users';
import { createUserSchema, type CreateUserForm } from '@/features/settings/schemas/createUserSchema';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema) as any,
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      username: '',
      password: '',
      confirm_password: '',
      role_id: '',
      is_active: true,
      avatar_url: undefined,
    },
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRoles,
    enabled: open,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      let avatarUrl: string | undefined;

      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        avatarUrl = await saveAvatar(Array.from(uint8Array), data.username);
      }

      const payload: CreateUserPayload = {
        username: data.username,
        password: data.password,
        full_name: data.full_name,
        role_id: data.role_id,
        is_active: data.is_active,
        avatar_url: avatarUrl,
      };

      console.time("Creación de usuario");
      const newUser = await createUser(payload);
      console.timeEnd("Creación de usuario");

      // Ensure avatar_url is present if we have it locally but backend didn't return it
      if (avatarUrl && !newUser.avatar_url) {
        return { ...newUser, avatar_url: avatarUrl };
      }
      return newUser;
    },
    onSuccess: () => {
      toast.success('Usuario creado correctamente');
      handleClose();
    },
    onError: (error: any) => {
      if (error.code === 'USERNAME_EXISTS') {
        form.setError('username', {
          type: 'manual',
          message: error.message,
        });
      } else {
        toast.error(error.message || 'Error al crear usuario. Intenta de nuevo');
      }
    },
  });

  const handleClose = () => {
    form.reset();
    setAvatarPreview(null);
    setAvatarFile(null);
    setImagePosition({ x: 50, y: 50 });
    setShowPassword(false);
    setShowConfirmPassword(false);
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setImagePosition({ x: 50, y: 50 });
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

  const onSubmit = async (data: z.infer<typeof createUserSchema>) => {
    console.time("Validación de usuario");
    const isAvailable = await checkUsernameAvailable(data.username);
    console.timeEnd("Validación de usuario");
    if (!isAvailable) {
      form.setError('username', {
        type: 'manual',
        message: 'El usuario ya existe. Elige otro nombre de usuario',
      });
      return;
    }

    createUserMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <style>
          {`
            input::-ms-reveal,
            input::-ms-clear {
              display: none;
            }
          `}
        </style>
        <DialogHeader>
          <DialogTitle>Agregar Usuario</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear un nuevo usuario
          </DialogDescription>
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
                  <FormLabel className="!text-current">
                    Usuario <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="juanperez"
                      {...field}
                      data-testid="input-username"
                      onChange={(e) => {
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Contraseña <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="off"
                        {...field}
                        data-testid="input-password"
                        onChange={(e) => {
                          field.onChange(e.target.value.replace(/\s/g, ''));
                          // Trigger validation for confirm_password when password changes
                          if (form.getValues('confirm_password')) {
                            form.trigger('confirm_password');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Confirmar contraseña <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="off"
                        {...field}
                        data-testid="input-confirm-password"
                        onChange={(e) => {
                          field.onChange(e.target.value.replace(/\s/g, ''));
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={rolesLoading}
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
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="btn-save-user"
              >
                {createUserMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}