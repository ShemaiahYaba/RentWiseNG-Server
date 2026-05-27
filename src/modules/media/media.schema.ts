import { z } from 'zod';

export const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
  purpose: z.enum(['listing_photo', 'ownership_doc', 'kyc_document']),
});

export type PresignInput = z.infer<typeof presignSchema>;
