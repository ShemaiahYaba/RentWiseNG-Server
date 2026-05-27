import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['listing', 'user']),
  targetId: z.string().uuid(),
  reason: z.string().min(10, 'reason must be at least 10 characters.'),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
