import * as z from "zod";

export const createInventoryMovementSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  productId: z.string().min(1, "Selecciona un producto"),
  reason: z.string().min(1, "Selecciona un motivo"),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

export type CreateInventoryMovementFormValues = z.infer<typeof createInventoryMovementSchema>;
