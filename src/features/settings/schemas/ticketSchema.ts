import z from "zod";

// Updated schema covering both sets of properties
export const ticketSettingsSchema = z.object({
  // Business Settings
  ticketHeader: z.string().optional(),
  ticketFooter: z.string().optional(),
  logoPath: z.string().optional(),

  // Hardware Settings (Paper)
  printerWidth: z.enum(["58", "80"]),
  paddingLines: z.number().min(0).max(20).optional(),
});