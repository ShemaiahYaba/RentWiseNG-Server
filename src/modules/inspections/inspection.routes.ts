import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
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
 *     responses:
 *       501:
 *         description: Phase 2
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
 *     summary: List inspections for current user
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
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
 *     responses:
 *       501:
 *         description: Phase 2
 */
inspectionRouter.get('/:id', authenticate, inspectionController.getById);

/**
 * @swagger
 * /inspections/{id}/status:
 *   patch:
 *     summary: Update inspection status
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
inspectionRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('agent', 'landlord'),
  validate(updateInspectionStatusSchema),
  inspectionController.updateStatus,
);
