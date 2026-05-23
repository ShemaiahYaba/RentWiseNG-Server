import type { NextFunction, Request, Response } from 'express';
import { Sentry } from '../config/sentry.js';
import { logger } from '../lib/logger.js';
import { fail } from '../lib/response.js';
import { AppError } from '../lib/errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
      Sentry.captureException(err);
    }
    fail(res, err.message, err.statusCode, err.data ?? null);
    return;
  }

  logger.error({ err }, 'Unhandled error');
  Sentry.captureException(err);
  fail(res, 'something went wrong', 500);
}
