import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { userController } from './user.controller.js';
import { updateMeSchema } from './user.schema.js';

export const userRouter: Router = Router();

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
 *         description: Current user profile returned successfully
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: User not found
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
 *         description: Profile updated successfully
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: User not found
 *       409:
 *         description: Phone number already in use by another account
 *       422:
 *         description: Validation error
 */
userRouter.patch('/me', authenticate, validate(updateMeSchema), userController.updateMe);
