import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { kycController } from './kyc.controller.js';
import { submitKycSchema } from './kyc.schema.js';

export const kycRouter: Router = Router();

/**
 * @swagger
 * /kyc:
 *   post:
 *     summary: Submit KYC documents
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       403:
 *         description: Forbidden
 */
kycRouter.post(
  '/',
  authenticate,
  requireRole('agent', 'landlord'),
  validate(submitKycSchema),
  kycController.submit,
);

/**
 * @swagger
 * /kyc/me:
 *   get:
 *     summary: View own KYC status
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 *       404:
 *         description: submission not found
 */
kycRouter.get('/me', authenticate, kycController.getMe);
