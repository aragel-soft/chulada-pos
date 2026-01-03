import { z } from "zod";

export const businessSettingsSchema = z.object({
  storeName: z.string().min(1, "El nombre de la tienda es obligatorio"),
  storeAddress: z.string(),
  ticketFooter: z.string(),
  defaultCashFund: z
    .number()
    .min(0, "No puede ser negativo"),
  maxCashAlert: z
    .number()
    .min(0, "No puede ser negativo"),
  currencySymbol: z.string().max(5, "Máximo 5 caracteres"),
  taxRate: z
    .number()
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
  logoPath: z.string(),
});

export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;
