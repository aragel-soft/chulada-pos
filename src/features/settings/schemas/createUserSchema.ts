import * as z from 'zod';

export const createUserSchema = z.object({
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guion bajo'),
  password: z.string().min(4, 'Contraseña debe tener al menos 4 caracteres'),
  confirm_password: z.string(),
  role_id: z.string().min(1, 'El rol es requerido'),
  is_active: z.boolean().optional().default(true),
  avatar_url: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

export type CreateUserForm = z.output<typeof createUserSchema>;
