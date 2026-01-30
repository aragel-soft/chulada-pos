import * as z from "zod";

export const promotionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, " "))
    .pipe(
      z.string()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100, "El nombre es demasiado largo")
    ),
  description: z.string().optional(),
  comboPrice: z.union([z.number(), z.string()])
    .refine((val) => val !== "", { 
      message: "El precio es requerido" 
    })
    .transform((val) => Number(val))
    .refine((val) => val > 0, { 
      message: "El precio debe ser mayor a 0" 
    }),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
}).refine((data) => data.startDate <= data.endDate, {
  message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
  path: ["endDate"],
});

export type PromotionFormData = z.infer<typeof promotionFormSchema>;
