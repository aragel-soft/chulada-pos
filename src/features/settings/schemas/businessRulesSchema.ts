import { z } from "zod";

const MSG_REQUIRED = "Este campo es obligatorio";

const requiredNumber = (opts?: { min?: number, minMsg?: string, max?: number, maxMsg?: string}) => {
  let schema = z.number({ 
    message: MSG_REQUIRED
  });
  
  if (opts?.min !== undefined) schema = schema.min(opts.min, opts.minMsg || "");
  if (opts?.max !== undefined) schema = schema.max(opts.max, opts.maxMsg || "");
  
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, schema) as z.ZodType<number, any, any>;
};

export const businessSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "El nombre de la tienda es obligatorio"),
  logicalStoreName: z
    .string()
    .trim()
    .min(1, "El ID de sucursal es requerido")
    .regex(/^[a-zA-Z0-9-_]+$/, "Solo letras, números, guiones y guiones bajos"),
  storeAddress: z.string().trim(),
  defaultCashFund: requiredNumber({ min: 0, minMsg: "No puede ser negativo" }),
  maxCashLimit: requiredNumber({ min: 0, minMsg: "No puede ser negativo" }),
  taxRate: requiredNumber({ min: 0, minMsg: "Mínimo 0%", max: 100, maxMsg: "Máximo 100%" }),
  applyTax: z.boolean(),
  allowOutOfStockSales: z.boolean(),
  defaultCreditLimit: requiredNumber({ min: 0, minMsg: "El límite base no puede ser negativo" }),
  maxCreditLimit: requiredNumber({ min: 0, minMsg: "El límite máximo no puede ser negativo" }),
  discountPresetOptions: z.string().min(1, "Debe proveer opciones"),
  maxDiscountPercentage: requiredNumber({ min: 1, minMsg: "Debe ser al menos 1%", max: 50, maxMsg: "No puede ser mayor a 50%" }),
  maxOpenTickets: requiredNumber({ min: 1, minMsg: "Mínimo 1 ticket", max: 20, maxMsg: "Máximo 20 tickets" }),
}).refine((data) => data.defaultCashFund <= data.maxCashLimit, {
  message: "El fondo de caja inicial no puede ser menor al límite máximo",
  path: ["maxCashLimit"],
}).refine((data) => data.defaultCreditLimit <= data.maxCreditLimit, {
  message: "El límite de crédito base no puede ser menor al límite máximo",
  path: ["maxCreditLimit"],
});

export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;
