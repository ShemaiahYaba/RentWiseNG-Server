import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  inspectionId: z.string().uuid(),
  amount: z.string(),
});
