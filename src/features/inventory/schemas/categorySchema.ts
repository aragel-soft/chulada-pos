import { z } from "zod";

export const categorySchema = z.object({
  name: z.string()
    .transform((val) => val.replace(/\s+/g, " ").trim())
    .pipe(
      z.string()
        .min(3, "Mínimo 3 caracteres")
        .max(50, "Máximo 50 caracteres")
    ),
  parent_id: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color inválido"),
  sequence: z.union([z.string(), z.number()])
    .transform((val) => (val === "" || val === undefined || val === null ? 0 : Number(val)))
    .pipe(
      z.number()
        .int()
        .min(0, "Mínimo 0")
        .max(100, "Máximo 100")
    ),
  description: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional(),
  is_active: z.boolean().optional(),
});

export type CategoryFormValues = z.input<typeof categorySchema>;
