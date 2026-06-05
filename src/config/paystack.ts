import { createHmac, timingSafeEqual } from 'crypto';
import { AppError } from '@/lib/errors.js';
import { env } from './env.js';

export function isPaystackConfigured(): boolean {
  return Boolean(env.PAYSTACK_SECRET_KEY && env.PAYSTACK_WEBHOOK_SECRET);
}

export type InitializeTransactionParams = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
};

export type InitializeTransactionResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new AppError(
      'payments are not configured (missing Paystack environment variables)',
      503,
    );
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
    }),
  });

  const body = (await response.json()) as {
    status: boolean;
    message: string;
    data?: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  };

  if (!response.ok || !body.status || !body.data) {
    throw new AppError(body.message || 'failed to initialize Paystack transaction', 502);
  }

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
  if (hash.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
