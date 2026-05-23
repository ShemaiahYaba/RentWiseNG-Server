import type { NextFunction, Request, Response } from 'express';
import { auditLogService } from './auditLog.service.js';

export const auditLogController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await auditLogService.list(req.user!.id, req.user!.role, req.query);
    } catch (err) {
      next(err);
    }
  },
};
