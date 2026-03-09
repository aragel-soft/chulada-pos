import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  avatar_url: z.string().optional(),
});

export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().trim().min(1, { message: "La contraseña actual es obligatoria" }),
  new_password: z.string().trim().min(4, { message: "La nueva contraseña debe tener al menos 4 caracteres" }),
  confirm_password: z.string().trim().min(1, { message: "Debes confirmar la contraseña" }),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
});

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
