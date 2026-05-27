import { AppError } from '@/lib/errors.js';
import { notImplemented } from '@/lib/notImplemented.js';
import { kycRepo } from '@/modules/kyc/kyc.repo.js';
import { listingRepo } from '@/modules/listings/listing.repo.js';
import { adminRepo } from './admin.repo.js';
import type { KycDecisionInput, VerificationStatusInput } from './admin.schema.js';

export const adminService = {
  async listingQueue() {
    const queue = await adminRepo.listPendingListings();
    return { queue };
  },

  async updateListingVerification(
    adminId: string,
    listingId: string,
    input: VerificationStatusInput,
  ) {
    const listing = await listingRepo.findById(listingId);
    if (!listing) {
      throw new AppError('listing not found', 404);
    }
    if (listing.verificationStatus !== 'pending') {
      throw new AppError('only pending listings can be reviewed', 409);
    }

    const updated = await adminRepo.updateListingVerification(
      adminId,
      listingId,
      input.status,
      input.note,
    );
    if (!updated) {
      throw new AppError('listing not found', 404);
    }

    const detail = await listingRepo.findById(listingId);
    return { listing: detail };
  },

  async kycQueue() {
    const queue = await adminRepo.listPendingKyc();
    return { queue };
  },

  async updateKyc(adminId: string, kycId: string, input: KycDecisionInput) {
    const submission = await kycRepo.findById(kycId);
    if (!submission) {
      throw new AppError('KYC submission not found', 404);
    }
    if (submission.status !== 'pending') {
      throw new AppError('only pending KYC submissions can be reviewed', 409);
    }
    if (input.status === 'rejected' && !input.rejectionReason?.trim()) {
      throw new AppError('rejectionReason is required when rejecting KYC', 422);
    }

    const submissionResult = await adminRepo.updateKycDecision(
      adminId,
      kycId,
      input.status,
      input.rejectionReason,
    );
    if (!submissionResult) {
      throw new AppError('KYC submission not found', 404);
    }

    return { submission: submissionResult };
  },

  async listReports() {
    notImplemented('admin.listReports');
  },
  async updateReportStatus(_adminId: string, _id: string, _status: string) {
    notImplemented('admin.updateReportStatus');
  },
  async listAuditLogs(_query: unknown) {
    notImplemented('admin.listAuditLogs');
  },
  async listConfig() {
    notImplemented('admin.listConfig');
  },
  async updateConfig(_adminId: string, _key: string, _value: string) {
    notImplemented('admin.updateConfig');
  },
};
