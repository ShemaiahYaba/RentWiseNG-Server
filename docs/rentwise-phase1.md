# RentWise — Phase 1 Scaffold Plan

**Team Neon | TechCrush Alumni Buildathon 2026**
**Backend Development Team**

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | Neon (Serverless Postgres) + Drizzle ORM |
| Auth | Better Auth (JWT, refresh tokens, Google OAuth) |
| File Storage | Cloudflare R2 |
| Payments | Paystack |
| Hosting | Fly.io |
| Logger | Pino |
| Error Tracking | Sentry |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| API Docs | swagger-jsdoc + swagger-ui-express |
| Security Headers | Helmet |

---

## Design Pattern

```
request → auth middleware → role guard → controller → service → repository → drizzle
```

- **Controller** — parses request, calls service, returns response via response util. No business logic.
- **Service** — all business logic. RBAC checks, state machine transitions, audit log writes.
- **Repository** — all DB queries. Raw Drizzle calls only. Service never touches Drizzle directly.
- **Middleware** — auth + role guard runs before controller. Global error handler runs last.

---

## Folder Structure

```
src/
├── config/
│   ├── env.ts                  # zod env validation, exports typed `env`
│   ├── db.ts                   # drizzle + neon connection
│   ├── sentry.ts               # sentry init
│   └── swagger.ts              # swagger-jsdoc config + spec setup
│
├── context/
│   └── requestContext.ts       # AsyncLocalStorage setup + middleware
│
├── lib/
│   ├── logger.ts               # pino instance, reads from request context
│   ├── response.ts             # ok, created, fail
│   └── validate.ts             # validate(schema) middleware factory
│
├── middleware/
│   ├── errorHandler.ts         # global error handler, registered last
│   ├── rateLimiter.ts          # express-rate-limit instances
│   ├── authenticate.ts         # JWT verification, attaches req.user
│   └── requireRole.ts          # requireRole(...roles) factory
│
├── db/
│   ├── schema/
│   │   ├── users.ts
│   │   ├── kyc.ts
│   │   ├── listings.ts
│   │   ├── inspections.ts
│   │   ├── payments.ts
│   │   ├── conversations.ts
│   │   ├── reviews.ts
│   │   ├── reports.ts
│   │   ├── auditLogs.ts
│   │   └── index.ts            # re-exports all schemas
│   └── migrations/             # drizzle-kit generated, committed
│
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts      # @swagger JSDoc blocks on every route
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repo.ts
│   │   ├── auth.schema.ts      # zod request validation schemas
│   │   └── README.md           # module overview, routes, responsibilities
│   ├── user/
│   │   ├── user.routes.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repo.ts
│   │   ├── user.schema.ts
│   │   └── README.md
│   ├── kyc/
│   │   └── README.md
│   ├── listings/
│   │   └── README.md
│   ├── inspections/
│   │   └── README.md
│   ├── payments/
│   │   └── README.md
│   ├── conversations/
│   │   └── README.md
│   ├── reviews/
│   │   └── README.md
│   ├── reports/
│   │   └── README.md
│   ├── auditLog/
│   │   └── README.md
│   └── admin/
│       └── README.md
│
├── types/
│   ├── express.d.ts            # extends Request with req.user (id, role)
│   └── common.ts               # shared types across modules
│
├── app.ts                      # express app setup, middleware, route registration
└── server.ts                   # http server, listens on port
```

**Key decisions:**

- `modules/` is domain-grouped — every file for one feature lives in one folder. Each dev can own a module without touching the other's.
- `db/schema/` is separate from modules — schema is shared infrastructure, not owned by any one module.
- `config/` vs `lib/` — `config/` is setup that runs once at startup. `lib/` is utilities called repeatedly at runtime.
- `app.ts` vs `server.ts` — split so you can import `app` in tests without binding a port.
- `auth.schema.ts` per module — zod validation schemas live next to the routes that use them, not in a global folder.
- Every module has a `README.md` — the other dev can understand any module without asking.

---

## Phase 1 Checklist

### Project Setup

- [ ] `tsconfig.json` — strict mode enabled, path aliases configured (e.g. `@/` → `src/`), `outDir` set to `dist/`
- [ ] `tsx` configured for dev, `tsc` for build
- [ ] ESLint config — TypeScript rules, consistent code style enforced
- [ ] Prettier config — formatting rules agreed on, `.prettierrc` committed
- [ ] `.gitignore` — `node_modules/`, `.env`, `dist/`
- [ ] `package.json` scripts — `dev`, `build`, `start`, `migrate`, `generate`, `lint`, `format`
- [ ] `.env.example` — every env var listed with a description comment, no real values (see env vars section below)
- [ ] Root `README.md` — prerequisites, local setup steps, env vars explanation, migration instructions, dev server instructions, folder structure overview, module ownership map

### Infrastructure

- [ ] Env validation — `zod` schema on startup, typed `env` object exported and used across the entire app, throws with a clear message on missing or invalid vars
- [ ] Pino logger — JSON output in prod, `pino-pretty` in dev, log level driven by env var
- [ ] Request context middleware — `AsyncLocalStorage`, generates `requestId` UUID per request, logger reads from it and stamps every log line
- [ ] Sentry — init in `config/sentry.ts` before routes, `Sentry.setupExpressErrorHandler(app)` after routes, `beforeSend` hook scrubbing KYC document fields and payment data before they leave the server
- [ ] Response util — `ok`, `created`, `fail` with consistent envelope `{ status, message, data }` across all endpoints
- [ ] Global error handler middleware — catches all unhandled errors, logs via Pino with `requestId`, reports to Sentry, returns `fail(res, "something went wrong", 500)`, registered last in `app.ts`
- [ ] Rate limiting — `express-rate-limit` instances on all auth routes (register, login, OTP, refresh token)
- [ ] Request validation middleware — `validate(schema)` middleware factory, runs `zod.safeParse` on `req.body`, returns `fail(res, "validation error", 422)` with field errors on failure
- [ ] CORS config — `cors` package configured with allowed origins from env, set up in `app.ts`
- [ ] Helmet — `helmet()` applied globally in `app.ts` for HTTP security headers
- [ ] Body parsers — `express.json()` and `express.urlencoded({ extended: true })` applied globally in `app.ts`
- [ ] Health check endpoint — `GET /health` returns `200 { status: "ok" }`, no auth required
- [ ] Swagger setup — `swagger-jsdoc` configured in `config/swagger.ts`, spec served via `swagger-ui-express` at `GET /api/v1/docs`, disabled or access-restricted in prod

### Data Layer

- [ ] Drizzle config — `drizzle.config.ts` at root, points to schema folder and migrations folder, Neon connection string from env
- [ ] Drizzle + Neon connection — instance exported from `config/db.ts`, connection tested on app startup with a log on success or failure
- [ ] Drizzle schema files — one file per table, fully typed, matches baseline schema exactly, all re-exported from `db/schema/index.ts`
- [ ] Baseline migration — `drizzle-kit generate` run against the full schema, migration file committed to repo
- [ ] Repository skeletons — one file per entity (`userRepo`, `kycRepo`, `listingRepo`, `inspectionRepo`, `paymentRepo`, `conversationRepo`, `reviewRepo`, `reportRepo`, `auditLogRepo`), typed method signatures with `TODO` bodies, no implementation yet

### Business Layer

- [ ] Service skeletons — one file per domain, typed method signatures, calls repo, `TODO` bodies, no implementation yet (except auth which is fully built)
- [ ] Controller skeletons — one file per domain, calls service, returns via response util, `TODO` bodies
- [ ] Route files — one file per domain with Express Router, HTTP methods mapped to controllers, `validate()` middleware slotted per route, `@swagger` JSDoc block on every route written at skeleton time
- [ ] Route registration — all routers mounted on Express app in `app.ts` under `/api/v1` prefix

### Auth (Fully Built)

- [ ] Better Auth config — JWT access token with expiry, refresh token rotation, Google OAuth provider configured, session management
- [ ] Auth middleware (`authenticate.ts`) — verifies JWT on every protected route, attaches `req.user` (`{ id, role }`) to the request
- [ ] Role guard middleware (`requireRole.ts`) — `requireRole(...roles)` factory function, reads `req.user.role`, returns `403` if role not in allowed list, used per route
- [ ] `req.user` type extension — `express.d.ts` in `types/` extending Express `Request` with `user: { id: string; role: string }`, included in `tsconfig.json` type paths
- [ ] `POST /auth/register` — full implementation, zod validation, duplicate email/phone check, password hash, email + phone OTP dispatch
- [ ] `POST /auth/login` — full implementation, credential check, JWT + refresh token issued
- [ ] `POST /auth/logout` — full implementation, refresh token revoked, session deleted
- [ ] `POST /auth/refresh-token` — full implementation, validates refresh token, rotates and issues new pair
- [ ] `POST /auth/verify-phone` — full implementation, OTP check, `phone_verified` flipped to true
- [ ] `POST /auth/verify-email` — full implementation, OTP check, `email_verified` flipped to true
- [ ] `POST /auth/oauth/google` — full implementation, Google OAuth callback, user created or linked, tokens issued
- [ ] Auth service — registration, login, logout, token refresh, OTP generation + verification for phone and email, Google OAuth callback handling
- [ ] Auth repository — user lookup by email, user lookup by phone, user insert, session insert, session revoke, OAuth account insert + lookup
- [ ] Auth swagger docs — all 7 auth routes fully documented with request body, response shape, and error codes

### READMEs

- [ ] Root `README.md` — prerequisites, clone + install, env setup, migration, dev server, folder structure, module ownership map, conventions (response shape, error handling, validation pattern, swagger rule)
- [ ] `modules/auth/README.md` — what auth module owns, routes list, token flow explanation, OTP flow explanation
- [ ] `modules/user/README.md` — what user module owns, routes list
- [ ] `modules/kyc/README.md` — what KYC module owns, routes list, status machine, placeholder note for Phase 2
- [ ] `modules/listings/README.md` — what listings module owns, routes list, verification status machine, placeholder note for Phase 2
- [ ] `modules/inspections/README.md` — what inspections module owns, routes list, status machine, placeholder note for Phase 2
- [ ] `modules/payments/README.md` — what payments module owns, routes list, payment flow, webhook notes, placeholder note for Phase 2
- [ ] `modules/conversations/README.md` — what conversations module owns, REST vs WebSocket split, placeholder note for Phase 2
- [ ] `modules/reviews/README.md` — what reviews module owns, routes list, gating rule (review only after completed payment)
- [ ] `modules/reports/README.md` — what reports module owns, routes list, polymorphic target explanation
- [ ] `modules/auditLog/README.md` — what audit log module owns, scoping rules per role, `auditLog.write()` util contract for Phase 2
- [ ] `modules/admin/README.md` — what admin module owns, routes list, placeholder note for Phase 2

---

## Env Vars (`.env.example`)

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=                  # Neon connection string

# Better Auth
BETTER_AUTH_SECRET=            # long random secret for signing tokens
BETTER_AUTH_URL=               # base URL of this API e.g. http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Sentry
SENTRY_DSN=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=                 # public base URL for serving uploaded files

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=

# CORS
ALLOWED_ORIGINS=               # comma-separated list of allowed frontend origins

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX=100
```

---

## Response Util Shape

```ts
// lib/response.ts

export const ok = (res, data, message = "success") =>
  res.status(200).json({ status: "success", message, data });

export const created = (res, data, message = "created") =>
  res.status(201).json({ status: "success", message, data });

export const fail = (res, message = "something went wrong", code = 500) =>
  res.status(code).json({ status: "error", message, data: null });
```

---

## Conventions (Agree Before Writing Code)

- Every route gets its `@swagger` JSDoc block written at the same time the skeleton is created — not at the end
- All mutations go through the service layer — never call the repo directly from a controller
- All DB queries live in the repo — never write Drizzle queries in a service
- Validation schemas live in `module.schema.ts` — never inline in routes or controllers
- All errors bubble up to the global error handler — never send a 500 manually in a controller
- Env vars are always accessed via the typed `env` object from `config/env.ts` — never `process.env` directly
- `requestId` is always included in logs — never log without going through the Pino instance in `lib/logger.ts`
