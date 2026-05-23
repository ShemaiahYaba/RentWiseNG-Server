import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { betterAuthConfig } from '../../config/betterAuth.js';
import type { UserRole } from '../../types/common.js';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function signAccessToken(userId: string, role: UserRole): { token: string; expiresAt: Date } {
  const expiresAt = new Date();
  const token = jwt.sign({ sub: userId, role } satisfies AccessTokenPayload, betterAuthConfig.secret, {
    expiresIn: betterAuthConfig.accessTokenExpiresIn,
  });
  const decoded = jwt.decode(token) as { exp: number };
  expiresAt.setTime(decoded.exp * 1000);
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, betterAuthConfig.secret) as AccessTokenPayload;
  return payload;
}

export function getRefreshTokenExpiry(): Date {
  const ms = parseDurationMs(betterAuthConfig.refreshTokenExpiresIn);
  return new Date(Date.now() + ms);
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 86_400_000);
}

export function createTokenPair(userId: string, role: UserRole): TokenPair {
  const refreshToken = generateRefreshToken();
  const { token: accessToken, expiresAt: accessExpiresAt } = signAccessToken(userId, role);
  const refreshExpiresAt = getRefreshTokenExpiry();
  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}
