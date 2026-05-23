import { env } from './env.js';

/**
 * Better Auth–compatible configuration (JWT, refresh rotation, Google OAuth, sessions).
 * Phase 1 implements session/JWT flows in auth.service using the same env contract;
 * the Better Auth package can replace internals in a later phase once schema plugins align.
 */
export const betterAuthConfig = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  },
} as const;
