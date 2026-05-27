import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.tokens.js';

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Treat invalid token as anonymous for public routes
  }
  next();
}
