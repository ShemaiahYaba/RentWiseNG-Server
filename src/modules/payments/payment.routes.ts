import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '@/lib/validate.js';
import { authenticate } from '@/middleware/authenticate.js';
import { requireRole } from '@/middleware/requireRole.js';
import { paymentController } from './payment.controller.js';
import { initiatePaymentSchema } from './payment.schema.js';

export const paymentRouter: ExpressRouter = Router();

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate payment (tenant)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inspectionId, amount]
 *             properties:
 *               inspectionId: { type: string, format: uuid }
 *               amount:
 *                 type: string
 *                 example: "2500000.00"
 *                 description: Must match listing rentAmount
 *     responses:
 *       201:
 *         description: Payment initiated with Paystack checkout URL
 *       403:
 *         description: Not the inspection tenant
 *       404:
 *         description: Inspection or listing not found
 *       409:
 *         description: Active payment already exists for inspection
 *       422:
 *         description: Inspection not completed or amount mismatch
 *       503:
 *         description: Paystack not configured
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
 * /payments/{id}/release:
 *   post:
 *     summary: Release payment after satisfaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment released
 *       403:
 *         description: Not the tenant
 *       404:
 *         description: Payment not found
 *       422:
 *         description: Payment not in held status
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
 *     summary: List payments for current user (tenant bookings or owned listings)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment list
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment detail
 *       404:
 *         description: Not found or no access
 */
paymentRouter.get('/:id', authenticate, paymentController.getById);
