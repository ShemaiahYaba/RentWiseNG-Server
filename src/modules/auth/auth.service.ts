import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { UserRole } from '../../types/common.js';
import { generateOtp, verifyOtp } from './auth.otp.js';
import { authRepo } from './auth.repo.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import { createTokenPair, hashRefreshToken, type TokenPair } from './auth.tokens.js';

const SALT_ROUNDS = 12;
const googleClient =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
    : null;

function sanitizeUser(user: Awaited<ReturnType<typeof authRepo.findById>>) {
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  return safe;
}

function requestMeta(req?: { ip?: string; get?: (h: string) => string | undefined }) {
  return {
    ipAddress: req?.ip,
    userAgent: req?.get?.('user-agent'),
  };
}

async function issueSession(
  userId: string,
  role: UserRole,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<TokenPair & { sessionId: string }> {
  const tokens = createTokenPair(userId, role);
  const session = await authRepo.insertSession({
    userId,
    refreshTokenHash: hashRefreshToken(tokens.refreshToken),
    expiresAt: tokens.refreshExpiresAt,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return { ...tokens, sessionId: session.id };
}

export const authService = {
  async register(
    input: RegisterInput,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const email = input.email.toLowerCase();
    if (await authRepo.findByEmail(email)) {
      throw new AppError('email already registered', 409);
    }
    if (await authRepo.findByPhone(input.phone)) {
      throw new AppError('phone already registered', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await authRepo.insertUser({
      role: input.role,
      fullName: input.fullName,
      email,
      phone: input.phone,
      passwordHash,
    });

    await generateOtp(user.id, 'email', email);
    await generateOtp(user.id, 'phone', input.phone);

    const tokens = await issueSession(user.id, user.role as UserRole, meta);
    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  },

  async login(input: LoginInput, meta?: { ipAddress?: string; userAgent?: string }) {
    const user = await authRepo.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new AppError('invalid credentials', 401);
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError('invalid credentials', 401);
    }
    const tokens = await issueSession(user.id, user.role as UserRole, meta);
    return { user: sanitizeUser(user), ...tokens };
  },

  async logout(refreshToken: string): Promise<void> {
    const session = await authRepo.findActiveSessionByRefreshHash(hashRefreshToken(refreshToken));
    if (session) {
      await authRepo.revokeSession(session.id);
    }
  },

  async refreshToken(refreshToken: string, meta?: { ipAddress?: string; userAgent?: string }) {
    const session = await authRepo.findActiveSessionByRefreshHash(hashRefreshToken(refreshToken));
    if (!session) {
      throw new AppError('invalid refresh token', 401);
    }

    await authRepo.revokeSession(session.id);
    const user = await authRepo.findById(session.userId);
    if (!user) {
      throw new AppError('user not found', 401);
    }
    return issueSession(user.id, user.role as UserRole, meta);
  },

  async verifyPhone(userId: string, code: string) {
    if (!verifyOtp(userId, 'phone', code)) {
      throw new AppError('invalid or expired OTP', 400);
    }
    const user = await authRepo.updateUser(userId, { phoneVerified: true });
    return sanitizeUser(user);
  },

  async verifyEmail(userId: string, code: string) {
    if (!verifyOtp(userId, 'email', code)) {
      throw new AppError('invalid or expired OTP', 400);
    }
    const user = await authRepo.updateUser(userId, { emailVerified: true });
    return sanitizeUser(user);
  },

  async googleOAuth(
    idToken: string,
    role?: UserRole,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    if (!googleClient || !env.GOOGLE_CLIENT_ID) {
      throw new AppError('google oauth is not configured', 503);
    }
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new AppError('invalid google token', 401);
    }

    const account = await authRepo.findOAuthAccount('google', payload.sub);
    let user = account ? await authRepo.findById(account.userId) : undefined;

    if (!user) {
      const existing = await authRepo.findByEmail(payload.email);
      if (existing) {
        user = existing;
        await authRepo.insertOAuthAccount({
          userId: user.id,
          provider: 'google',
          providerAccountId: payload.sub,
          providerEmail: payload.email,
        });
      } else {
        const phoneSuffix = payload.sub.replace(/\W/g, '').slice(0, 22);
        user = await authRepo.insertUser({
          role: role ?? 'tenant',
          fullName: payload.name ?? payload.email.split('@')[0],
          email: payload.email.toLowerCase(),
          phone: `g-${phoneSuffix}`,
          passwordHash: await bcrypt.hash(randomUUID(), SALT_ROUNDS),
          emailVerified: payload.email_verified ?? false,
        });
        await authRepo.insertOAuthAccount({
          userId: user.id,
          provider: 'google',
          providerAccountId: payload.sub,
          providerEmail: payload.email,
        });
      }
    }

    const tokens = await issueSession(user.id, user.role as UserRole, meta);
    return { user: sanitizeUser(user), ...tokens };
  },
};

export { requestMeta };
