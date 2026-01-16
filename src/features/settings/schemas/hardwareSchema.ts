import { z } from "zod"

export const hardwareFormSchema = z.object({
  terminalId: z.string().min(1, "El ID de la terminal es requerido"),
  printerName: z.string().min(1, "Seleccione una impresora"),
  cashDrawerCommand: z.string().min(1, "El comando es requerido"),
  cashDrawerPort: z.string().optional(),
})