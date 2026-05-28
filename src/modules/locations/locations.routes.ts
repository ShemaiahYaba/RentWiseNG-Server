import { Router, type Router as ExpressRouter } from 'express';
import { locationsController } from './locations.controller.js';

export const locationsRouter: ExpressRouter = Router();

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: List all locations (seeded + active)
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Locations list
 */
locationsRouter.get('/', locationsController.list);

