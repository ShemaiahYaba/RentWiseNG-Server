import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { fail } from './response.js';

type RequestSource = 'body' | 'query' | 'params';

export function validate<T>(schema: ZodSchema<T>, source: RequestSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }
      fail(res, 'validation error', 422, { fieldErrors });
      return;
    }
    req[source] = parsed.data as (typeof req)[typeof source];
    next();
  };
}
