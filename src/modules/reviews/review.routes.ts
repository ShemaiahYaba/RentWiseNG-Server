import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { reviewController } from './review.controller.js';
import { createReviewSchema } from './review.schema.js';

export const reviewRouter = Router();

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Submit a review (requires completed payment)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
reviewRouter.post('/', authenticate, validate(createReviewSchema), reviewController.create);

/**
 * @swagger
 * /reviews/listing/{id}:
 *   get:
 *     summary: List reviews for a listing
 *     tags: [Reviews]
 *     responses:
 *       501:
 *         description: Phase 2
 */
reviewRouter.get('/listing/:id', reviewController.listByListing);
