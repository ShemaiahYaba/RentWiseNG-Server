import type { Request, Response, NextFunction } from 'express';
import { created, ok } from '../../lib/response.js';
import { authService, requestMeta } from './auth.service.js';

function tokenResponse(res: Response, result: {
  user: unknown;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  sessionId?: string;
}) {
  return ok(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt: result.accessExpiresAt.toISOString(),
    refreshExpiresAt: result.refreshExpiresAt.toISOString(),
  });
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, requestMeta(req));
      created(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessExpiresAt: result.accessExpiresAt.toISOString(),
        refreshExpiresAt: result.refreshExpiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body, requestMeta(req));
      tokenResponse(res, result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.body.refreshToken);
      ok(res, null, 'logged out');
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refreshToken(req.body.refreshToken, requestMeta(req));
      tokenResponse(res, { user: null, ...result });
    } catch (err) {
      next(err);
    }
  },

  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.verifyPhone(req.user!.id, req.body.code);
      ok(res, { user });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.verifyEmail(req.user!.id, req.body.code);
      ok(res, { user });
    } catch (err) {
      next(err);
    }
  },

  async googleOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.googleOAuth(
        req.body.idToken,
        req.body.role,
        requestMeta(req),
      );
      tokenResponse(res, result);
    } catch (err) {
      next(err);
    }
  },
};
