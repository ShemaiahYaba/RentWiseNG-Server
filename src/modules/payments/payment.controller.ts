import type { NextFunction, Request, Response } from 'express';
import { paymentService } from './payment.service.js';

export const paymentController = {
  async initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentService.initiate(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      await paymentService.handleWebhook(req.body, signature);
    } catch (err) {
      next(err);
    }
  },
  async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentService.release(req.user!.id, req.params.id);
    } catch (err) {
      next(err);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentService.getById(req.user!.id, req.params.id);
    } catch (err) {
      next(err);
    }
  },
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentService.listMine(req.user!.id);
    } catch (err) {
      next(err);
    }
  },
};
