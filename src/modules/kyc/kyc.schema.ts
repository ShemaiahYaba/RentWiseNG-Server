import { z } from 'zod';

export const submitKycSchema = z.object({
  documentType: z.enum(['nin', 'bvn', 'passport', 'drivers_licence']),
  documentNumber: z.string().min(1),
  documentFrontUrl: z.string().url(),
  documentBackUrl: z.string().url().optional(),
  selfieUrl: z.string().url().optional(),
});
