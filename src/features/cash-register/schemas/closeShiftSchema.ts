import { z } from 'zod';

export const closeShiftSchema = z.object({
  final_cash: z.coerce
    .number()
    .min(0, 'El monto no puede ser negativo'),

  card_terminal_total: z.coerce
    .number()
    .min(0, 'El monto no puede ser negativo'),

  terminal_cut_confirmed: z.literal(true, 'Debe confirmar el corte de la terminal bancaria'),

  notes: z
    .string()
    .trim()
    .optional()
    .default(''),
});

export const getCloseShiftSchema = (hasDifference: boolean) => {
  if (!hasDifference) return closeShiftSchema;

  return closeShiftSchema.superRefine((data, ctx) => {
    if (!data.notes || data.notes.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La nota es obligatoria cuando existe una diferencia en el corte',
        path: ['notes'],
      });
    }
  });
};

export type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;
