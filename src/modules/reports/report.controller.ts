import type { NextFunction, Request, Response } from 'express';
import { reportService } from './report.service.js';
import { created, ok } from '@/lib/response.js';

export const reportController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.create(req.user!.id, req.body);
      created(res, { report });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await reportService.listMine(req.user!.id);
      ok(res, { reports });
    } catch (err) {
      next(err);
    }
  },
};
