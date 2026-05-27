import { AppError } from '@/lib/errors.js';
import { kycRepo } from './kyc.repo.js';
import type { SubmitKycInput } from './kyc.schema.js';

export const kycService = {
  async submit(_userId: string, _data: SubmitKycInput) {
    const existing = await kycRepo.findByUserId(_userId);
    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      throw new AppError(`KYC submission already ${existing.status}`, 409);
    }

    const submission = await kycRepo.createSubmission({ userId: _userId, ..._data });
    return submission;
  },

  async getMyStatus(_userId: string) {
    const submission = await kycRepo.findByUserId(_userId);
    if (!submission) {
      throw new AppError('No KYC submission found.', 404);
    }

    const { documentNumber: _, ...safeStatus } = submission;

    return safeStatus;
  },
};
