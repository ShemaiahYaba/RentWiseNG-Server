import { Router, type Router as ExpressRouter } from 'express';
import { paymentController } from './payment.controller.js';

export const paymentWebhookRouter: ExpressRouter = Router();

paymentWebhookRouter.post('/', paymentController.webhook);
