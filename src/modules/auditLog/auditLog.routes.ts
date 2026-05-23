import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { auditLogController } from './auditLog.controller.js';
import { auditLogQuerySchema } from './auditLog.schema.js';

export const auditLogRouter = Router();

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: List audit logs scoped to current user role
 *     tags: [AuditLog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
auditLogRouter.get(
  '/',
  authenticate,
  validate(auditLogQuerySchema, 'query'),
  auditLogController.list,
);
