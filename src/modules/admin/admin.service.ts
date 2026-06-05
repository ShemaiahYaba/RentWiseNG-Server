import { AppError } from '@/lib/errors.js';
import { notImplemented } from '@/lib/notImplemented.js';
import { kycRepo } from '@/modules/kyc/kyc.repo.js';
import { listingRepo } from '@/modules/listings/listing.repo.js';
import { adminRepo } from './admin.repo.js';
import type {
  ConfigUpdateInput,
  KycDecisionInput,
  ReportStatusInput,
  VerificationStatusInput,
} from './admin.schema.js';

const REPORT_TRANSITIONS: Record<string, string[]> = {
  open: ['under_review'],
  under_review: ['resolved', 'dismissed'],
};

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
    const queue = await adminRepo.listModerationQueue();
    return { queue };
  },

  async updateReportStatus(adminId: string, reportId: string, input: ReportStatusInput) {
    const report = await adminRepo.findReportById(reportId);
    if (!report) {
      throw new AppError('report not found', 404);
    }

    const allowed = REPORT_TRANSITIONS[report.status];
    if (!allowed?.includes(input.status)) {
      throw new AppError(
        `invalid status transition from ${report.status} to ${input.status}`,
        409,
      );
    }

    const updated = await adminRepo.updateReportStatus(
      adminId,
      reportId,
      input.status,
      input.note,
    );
    if (!updated) {
      throw new AppError('report not found', 404);
    }

    return { report: updated };
  },

  async listAuditLogs(_query: unknown) {
    notImplemented('admin.listAuditLogs');
  },

  async listConfig() {
    const config = await adminRepo.listSystemConfig();
    return { config };
  },

  async updateConfig(adminId: string, key: string, input: ConfigUpdateInput) {
    const existing = await adminRepo.findConfigByKey(key);
    if (!existing) {
      throw new AppError('config key not found', 404);
    }

    const entry = await adminRepo.updateSystemConfig(adminId, key, input.value);
    if (!entry) {
      throw new AppError('config key not found', 404);
    }

    return { config: entry };
  },
};
