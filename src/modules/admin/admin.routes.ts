import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { adminController } from './admin.controller.js';
import {
  configUpdateSchema,
  kycDecisionSchema,
  reportStatusSchema,
  verificationStatusSchema,
} from './admin.schema.js';

export const adminRouter: Router = Router();

adminRouter.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * /admin/verification-queue/listings:
 *   get:
 *     summary: Pending listing verification queue
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending listings queue
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
adminRouter.get('/verification-queue/listings', adminController.listingQueue);

/**
 * @swagger
 * /admin/verification-queue/listings/{id}:
 *   patch:
 *     summary: Update listing verification status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Listing verification updated
 *       404:
 *         description: Listing not found
 *       409:
 *         description: Listing not pending
 *       422:
 *         description: Validation error
 */
adminRouter.patch(
  '/verification-queue/listings/:id',
  validate(verificationStatusSchema),
  adminController.updateListing,
);

/**
 * @swagger
 * /admin/verification-queue/kyc:
 *   get:
 *     summary: Pending KYC queue
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending KYC queue
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
adminRouter.get('/verification-queue/kyc', adminController.kycQueue);

/**
 * @swagger
 * /admin/verification-queue/kyc/{id}:
 *   patch:
 *     summary: Approve or reject KYC
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: KYC decision recorded
 *       404:
 *         description: Submission not found
 *       409:
 *         description: Submission not pending
 *       422:
 *         description: Validation error (e.g. missing rejectionReason)
 */
adminRouter.patch(
  '/verification-queue/kyc/:id',
  validate(kycDecisionSchema),
  adminController.updateKyc,
);

/**
 * @swagger
 * /admin/reports:
 *   get:
 *     summary: List open and under-review reports
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Moderation queue with reporter and target context
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
adminRouter.get('/reports', adminController.listReports);

/**
 * @swagger
 * /admin/reports/{id}/status:
 *   patch:
 *     summary: Update report status
 *     tags: [Admin]
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
 *                 enum: [under_review, resolved, dismissed]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report status updated
 *       404:
 *         description: Report not found
 *       409:
 *         description: Invalid status transition
 *       422:
 *         description: Validation error
 */
adminRouter.patch(
  '/reports/:id/status',
  validate(reportStatusSchema),
  adminController.updateReport,
);

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Full unscoped audit log
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
adminRouter.get('/audit-logs', adminController.listAuditLogs);

/**
 * @swagger
 * /admin/config:
 *   get:
 *     summary: List system config entries
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All system_config rows (key, value, description, updatedAt)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
adminRouter.get('/config', adminController.listConfig);

/**
 * @swagger
 * /admin/config/{key}:
 *   patch:
 *     summary: Update system config value
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: Config entry updated
 *       404:
 *         description: Config key not found
 *       422:
 *         description: Validation error
 */
adminRouter.patch('/config/:key', validate(configUpdateSchema), adminController.updateConfig);
