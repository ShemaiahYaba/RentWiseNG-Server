import { createHash, randomInt } from 'node:crypto';
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

export function generateOtp(userId: string, channel: OtpChannel, destination: string): string {
  const code = String(randomInt(100_000, 999_999));
  const key = otpKey(userId, channel);
  otpStore.set(key, {
    codeHash: hashOtp(code),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  logger.info({ userId, channel, destination }, `OTP dispatched (${channel}) — dev code: ${code}`);
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
