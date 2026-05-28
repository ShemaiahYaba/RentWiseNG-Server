import type { NextFunction, Request, Response } from 'express';
import { isR2Configured } from '@/config/r2.js';
import { fail, ok } from '@/lib/response.js';
import { mediaService } from './media.service.js';

export const mediaController = {
  async presign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!isR2Configured()) {
        fail(res, 'file upload is not configured (missing R2 environment variables)', 503);
        return;
      }
      const result = await mediaService.presign(req.user!.id, req.body);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
