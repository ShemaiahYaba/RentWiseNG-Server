import { Router, type Router as ExpressRouter } from 'express';
import { apartmentTypesController } from './apartmentTypes.controller.js';

export const apartmentTypesRouter: ExpressRouter = Router();

/**
 * @swagger
 * /apartment-types:
 *   get:
 *     summary: List all apartment types (seeded + active)
 *     tags: [ApartmentTypes]
 *     responses:
 *       200:
 *         description: Apartment types list
 */
apartmentTypesRouter.get('/', apartmentTypesController.list);

