import { z } from 'zod';

export const verificationStatusSchema = z.object({
  status: z.enum(['verified', 'limited', 'rejected']),
  note: z.string().optional(),
});

export const kycDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
});

export const reportStatusSchema = z.object({
  status: z.enum(['under_review', 'resolved', 'dismissed']),
  note: z.string().optional(),
});

export const configUpdateSchema = z.object({
  value: z.string().min(1),
});

export type VerificationStatusInput = z.infer<typeof verificationStatusSchema>;
export type KycDecisionInput = z.infer<typeof kycDecisionSchema>;
export type ReportStatusInput = z.infer<typeof reportStatusSchema>;
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>;
