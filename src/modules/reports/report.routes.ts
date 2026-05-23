import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { reportController } from './report.controller.js';
import { createReportSchema } from './report.schema.js';

export const reportRouter = Router();

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: File a report on a listing or user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
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
 *       501:
 *         description: Phase 2
 */
reportRouter.get('/me', authenticate, reportController.listMine);
