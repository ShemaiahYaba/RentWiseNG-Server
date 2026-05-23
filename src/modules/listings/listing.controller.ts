import type { NextFunction, Request, Response } from 'express';
import { listingService } from './listing.service.js';

export const listingController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listingService.search(req.query);
    } catch (err) {
      next(err);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listingService.getById(req.params.id);
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listingService.create(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listingService.update(req.user!.id, req.params.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listingService.remove(req.user!.id, req.params.id);
    } catch (err) {
      next(err);
    }
  },
};
