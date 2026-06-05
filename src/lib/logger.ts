import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { env } from '../config/env.js';
import { getRequestId } from '../context/requestContext.js';

// Use pino-pretty as a sync stream in dev. The transport/worker path (thread-stream)
// crashes on Windows when run under tsx watch.
const baseLogger = pino(
  { level: env.LOG_LEVEL },
  env.NODE_ENV === 'development'
    ? pinoPretty({ colorize: true, translateTime: 'SYS:standard' })
    : undefined,
);

export const logger = new Proxy(baseLogger, {
  get(target, prop, receiver) {
    const requestId = getRequestId();
    if (requestId && typeof prop === 'string' && ['info', 'warn', 'error', 'debug', 'fatal', 'trace'].includes(prop)) {
      const child = target.child({ requestId });
      const value = Reflect.get(child, prop, receiver);
      return typeof value === 'function' ? value.bind(child) : value;
    }
    return Reflect.get(target, prop, receiver);
  },
});
