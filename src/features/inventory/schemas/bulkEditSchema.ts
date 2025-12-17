import * as z from "zod";

export const bulkEditSchema = z.object({
  category_id: z.string().optional(),
  
  is_active: z.boolean().optional(),
  
  retail_price: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0")
    .optional(),
    
  wholesale_price: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0")
    .optional(),

tags: z.array(z.string()).optional(), 
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