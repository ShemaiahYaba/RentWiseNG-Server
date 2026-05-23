import type { NextFunction, Request, Response } from 'express';
import { ok } from '../../lib/response.js';
import { userService } from './user.service.js';

export const userController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getMe(req.user!.id);
      ok(res, { user });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateMe(req.user!.id, req.body);
      ok(res, { user });
    } catch (err) {
      next(err);
    }
  },
};
