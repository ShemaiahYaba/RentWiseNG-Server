import type { NextFunction, Request, Response } from 'express';
import { isPaystackConfigured } from '@/config/paystack.js';
import { routeParam } from '@/lib/routeParams.js';
import { created, fail, ok } from '@/lib/response.js';
import type { InitiatePaymentInput } from './payment.schema.js';
import { paymentService } from './payment.service.js';

export const paymentController = {
  async initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!isPaystackConfigured()) {
        fail(res, 'payments are not configured (missing Paystack environment variables)', 503);
        return;
      }
      const result = await paymentService.initiate(
        req.user!.id,
        req.body as InitiatePaymentInput,
      );
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!isPaystackConfigured()) {
        fail(res, 'payments are not configured (missing Paystack environment variables)', 503);
        return;
      }
      const signature = req.headers['x-paystack-signature'] as string | undefined;
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      const result = await paymentService.handleWebhook(rawBody, signature);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.release(req.user!.id, routeParam(req.params.id));
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.getById(
        req.user!.id,
        req.user!.role,
        routeParam(req.params.id),
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.listMine(req.user!.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
