import { Router } from 'express';
import { validate } from '@/lib/validate.js';
import { authenticate } from '@/middleware/authenticate.js';
import { requireRole } from '@/middleware/requireRole.js';
import { mediaController } from './media.controller.js';
import { presignSchema } from './media.schema.js';

export const mediaRouter: Router = Router();

/**
 * @swagger
 * /media/presign:
 *   post:
 *     summary: Get a presigned URL for R2 upload
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filename, contentType, purpose]
 *             properties:
 *               filename: { type: string }
 *               contentType: { type: string }
 *               purpose:
 *                 type: string
 *                 enum: [listing_photo, ownership_doc, kyc_document]
 *     responses:
 *       200:
 *         description: Presigned upload URL
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Validation error
 *       503:
 *         description: R2 not configured
 */
mediaRouter.post(
  '/presign',
  authenticate,
  requireRole('agent', 'landlord', 'admin'),
  validate(presignSchema),
  mediaController.presign,
);
