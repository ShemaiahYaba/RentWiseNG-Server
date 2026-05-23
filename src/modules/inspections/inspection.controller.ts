import type { NextFunction, Request, Response } from 'express';
import { inspectionService } from './inspection.service.js';

export const inspectionController = {
  async book(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.book(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.getById(req.user!.id, req.params.id);
    } catch (err) {
      next(err);
    }
  },
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.updateStatus(req.user!.id, req.params.id, req.body.status);
    } catch (err) {
      next(err);
    }
  },
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await inspectionService.listMine(req.user!.id);
    } catch (err) {
      next(err);
    }
  },
};
