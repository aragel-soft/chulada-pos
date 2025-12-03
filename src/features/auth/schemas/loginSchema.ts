import * as z from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido').regex(/^\S*$/, 'No se permiten espacios'),
  password: z.string().min(1, 'La contraseña es requerida').regex(/^\S*$/, 'No se permiten espacios'),
});

export type LoginFormData = z.infer<typeof loginSchema>;