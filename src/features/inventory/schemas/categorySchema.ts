import { z } from "zod";

export const categorySchema = z.object({
  name: z.string()
    .min(3, "Mínimo 3 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^(?!\s)/, 'No se permiten espacios al inicio')
    .regex(/^(?!\s$)/, 'No se permiten espacios al final')
    .regex(/^(?!.*\s{2})/, 'No se permiten dos espacios seguidos'),
  parent_id: z.string().nullable().optional(), // UUID o null
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color inválido"),
  sequence: z.number().int()
    .min(0, "Mínimo 0")
    .max(100, "Máximo 100"),
  description: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
