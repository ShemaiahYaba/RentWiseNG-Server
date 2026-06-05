import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { reviewController } from './review.controller.js';
import { createReviewSchema } from './review.schema.js';

export const reviewRouter: ExpressRouter = Router();

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Submit a review (requires released payment)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - paymentId
 *               - rating
 *             properties:
 *               listingId:
 *                 type: string
 *                 format: uuid
 *               paymentId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Created; data.review
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Only the tenant who made the payment can submit a review
 *       404:
 *         description: Payment or listing not found
 *       409:
 *         description: A review already exists for this payment
 *       422:
 *         description: Payment not released or listing mismatch
 */
reviewRouter.post('/', authenticate, validate(createReviewSchema), reviewController.create);

/**
 * @swagger
 * /reviews/listing/{id}:
 *   get:
 *     summary: List reviews for a listing
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Success; data.reviews with reviewer summary
 *       404:
 *         description: Listing not found
 */
reviewRouter.get('/listing/:id', reviewController.listByListing);
