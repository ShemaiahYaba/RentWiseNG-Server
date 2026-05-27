import type { NextFunction, Request, Response } from 'express';
import { ok } from '@/lib/response.js';
import { mediaService } from './media.service.js';

export const mediaController = {
  async presign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await mediaService.presign(req.user!.id, req.body);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
