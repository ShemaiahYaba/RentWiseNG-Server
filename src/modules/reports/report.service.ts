import { AppError } from '@/lib/errors.js';
import { authRepo } from '../auth/auth.repo.js';
import type { CreateReportInput } from './report.schema.js';
import { reportRepo } from './report.repo.js';

export const reportService = {
  async create(userId: string, data: CreateReportInput) {
    if (data.targetType === 'user' && data.targetId === userId) {
      throw new AppError('You cannot report yourself', 400);
    }

    if (data.targetType === 'user') {
      const user = await authRepo.findById(data.targetId);
      if (!user) {
        throw new AppError('user not found', 404);
      }
    } else {
      const exists = await reportRepo.existsListing(data.targetId);
      if (!exists) {
        throw new AppError('listing not found', 404);
      }
    }

    const duplicate = await reportRepo.findDuplicate(userId, data.targetId, data.targetType);
    if (duplicate) {
      throw new AppError('You have an open report on this target', 409);
    }

    const report = await reportRepo.create({ reporterId: userId, ...data });
    return report;
  },

  async listMine(userId: string) {
    const reports = await reportRepo.listByReporter(userId);
    return reports;
  },
};
