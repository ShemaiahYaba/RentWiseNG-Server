import { z } from 'zod';

export const bookInspectionSchema = z.object({
  listingId: z.string().uuid(),
  scheduledDate: z.string().date(),
  scheduledTime: z.string(),
});

export const updateInspectionStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
});
