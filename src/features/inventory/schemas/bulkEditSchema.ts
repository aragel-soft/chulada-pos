import * as z from "zod";

export const bulkEditSchema = z.object({
  category_id: z.string().optional(),
  
  is_active: z.boolean().optional(),
  
  retail_price: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0")
    .multipleOf(0.01, "El precio debe ser en incrementos de $0.01")
    .optional(),
    
  wholesale_price: z.coerce
    .number()
    .nonnegative("El costo no puede ser negativo")
    .multipleOf(0.01, "El precio debe ser en incrementos de $0.01")
    .optional(),

  purchase_price: z.coerce
    .number()
    .nonnegative("El costo no puede ser negativo")
    .multipleOf(0.01, "El precio debe ser en incrementos de $0.01")
    .optional(),

  tags: z.array(z.string()).optional(), 
  tags_to_remove: z.array(z.string()).optional(),

  image_action: z.enum(["Keep", "Remove", "Replace"]).optional().default("Keep"),
  image_file: z.instanceof(File).optional(),
}).superRefine((data, ctx) => {
  if (data.retail_price !== undefined && data.wholesale_price !== undefined) {
    if (data.wholesale_price > data.retail_price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio de mayoreo no puede ser mayor al menudeo",
        path: ["wholesale_price"],
      });
    }
  }
});

export type BulkEditFormValues = z.infer<typeof bulkEditSchema>;