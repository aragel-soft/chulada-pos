import { z } from 'zod';

export const closeShiftSchema = z.object({
  terminal_cut_confirmed: z.literal(true, 'Debe confirmar el corte de la terminal bancaria'),

  notes: z
    .string()
    .trim()
    .optional()
    .default(''),
});

export type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;
