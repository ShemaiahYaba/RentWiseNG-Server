import { Router, type Router as ExpressRouter } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { conversationController } from './conversation.controller.js';
import { sendMessageSchema, startConversationSchema } from './conversation.schema.js';

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
 *       200:
 *         description: Conversations returned successfully
 *       401:
 *         description: Missing or invalid bearer token
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - participantId
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       200:
 *         description: Existing conversation returned (idempotent)
 *       400:
 *         description: Validation error or self-conversation attempt
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: Listing not found
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
 *       200:
 *         description: Messages returned successfully
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: You are not a participant in this conversation
 *       404:
 *         description: Conversation not found
 */
conversationRouter.get('/:id/messages', authenticate, conversationController.getMessages);

/**
 * @swagger
 * /conversations/{id}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error — empty message content
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: You are not a participant in this conversation
 *       404:
 *         description: Conversation not found
 */
conversationRouter.post(
  '/:id/messages',
  authenticate,
  validate(sendMessageSchema),
  conversationController.sendMessage,
);
