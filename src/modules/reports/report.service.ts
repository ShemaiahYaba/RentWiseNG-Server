import { AppError } from '@/lib/errors.js';
import type { CreateReportInput } from './report.schema.js';
import { reportRepo } from './report.repo.js';

export const reportService = {
  async create(_userId: string, _data: CreateReportInput) {
    if (_data.targetType === 'user' && _data.targetId === _userId) {
      throw new AppError('You cannot report yourself', 400);
    }

    const duplicate = await reportRepo.findDuplicate(_userId, _data.targetId, _data.targetType);
    if (duplicate) {
      throw new AppError('You have an open report on this target', 409);
    }

    const report = await reportRepo.create({ reporterId: _userId, ..._data });
    return report;
  },

  async listMine(_userId: string) {
    const reports = await reportRepo.listByReporter(_userId);
    return reports;
  },
};
