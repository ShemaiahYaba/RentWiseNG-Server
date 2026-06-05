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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - documentNumber
 *               - documentFrontUrl
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [nin, bvn, passport, drivers_licence]
 *               documentNumber:
 *                 type: string
 *               documentFrontUrl:
 *                 type: string
 *                 format: uri
 *               documentBackUrl:
 *                 type: string
 *                 format: uri
 *               selfieUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Created; data.submission (documentNumber omitted)
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: "Forbidden: only agents and landlords can submit KYC"
 *       409:
 *         description: KYC submission already pending or approved
 *       422:
 *         description: Validation error
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
 *       200:
 *         description: Success; data.submission (documentNumber omitted)
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: No KYC submission found for this user
 */
kycRouter.get('/me', authenticate, kycController.getMe);
