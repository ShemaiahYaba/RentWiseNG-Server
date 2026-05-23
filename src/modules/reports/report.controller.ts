import type { NextFunction, Request, Response } from 'express';
import { reportService } from './report.service.js';

export const reportController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reportService.create(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reportService.listMine(req.user!.id);
    } catch (err) {
      next(err);
    }
  },
};
