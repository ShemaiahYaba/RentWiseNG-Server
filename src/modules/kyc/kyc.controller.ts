import type { NextFunction, Request, Response } from 'express';
import { kycService } from './kyc.service.js';

export const kycController = {
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await kycService.submit(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await kycService.getMyStatus(req.user!.id);
    } catch (err) {
      next(err);
    }
  },
};
