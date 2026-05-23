import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['listing', 'user']),
  targetId: z.string().uuid(),
  reason: z.string().min(1),
});
