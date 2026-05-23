import { z } from 'zod';

export const createReviewSchema = z.object({
  listingId: z.string().uuid(),
  paymentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});
