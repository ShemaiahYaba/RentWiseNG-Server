import type { NextFunction, Request, Response } from 'express';
import { ok } from '@/lib/response.js';
import { locationsService } from './locations.service.js';

export const locationsController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await locationsService.list();
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};

