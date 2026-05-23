import { createHash, randomInt } from 'node:crypto';
import { env } from '../../config/env.js';
import { resend } from '../../config/resend.js';
import { logger } from '../../lib/logger.js';

type OtpChannel = 'email' | 'phone';

interface OtpEntry {
  codeHash: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

function otpKey(userId: string, channel: OtpChannel): string {
  return `${userId}:${channel}`;
}

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function generateOtp(
  userId: string,
  channel: OtpChannel,
  destination: string,
): Promise<string> {
  const code = String(randomInt(100_000, 999_999));
  const key = otpKey(userId, channel);
  otpStore.set(key, {
    codeHash: hashOtp(code),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  if (channel === 'email') {
    const { error } = await resend.emails.send(
      {
        from: env.RESEND_FROM_EMAIL,
        to: [destination],
        subject: 'Your RentWise verification code',
        text: `Your RentWise verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your RentWise verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
      },
      { idempotencyKey: `otp-email/${userId}` },
    );
    if (error) {
      logger.error({ userId, channel, destination, err: error }, 'Failed to send OTP email');
    }
    if (env.NODE_ENV === 'development') {
      logger.info({ userId, channel, destination }, `OTP dispatched (${channel}) — dev code: ${code}`);
    }
  } else {
    logger.info({ userId, channel, destination }, `OTP dispatched (${channel}) — dev code: ${code}`);
  }

  return code;
}

export function verifyOtp(userId: string, channel: OtpChannel, code: string): boolean {
  const key = otpKey(userId, channel);
  const entry = otpStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    otpStore.delete(key);
    return false;
  }
  const valid = entry.codeHash === hashOtp(code);
  if (valid) {
    otpStore.delete(key);
  }
  return valid;
}
