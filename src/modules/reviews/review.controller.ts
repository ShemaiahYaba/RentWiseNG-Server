import type { NextFunction, Request, Response } from 'express';
import { reviewService } from './review.service.js';

export const reviewController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.create(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async listByListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.listByListing(req.params.id);
    } catch (err) {
      next(err);
    }
  },
};
