import { z } from "zod";
import { Product } from "@/types/inventory";

const selectorItemSchema = z.object({
  product: z.custom<Product>((val) => {
    return typeof val === "object" && val !== null && "id" in val;
  }, "Producto inválido"),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
});

export const kitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es demasiado largo"),
  description: z.string().optional(),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
  triggers: z
    .array(selectorItemSchema)
    .min(1, "Debes seleccionar al menos un producto disparador"),
  includedItems: z
    .array(selectorItemSchema)
    .min(1, "Debes agregar al menos un producto de regalo"),
});

export type KitFormData = z.infer<typeof kitFormSchema>;