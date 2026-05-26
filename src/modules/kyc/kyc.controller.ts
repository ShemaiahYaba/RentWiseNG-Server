import type { NextFunction, Request, Response } from 'express';
import { kycService } from './kyc.service.js';
import { ok } from '@/lib/response.js';

export const kycController = {
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submission = await kycService.submit(req.user!.id, req.body);
      ok(res, { submission });
    } catch (err) {
      next(err);
    }
  },
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await kycService.getMyStatus(req.user!.id);
      ok(res, { status });
    } catch (err) {
      next(err);
    }
  },
};
