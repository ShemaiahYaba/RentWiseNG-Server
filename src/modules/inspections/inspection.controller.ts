import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '@/lib/routeParams.js';
import { created, ok } from '@/lib/response.js';
import type { BookInspectionInput } from './inspection.schema.js';
import { inspectionService } from './inspection.service.js';

export const inspectionController = {
  async book(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inspectionService.book(req.user!.id, req.body as BookInspectionInput);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inspectionService.getById(
        req.user!.id,
        req.user!.role,
        routeParam(req.params.id),
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inspectionService.updateStatus(
        req.user!.id,
        routeParam(req.params.id),
        req.body.status,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inspectionService.listMine(req.user!.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
