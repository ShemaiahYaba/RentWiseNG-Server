import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { authController } from './auth.controller.js';
import {
  googleOAuthSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
} from './auth.schema.js';

export const authRouter = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, fullName, email, phone, password]
 *             properties:
 *               role: { type: string, enum: [tenant, agent, landlord] }
 *               fullName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: User created; OTPs dispatched
 *       409:
 *         description: Email or phone already registered
 *       422:
 *         description: Validation error
 */
authRouter.post('/register', authRateLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Access and refresh tokens issued
 *       401:
 *         description: Invalid credentials
 *       422:
 *         description: Validation error
 */
authRouter.post('/login', authRateLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Session revoked
 *       422:
 *         description: Validation error
 */
authRouter.post('/logout', authRateLimiter, validate(logoutSchema), authController.logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Rotate refresh token and issue new token pair
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 *       422:
 *         description: Validation error
 */
authRouter.post(
  '/refresh-token',
  authRateLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken,
);

/**
 * @swagger
 * /auth/verify-phone:
 *   post:
 *     summary: Verify phone OTP
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200:
 *         description: Phone verified
 *       400:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
authRouter.post(
  '/verify-phone',
  authRateLimiter,
  authenticate,
  validate(verifyPhoneSchema),
  authController.verifyPhone,
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email OTP
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
authRouter.post(
  '/verify-email',
  authRateLimiter,
  authenticate,
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

/**
 * @swagger
 * /auth/oauth/google:
 *   post:
 *     summary: Sign in or register via Google OAuth ID token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *               role: { type: string, enum: [tenant, agent, landlord] }
 *     responses:
 *       200:
 *         description: Tokens issued
 *       401:
 *         description: Invalid Google token
 *       503:
 *         description: Google OAuth not configured
 *       422:
 *         description: Validation error
 */
authRouter.post(
  '/oauth/google',
  authRateLimiter,
  validate(googleOAuthSchema),
  authController.googleOAuth,
);
