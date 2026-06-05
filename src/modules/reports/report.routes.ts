import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { reportController } from './report.controller.js';
import { createReportSchema } from './report.schema.js';

export const reportRouter: Router = Router();

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: File a report on a listing or user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetType
 *               - targetId
 *               - reason
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [listing, user]
 *               targetId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       201:
 *         description: Created; data.report (status open)
 *       400:
 *         description: Self-report attempt
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: Target user or listing not found
 *       409:
 *         description: An open report already exists for this target
 *       422:
 *         description: Validation error
 */
reportRouter.post('/', authenticate, validate(createReportSchema), reportController.create);

/**
 * @swagger
 * /reports/me:
 *   get:
 *     summary: List reports filed by current user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success; data.reports (current user only)
 *       401:
 *         description: Missing or invalid bearer token
 */
reportRouter.get('/me', authenticate, reportController.listMine);
