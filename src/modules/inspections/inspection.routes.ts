import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '@/lib/validate.js';
import { authenticate } from '@/middleware/authenticate.js';
import { requireRole } from '@/middleware/requireRole.js';
import { inspectionController } from './inspection.controller.js';
import { bookInspectionSchema, updateInspectionStatusSchema } from './inspection.schema.js';

export const inspectionRouter: ExpressRouter = Router();

/**
 * @swagger
 * /inspections:
 *   post:
 *     summary: Book an inspection (tenant)
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, scheduledDate, scheduledTime]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *               scheduledDate: { type: string, format: date }
 *               scheduledTime: { type: string, example: "14:30", description: "HH:MM 24-hour" }
 *     responses:
 *       201:
 *         description: Inspection booked (status pending)
 *       403:
 *         description: Forbidden (non-tenant)
 *       404:
 *         description: Listing not found or not verified
 *       409:
 *         description: Active inspection already exists for this listing
 *       422:
 *         description: Validation error or date too soon
 */
inspectionRouter.post(
  '/',
  authenticate,
  requireRole('tenant'),
  validate(bookInspectionSchema),
  inspectionController.book,
);

/**
 * @swagger
 * /inspections/me:
 *   get:
 *     summary: List inspections for current user (tenant bookings or owned listings)
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inspection list
 */
inspectionRouter.get('/me', authenticate, inspectionController.listMine);

/**
 * @swagger
 * /inspections/{id}:
 *   get:
 *     summary: Get inspection by ID
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Inspection detail
 *       404:
 *         description: Not found or no access
 */
inspectionRouter.get('/:id', authenticate, inspectionController.getById);

/**
 * @swagger
 * /inspections/{id}/status:
 *   patch:
 *     summary: Update inspection status (listing owner)
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: Updated inspection
 *       403:
 *         description: Not the listing owner
 *       404:
 *         description: Inspection not found
 *       422:
 *         description: Invalid status transition
 */
inspectionRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('agent', 'landlord'),
  validate(updateInspectionStatusSchema),
  inspectionController.updateStatus,
);
