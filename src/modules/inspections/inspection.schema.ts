import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const bookInspectionSchema = z.object({
  listingId: z.string().uuid(),
  scheduledDate: z.string().date(),
  scheduledTime: z
    .string()
    .regex(timeRegex, 'scheduledTime must be HH:MM (24-hour)')
    .transform((value) => `${value}:00`),
});

export const updateInspectionStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
});

export type BookInspectionInput = z.infer<typeof bookInspectionSchema>;
export type UpdateInspectionStatusInput = z.infer<typeof updateInspectionStatusSchema>;
