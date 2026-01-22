import { z } from "zod";
import { CUSTOMER_CONFIG } from "@/config/constants";

export const customerSchema = z.object({
  id: z.string().optional(),
  
  name: z.string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .transform((val) => {
      return val
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }),

  phone: z.string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 15, {
      message: "El teléfono debe tener entre 10 y 15 dígitos reales",
    }),

  email: z.string()
    .email("Correo electrónico inválido")
    .optional()
    .or(z.literal("")),

  address: z.string().optional(),

  credit_limit: z.union([z.string(), z.number()]) 
    .refine((val) => val !== "", "El límite es requerido") 
    .pipe(z.coerce.number()) 
    .pipe(
      z.number()
        .min(0, "El crédito no puede ser negativo")
        .max(
          CUSTOMER_CONFIG.MAX_CREDIT_LIMIT, 
          `El límite máximo permitido es $${CUSTOMER_CONFIG.MAX_CREDIT_LIMIT}`
        )
    ),

  is_active: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;