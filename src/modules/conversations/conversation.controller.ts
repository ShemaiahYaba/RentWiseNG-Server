import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '@/lib/routeParams.js';
import { conversationService } from './conversation.service.js';
import { created, ok } from '@/lib/response.js';
import { messageQuerySchema } from './conversation.schema.js';

export const conversationController = {
  async list(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const conversations = await conversationService.list(req.user!.id);
      ok(_res, { conversations });
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const query = messageQuerySchema.parse(req.query);
      const result = await conversationService.getMessages(
        req.user!.id,
        routeParam(req.params.id),
        query,
      );

      ok(_res, { result });
    } catch (err) {
      next(err);
    }
  },

  async start(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversation, created: wasCreated } = await conversationService.start(
        req.user!.id,
        req.body,
      );

      if (wasCreated) {
        created(_res, { conversation });
        return;
      }

      ok(_res, { conversation });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await conversationService.sendMessage(
        req.user!.id,
        routeParam(req.params.id),
        req.body,
      );

      created(_res, { message });
    } catch (err) {
      next(err);
    }
  },
};
