import type { NextFunction, Request, Response } from 'express';
import { kycService } from './kyc.service.js';
import { ok, created } from '@/lib/response.js';

export const kycController = {
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submission = await kycService.submit(req.user!.id, req.user!.role, req.body);
      created(res, { submission });
    } catch (err) {
      next(err);
    }
  },
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submission = await kycService.getMyStatus(req.user!.id);
      ok(res, { submission });
    } catch (err) {
      next(err);
    }
  },
};
