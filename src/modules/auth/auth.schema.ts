import { z } from 'zod';

const userRoleSchema = z.enum(['tenant', 'agent', 'landlord']);

export const registerSchema = z.object({
  role: userRoleSchema,
  fullName: z.string().min(2).max(255),
  email: z.string().email().max(255),
  phone: z.string().min(7).max(32),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyPhoneSchema = z.object({
  code: z.string().length(6),
});

export const verifyEmailSchema = z.object({
  code: z.string().length(6),
});

export const googleOAuthSchema = z.object({
  idToken: z.string().min(1),
  role: userRoleSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
