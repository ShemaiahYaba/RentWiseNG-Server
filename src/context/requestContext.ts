import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface RequestContextStore {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function getRequestIp(): string | undefined {
  return requestContext.getStore()?.ipAddress;
}

export function getRequestUserAgent(): string | undefined {
  return requestContext.getStore()?.userAgent;
}

export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = requestId;
  requestContext.run(
    {
      requestId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
    next,
  );
}
