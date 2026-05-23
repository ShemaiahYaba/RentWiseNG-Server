# Auth module

Owns user registration, login, logout, JWT refresh rotation, phone/email OTP verification, and Google OAuth.

## Routes (`/api/v1/auth`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | No | Register tenant/agent/landlord; dispatches OTPs |
| POST | `/login` | No | Email/password login |
| POST | `/logout` | No | Revoke refresh token session |
| POST | `/refresh-token` | No | Rotate refresh token |
| POST | `/verify-phone` | Bearer | Verify 6-digit phone OTP |
| POST | `/verify-email` | Bearer | Verify 6-digit email OTP |
| POST | `/oauth/google` | No | Exchange Google ID token for JWT pair |

## Token flow

1. Login/register issues **access JWT** (short-lived) + **refresh token** (opaque, stored hashed in `sessions`).
2. Protected routes send `Authorization: Bearer <accessToken>`.
3. On expiry, `POST /refresh-token` with refresh token revokes old session and issues a new pair.

## OTP flow

1. On register, 6-digit OTPs are generated for email and phone (logged in dev; replace with SMS/email provider in production).
2. Authenticated user calls verify endpoints with `code`.
3. Successful verification sets `email_verified` or `phone_verified` on `users`.

Config lives in `src/config/betterAuth.ts` (secret, expiry, Google OAuth).
