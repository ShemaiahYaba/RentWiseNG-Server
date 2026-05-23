# RentWise Server

Backend API for RentWise — Team Neon, TechCrush Alumni Buildathon 2026.

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database (or compatible Postgres)

## Local setup

```bash
git clone <repo-url>
cd Rentwise-Server
npm install
cp .env.example .env
# Edit .env with your Neon DATABASE_URL and secrets
npm run generate   # create migration from schema (first time)
npm run migrate    # apply migrations
npm run dev        # start dev server with hot reload
```

## Environment variables

Copy `.env.example` to `.env`. All variables are validated at startup via Zod in `src/config/env.ts`. Required:

- `DATABASE_URL` — Neon connection string
- `BETTER_AUTH_SECRET` — at least 32 characters (JWT signing)
- `BETTER_AUTH_URL` — public API base URL (e.g. `http://localhost:3000`)

See `.env.example` for the full list with descriptions.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled server |
| `npm run generate` | `drizzle-kit generate` — new migration from schema |
| `npm run migrate` | `drizzle-kit migrate` — apply migrations |
| `npm run lint` | ESLint on `src/` |
| `npm run format` | Prettier write |

## API

- Health: `GET /health`
- API prefix: `/api/v1`
- Swagger UI (non-production): `GET /api/v1/docs`

## Folder structure

```
src/
├── config/       # env, db, sentry, swagger, betterAuth config
├── context/      # AsyncLocalStorage requestId
├── db/schema/    # Drizzle table definitions
├── lib/          # logger, response, validate, errors
├── middleware/   # auth, roles, rate limit, errors
├── modules/      # domain modules (auth, user, listings, …)
├── types/        # Express augmentation, shared types
├── app.ts        # Express app (importable in tests)
└── server.ts     # HTTP listener
```

## Module ownership map

| Module | Owner focus | Phase |
| --- | --- | --- |
| `auth` | Registration, login, JWT, OTP, Google OAuth | **Phase 1 (complete)** |
| `user` | Profile (`/users/me`) | Phase 2 |
| `kyc` | Document submission & status | Phase 2 |
| `listings` | CRUD, search, verification | Phase 2 |
| `inspections` | Booking & status | Phase 2 |
| `payments` | Paystack, escrow, webhooks | Phase 2 |
| `conversations` | REST history; WebSocket in Phase 2+ | Phase 2 |
| `reviews` | Post-payment reviews | Phase 2 |
| `reports` | User/listing reports | Phase 2 |
| `auditLog` | Scoped audit trail | Phase 2 |
| `admin` | Verification queues, config | Phase 2 |

## Conventions

- **Response shape:** `{ status, message, data }` via `ok`, `created`, `fail` in `src/lib/response.ts`
- **Errors:** Throw `AppError` from services; global handler returns consistent envelope and logs with `requestId`
- **Validation:** Zod schemas in `*.schema.ts`, `validate(schema)` middleware on routes
- **Data access:** Repos only — no Drizzle in services or controllers
- **Swagger:** `@swagger` JSDoc on every route when the skeleton is created
- **Env:** Always use `env` from `src/config/env.ts`, never `process.env` directly

## Migrations

1. Change schema under `src/db/schema/`
2. `npm run generate` — commits SQL under `src/db/migrations/`
3. `npm run migrate` — applies to `DATABASE_URL`
