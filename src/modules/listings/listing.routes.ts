import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { listingController } from './listing.controller.js';
import {
  createListingSchema,
  listingSearchSchema,
  updateListingSchema,
} from './listing.schema.js';

export const listingRouter = Router();

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Search and filter listings (public)
 *     tags: [Listings]
 *     responses:
 *       501:
 *         description: Phase 2
 */
listingRouter.get('/', validate(listingSearchSchema, 'query'), listingController.search);

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: Get listing by ID (public)
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       501:
 *         description: Phase 2
 */
listingRouter.get('/:id', listingController.getById);

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
listingRouter.post(
  '/',
  authenticate,
  requireRole('agent', 'landlord'),
  validate(createListingSchema),
  listingController.create,
);

/**
 * @swagger
 * /listings/{id}:
 *   patch:
 *     summary: Update listing (owner only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
listingRouter.patch(
  '/:id',
  authenticate,
  requireRole('agent', 'landlord'),
  validate(updateListingSchema),
  listingController.update,
);

/**
 * @swagger
 * /listings/{id}:
 *   delete:
 *     summary: Soft delete listing (owner only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
listingRouter.delete(
  '/:id',
  authenticate,
  requireRole('agent', 'landlord'),
  listingController.remove,
);
