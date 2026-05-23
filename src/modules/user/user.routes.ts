import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { userController } from './user.controller.js';
import { updateMeSchema } from './user.schema.js';

export const userRouter = Router();

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Unauthorized
 */
userRouter.get('/me', authenticate, userController.getMe);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Updated user
 *       401:
 *         description: Unauthorized
 *       501:
 *         description: Not implemented (Phase 2)
 */
userRouter.patch('/me', authenticate, validate(updateMeSchema), userController.updateMe);
