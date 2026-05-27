import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '@/lib/routeParams.js';
import { inspectionService } from './inspection.service.js';

export const inspectionController = {
  async book(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.book(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async getById(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.getById(req.user!.id, routeParam(req.params.id));
    } catch (err) {
      next(err);
    }
  },
  async updateStatus(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.updateStatus(req.user!.id, routeParam(req.params.id), req.body.status);
    } catch (err) {
      next(err);
    }
  },
  async listMine(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.listMine(req.user!.id);
    } catch (err) {
      next(err);
    }
  },
};
