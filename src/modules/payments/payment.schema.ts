import { z } from 'zod';

const decimalAmount = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'amount must be a valid decimal');

export const initiatePaymentSchema = z.object({
  inspectionId: z.string().uuid(),
  amount: decimalAmount,
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
