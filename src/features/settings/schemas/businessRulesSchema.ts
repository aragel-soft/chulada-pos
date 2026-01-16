import { z } from "zod";

export const businessSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "El nombre de la tienda es obligatorio"),
  logicalStoreName: z.string().trim().min(1, "El ID de sucursal es requerido").regex(/^[a-zA-Z0-9-_]+$/, "Solo letras, números, guiones y guiones bajos"),
  storeAddress: z.string().trim(),
  defaultCashFund: z
    .number()
    .min(0, "No puede ser negativo"),
  maxCashLimit: z
    .number()
    .min(0, "No puede ser negativo"),
  taxRate: z
    .number()
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
  applyTax: z.boolean(),
});

export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;
