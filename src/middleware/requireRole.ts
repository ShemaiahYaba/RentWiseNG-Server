import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../types/common.js';
import { fail } from '../lib/response.js';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      fail(res, 'unauthorized', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      fail(res, 'forbidden', 403);
      return;
    }
    next();
  };
}
