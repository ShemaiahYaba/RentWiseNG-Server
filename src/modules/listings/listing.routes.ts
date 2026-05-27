import { Router } from 'express';
import { validate } from '@/lib/validate.js';
import { authenticate } from '@/middleware/authenticate.js';
import { optionalAuthenticate } from '@/middleware/optionalAuthenticate.js';
import { requireRole } from '@/middleware/requireRole.js';
import { listingController } from './listing.controller.js';
import {
  createListingSchema,
  listingSearchSchema,
  updateListingSchema,
} from './listing.schema.js';

export const listingRouter: Router = Router();

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Search verified listings (public)
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: apartmentTypeId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: minRent
 *         schema: { type: string }
 *       - in: query
 *         name: maxRent
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *     responses:
 *       200:
 *         description: Paginated listing search results
 *       422:
 *         description: Validation error
 */
listingRouter.get('/', validate(listingSearchSchema, 'query'), listingController.search);

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: Get listing by ID (public if verified; owners see own pending listings)
 *     tags: [Listings]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Listing detail
 *       404:
 *         description: Not found
 */
listingRouter.get('/:id', optionalAuthenticate, listingController.getById);

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create listing (agent or landlord)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Listing created (pending verification)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: KYC not approved
 *       404:
 *         description: Location or apartment type not found
 *       409:
 *         description: Agent listing cap reached
 *       422:
 *         description: Validation error
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Listing updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       422:
 *         description: Validation error
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
listingRouter.delete(
  '/:id',
  authenticate,
  requireRole('agent', 'landlord'),
  listingController.remove,
);
