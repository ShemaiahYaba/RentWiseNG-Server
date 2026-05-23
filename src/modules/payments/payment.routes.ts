import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { paymentController } from './payment.controller.js';
import { initiatePaymentSchema } from './payment.schema.js';

export const paymentRouter = Router();

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate payment (tenant)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
paymentRouter.post(
  '/initiate',
  authenticate,
  requireRole('tenant'),
  validate(initiatePaymentSchema),
  paymentController.initiate,
);

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Paystack webhook (HMAC verified)
 *     tags: [Payments]
 *     responses:
 *       501:
 *         description: Phase 2
 */
paymentRouter.post('/webhook', paymentController.webhook);

/**
 * @swagger
 * /payments/{id}/release:
 *   post:
 *     summary: Release payment after satisfaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
paymentRouter.post(
  '/:id/release',
  authenticate,
  requireRole('tenant'),
  paymentController.release,
);

/**
 * @swagger
 * /payments/me:
 *   get:
 *     summary: List payments for current user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
paymentRouter.get('/me', authenticate, paymentController.listMine);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
paymentRouter.get('/:id', authenticate, paymentController.getById);
