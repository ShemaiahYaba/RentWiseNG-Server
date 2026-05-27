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
 *         description: Report filed successfully
 *       400:
 *         description: Validation error or self-report attempt
 *       401:
 *         description: Missing or invalid bearer token
 *       409:
 *         description: An open report already exists for this target
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
 *         description: List of reports returned successfully
 *       401:
 *         description: Missing or invalid bearer token
 */
reportRouter.get('/me', authenticate, reportController.listMine);
