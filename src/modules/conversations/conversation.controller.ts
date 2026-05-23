import type { NextFunction, Request, Response } from 'express';
import { conversationService } from './conversation.service.js';

export const conversationController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await conversationService.list(req.user!.id);
    } catch (err) {
      next(err);
    }
  },
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await conversationService.getMessages(req.user!.id, req.params.id);
    } catch (err) {
      next(err);
    }
  },
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await conversationService.start(req.user!.id, req.body);
    } catch (err) {
      next(err);
    }
  },
};
