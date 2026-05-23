import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.tokens.js';
import { fail } from '../lib/response.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    fail(res, 'unauthorized', 401);
    return;
  }

  const token = header.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    fail(res, 'unauthorized', 401);
  }
}
