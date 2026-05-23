import { z } from 'zod';

export const updateMeSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  phone: z.string().min(7).max(32).optional(),
});
