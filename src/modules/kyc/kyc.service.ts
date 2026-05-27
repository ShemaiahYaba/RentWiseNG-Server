import { AppError } from '@/lib/errors.js';
import { kycRepo } from './kyc.repo.js';
import type { SubmitKycInput } from './kyc.schema.js';

function sanitizeSubmission(submission: Awaited<ReturnType<typeof kycRepo.createSubmission>>) {
  const { documentNumber: _, ...safe } = submission;
  return safe;
}

export const kycService = {
  async submit(userId: string, data: SubmitKycInput) {
    const existing = await kycRepo.findByUserId(userId);
    if (existing) {
      if (existing.status === 'pending' || existing.status === 'approved') {
        throw new AppError(`KYC submission already ${existing.status}`, 409);
      }
      if (existing.status === 'rejected') {
        await kycRepo.softDeleteSubmission(existing.id, userId);
      }
    }

    const submission = await kycRepo.createSubmission({ userId, ...data });
    return sanitizeSubmission(submission);
  },

  async getMyStatus(userId: string) {
    const submission = await kycRepo.findByUserId(userId);
    if (!submission) {
      throw new AppError('No KYC submission found.', 404);
    }

    return sanitizeSubmission(submission);
  },
};
