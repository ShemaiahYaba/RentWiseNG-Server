import type { NextFunction, Request, Response } from 'express';
import { created, ok } from '@/lib/response.js';
import { routeParam } from '@/lib/routeParams.js';
import { reviewService } from './review.service.js';

export const reviewController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.create(req.user!.id, req.body);
      created(res, { review });
    } catch (err) {
      next(err);
    }
  },

  async listByListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviews = await reviewService.listByListing(routeParam(req.params.id));
      ok(res, { reviews });
    } catch (err) {
      next(err);
    }
  },
};
