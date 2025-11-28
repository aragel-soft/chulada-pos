import * as z from 'zod';

export const createUserSchema = z.object({
  full_name: z.string().min(1, 'El nombre completo es requerido')
    .regex(/^(?!\s)/, 'No se permiten espacios al inicio')
    .regex(/^(?!.*\s{2})/, 'No se permiten dos espacios seguidos'),
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guion bajo'),
  password: z.string().min(4, 'Contraseña debe tener al menos 4 caracteres'),
  confirm_password: z.string().min(4, 'Contraseña debe tener al menos 4 caracteres'),
  role_id: z.string().min(1, 'El rol es requerido'),
  is_active: z.boolean().optional().default(true),
  avatar_url: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

export type CreateUserForm = z.output<typeof createUserSchema>;


export const editUserSchema = z.object({
  full_name: z.string()
    .min(1, 'El nombre completo es requerido')
    .regex(/^(?!\s)/, 'No se permiten espacios al inicio')
    .regex(/^(?!.*\s{2})/, 'No se permiten dos espacios seguidos'),
  username: z.string(), 
  role_id: z.string().min(1, 'El rol es requerido'),
  is_active: z.boolean(),
  avatar_url: z.string().optional(),
});

export type EditUserForm = z.infer<typeof editUserSchema>;