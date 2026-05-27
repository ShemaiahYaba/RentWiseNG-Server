import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { conversationController } from './conversation.controller.js';
import { startConversationSchema } from './conversation.schema.js';

export const conversationRouter: ExpressRouter = Router();

/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: List conversations for current user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
conversationRouter.get('/', authenticate, conversationController.list);

/**
 * @swagger
 * /conversations:
 *   post:
 *     summary: Start a conversation scoped to a listing
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
conversationRouter.post(
  '/',
  authenticate,
  validate(startConversationSchema),
  conversationController.start,
);

/**
 * @swagger
 * /conversations/{id}/messages:
 *   get:
 *     summary: Paginated message history
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Phase 2
 */
conversationRouter.get('/:id/messages', authenticate, conversationController.getMessages);
