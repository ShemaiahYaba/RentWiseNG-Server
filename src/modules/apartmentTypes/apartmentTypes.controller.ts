import type { NextFunction, Request, Response } from 'express';
import { ok } from '@/lib/response.js';
import { apartmentTypesService } from './apartmentTypes.service.js';

export const apartmentTypesController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await apartmentTypesService.list();
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};

