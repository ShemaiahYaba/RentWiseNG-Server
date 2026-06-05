import type { NextFunction, Request, Response } from 'express';
import { ok } from '@/lib/response.js';
import type { AuditLogQuery } from './auditLog.types.js';
import { auditLogService } from './auditLog.service.js';

export const auditLogController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await auditLogService.list(
        req.user!.id,
        req.user!.role,
        req.query as unknown as AuditLogQuery,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
