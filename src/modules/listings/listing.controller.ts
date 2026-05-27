import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '@/lib/routeParams.js';
import { created, ok } from '@/lib/response.js';
import type { ListingSearchInput } from './listing.schema.js';
import { listingService } from './listing.service.js';

export const listingController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await listingService.search(req.query as ListingSearchInput);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await listingService.getById(
        routeParam(req.params.id),
        req.user?.id,
        req.user?.role,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await listingService.create(req.user!.id, req.user!.role, req.body);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await listingService.update(
        req.user!.id,
        routeParam(req.params.id),
        req.body,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listingService.remove(req.user!.id, routeParam(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
