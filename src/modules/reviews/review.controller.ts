import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '@/lib/routeParams.js';
import { reviewService } from './review.service.js';

export const reviewController = {
  async create(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.create(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async listByListing(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.listByListing(routeParam(req.params.id));
    } catch (err) {
      next(err);
    }
  },
};
