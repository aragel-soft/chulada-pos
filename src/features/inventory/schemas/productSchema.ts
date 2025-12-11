import * as z from "zod";

export const productSchema = z.object({
  code: z.string()
    .transform(val => val.trim())
    .pipe(
      z.string()
      .min(1, "El código es requerido")
      .max(16, "El código no debe exceder 16 caracteres")
    ),
  barcode: z.string()
    .transform(val => val.trim())
    .pipe(
      z.string()
      .max(32, "El código de barras no debe exceder 32 caracteres")
    )
    .optional(),
  name: z.string()
    .transform(val => val.trim().replace(/\s+/g, ' ')) 
    .pipe(z.string().min(3, "El nombre debe tener al menos 3 caracteres")),
  description: z.string().optional(),
  category_id: z.string().min(1, "Selecciona una categoría"),
  
  retail_price: z.coerce.
    number()
    .positive("El precio debe ser mayor a 0"),
    
  wholesale_price: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0"),
    
  purchase_price: z.coerce
    .number()
    .nonnegative("El costo no puede ser negativo")
    .optional()
    .default(0),
    
  stock: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .default(0),
    
  min_stock: z.coerce
    .number()
    .int("El stock mínimo debe ser un número entero")
    .min(0, "El stock mínimo no puede ser negativo")
    .default(5),
    
  image_url: z.string().optional(),
  
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
}).refine((data) => data.wholesale_price <= data.retail_price, {
  message: "El precio de mayoreo no puede ser mayor al precio de menudeo",
  path: ["wholesale_price"], 
});

export type ProductFormValues = z.output<typeof productSchema>;