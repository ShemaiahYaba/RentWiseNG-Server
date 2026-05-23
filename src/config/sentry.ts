import * as Sentry from '@sentry/node';
import { env } from './env.js';

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'documentNumber',
  'document_number',
  'documentFrontUrl',
  'document_front_url',
  'documentBackUrl',
  'document_back_url',
  'selfieUrl',
  'selfie_url',
  'paystackReference',
  'paystack_reference',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'card',
  'authorization',
];

function scrubValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
    return '[Redacted]';
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return scrubObject(value as Record<string, unknown>);
  }
  return value;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = scrubValue(key, value);
  }
  return result;
}

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.data && typeof event.request.data === 'object') {
        event.request.data = scrubObject(event.request.data as Record<string, unknown>);
      }
      if (event.extra) {
        event.extra = scrubObject(event.extra as Record<string, unknown>);
      }
      return event;
    },
  });
}

export { Sentry };
