# RentWise Server

Backend API for RentWise — Team Neon, TechCrush Alumni Buildathon 2026.

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database (or compatible Postgres)

## Local setup

```bash
git clone <repo-url>
cd Rentwise-Server
pnpm install   # or: npm install
cp .env.example .env
# Edit .env with your Neon DATABASE_URL and secrets
pnpm run generate   # create migration from schema (first time)
pnpm run migrate    # apply migrations
pnpm run dev        # start dev server with hot reload
```

After installing dependencies, pin exact versions once: `pnpm run deps:pin`.

## Environment variables

Copy `.env.example` to `.env`. All variables are validated at startup via Zod in `src/config/env.ts`. Required:

- `DATABASE_URL` — Neon connection string
- `JWT_SECRET` — at least 32 characters (JWT signing)
- `APP_URL` — public API base URL (e.g. `http://localhost:3000`)
- `RESEND_API_KEY` — Resend API key for email OTP delivery
- `RESEND_FROM_EMAIL` — verified sender address (e.g. `RentWise <onboarding@yourdomain.com>`)

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
| `pnpm run deps:pin` | Set exact dependency versions from `pnpm-lock.yaml` |
| `pnpm run deps:check` | Fail if `package.json` has ranges or drifts from lockfile (use in CI) |
| `pnpm run version:bump` | Interactive semver bump from git history |

### CI dependency check

```bash
pnpm install --frozen-lockfile
pnpm run deps:check
pnpm run build
pnpm run lint
```

## API

- Health: `GET /health`
- API prefix: `/api/v1`
- Swagger UI (non-production): `GET /api/v1/docs`

## Folder structure

```
src/
├── config/       # env, db, sentry, swagger, resend
├── context/      # AsyncLocalStorage requestId
├── db/schema/    # Drizzle table definitions
├── lib/          # logger, response, validate, errors
├── middleware/   # auth, roles, rate limit, errors
├── modules/      # domain modules (auth, user, listings, …)
├── types/        # Express augmentation, shared types
├── app.ts        # Express app (importable in tests)
└── server.ts     # HTTP listener
```

## Shipping checklist

Full API build order, Samuel vs Shemaiah ownership, parallel waves: **[docs/MODULE-DEPENDENCIES.md](docs/MODULE-DEPENDENCIES.md)**.

Post-MVP polish and known deferrals: **[docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md)**.

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

## Contributing

New to the repo or coming from JavaScript? See **[CONTRIBUTING.md](./CONTRIBUTING.md)** — collaboration split, copy-paste patterns (routes → controller → service → repo), Zod validation, auth, and examples based on the `auth` module.

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
