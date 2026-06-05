import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { auditLogController } from './auditLog.controller.js';
import { auditLogQuerySchema } from './auditLog.schema.js';

export const auditLogRouter: ExpressRouter = Router();

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: List audit logs scoped to current user role
 *     tags: [AuditLog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: entityId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Scoped audit log entries with pagination
 *       401:
 *         description: Unauthorized
 */
auditLogRouter.get(
  '/',
  authenticate,
  validate(auditLogQuerySchema, 'query'),
  auditLogController.list,
);
