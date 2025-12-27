import { z } from "zod";

export const cashMovementBaseSchema = z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  concept: z.string().min(1, "Seleccione un concepto"),
  description: z.string().optional(),
});

export const getCashMovementSchema = (type: "IN" | "OUT") => {
  return cashMovementBaseSchema.superRefine((data, ctx) => {
    if (type === "OUT") {
      if (!data.description || data.description.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La nota es obligatoria para las salidas",
          path: ["description"],
        });
      }
    }
  });
};

export type CashMovementFormValues = z.infer<typeof cashMovementBaseSchema>;
