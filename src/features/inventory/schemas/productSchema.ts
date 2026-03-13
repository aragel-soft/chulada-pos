import * as z from "zod";

const productBaseShape = {
  code: z.string()
    .transform(val => val.trim())
    .pipe(
      z.string()
      .max(32, "El código no debe exceder 32 caracteres")
    )
    .optional()
    .default(""),
  barcode: z.string()
    .transform(val => val.trim())
    .pipe(
      z.string()
      .min(1, "El código de barras es requerido")
      .max(32, "El código de barras no debe exceder 32 caracteres")
    ),
  name: z.string()
    .transform(val => val.trim().replace(/\s+/g, ' ')) 
    .pipe(z.string().min(3, "El nombre debe tener al menos 3 caracteres")),
  description: z.string().optional(),
  category_id: z.string().min(1, "Selecciona una categoría"),
  
  retail_price: z.coerce.
    number()
    .positive("El precio debe ser mayor a 0")
    .multipleOf(0.01, "El precio debe ser en incrementos de $0.01"),
    
  wholesale_price: z.coerce
    .number()
    .nonnegative("El costo no puede ser negativo")
    .multipleOf(0.01, "El precio debe ser en incrementos de $0.01")
    .optional()
    .default(0),
    
  purchase_price: z.coerce
    .number()
    .nonnegative("El costo no puede ser negativo")
    .optional()
    .default(0),
    
  min_stock: z.coerce
    .number()
    .int("El stock mínimo debe ser un número entero")
    .min(0, "El stock mínimo no puede ser negativo")
    .default(5),
    
  image_url: z.string().optional(),
  
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
};

const wholesaleRefinement = (data: any) => data.wholesale_price <= data.retail_price;
const wholesaleRefinementParams = {
  message: "El precio de mayoreo no puede ser mayor al precio de menudeo",
  path: ["wholesale_price"], 
};

/** Schema para creación: stock >= 0 */
export const productSchema = z.object({
  ...productBaseShape,
  stock: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .default(0),
}).refine(wholesaleRefinement, wholesaleRefinementParams);

/** Schema para edición: acepta stock negativo */
export const productEditSchema = z.object({
  ...productBaseShape,
  stock: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .default(0),
}).refine(wholesaleRefinement, wholesaleRefinementParams);

export type ProductFormValues = z.output<typeof productSchema>;