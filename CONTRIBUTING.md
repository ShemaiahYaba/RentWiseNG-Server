# Contributing to RentWise Server

Welcome. This guide is written for **JavaScript-first developers** working on a **TypeScript** codebase. You do not need to be a TypeScript expert to ship features here.

## The short version

| You focus on | Your teammate handles |
| --- | --- |
| Routes, controllers, services, repos for your module | Schema changes, `pnpm generate` / `pnpm migrate` |
| Business logic (Express + Zod, same ideas as JS) | Env vars, shared auth, build/CI fixes |
| Copying patterns from `src/modules/auth/` | Drizzle table definitions when new columns are needed |

**Files are `.ts`, but you can write them like JS.** Use `unknown` or skip fancy types at first — we tighten types in review.

**Do not add raw `.js` files under `src/`.** That breaks our build and import rules. TypeScript with minimal typing is the path of least resistance.

---

## Quick start

```bash
pnpm install
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, APP_URL, RESEND_*, etc.
pnpm run migrate
pnpm run dev
```

- API base: `http://localhost:3000/api/v1`
- Swagger (dev only): `http://localhost:3000/api/v1/docs`
- Health: `GET /health`

Before your first PR, run:

```bash
pnpm run dev          # server starts without errors
pnpm run lint         # optional but recommended
```

Ask your teammate to run `pnpm run build` if you touched many files — we are still clearing pre-existing strict-build issues outside auth.

---

## Mental model: request flow

Every feature follows the same pipeline:

```text
HTTP request
  → route (*.routes.ts)     — path, middleware, Swagger JSDoc
  → validate (*.schema.ts)  — Zod parses body/query/params
  → controller (*.controller.ts) — thin: call service, send response
  → service (*.service.ts)  — business rules, throw AppError
  → repo (*.repo.ts)        — Drizzle queries only
  → PostgreSQL (Neon)
```

**Rules:**

1. **Controllers** never import `db` or Drizzle.
2. **Services** never import `db` — only repos.
3. **Repos** are the only place that talk to the database.
4. **Always** respond with `ok` / `created` / `fail` from `src/lib/response.ts`.

---

## TypeScript without the anxiety

### You already know this

TypeScript here is mostly JavaScript plus:

- **Import paths end in `.js`** even though the file is `.ts` (Node ESM rule — copy existing imports exactly).

  ```typescript
  import { ok } from '../../lib/response.js';  // ✓
  import { ok } from '../../lib/response';     // ✗ will break
  ```

- **`async/await`** everywhere for handlers and DB calls.
- **Zod** for validation — feels like Joi/Yup:

  ```typescript
  z.string().email()
  z.string().min(8)
  z.object({ title: z.string() })
  ```

### Types you can ignore at first

These are optional when you are learning:

- Generics (`ok<MyType>(...)` — `ok(res, data)` is fine)
- `satisfies`, conditional types, utility types
- Perfect return types on every function

### Types worth copying (one line each)

```typescript
import type { Request, Response, NextFunction } from 'express';

// After authenticate middleware:
req.user!.id
req.user!.role   // 'tenant' | 'agent' | 'landlord'

// In repos — Drizzle infers row shapes for you:
typeof users.$inferSelect
typeof listings.$inferInsert
```

### If the editor complains

| Error | Quick fix |
| --- | --- |
| `Parameter 'x' implicitly has an 'any' type` | Add `x: unknown` or copy the type from a similar function in `auth/` |
| `Object is possibly 'undefined'` | Use `if (!row) throw new AppError('not found', 404)` |
| `req.user` might be undefined | Only use `req.user!` **after** `authenticate` middleware on that route |
| Import path errors | Add `.js` suffix to match neighboring files |

Ping your teammate on PR — typing cleanup is normal, not a rejection.

---

## Module layout (copy this every time)

Pick your domain under `src/modules/<name>/`:

```text
src/modules/listings/
  listing.routes.ts      # Express Router + @swagger comments
  listing.controller.ts  # HTTP layer
  listing.service.ts     # business logic
  listing.repo.ts        # database
  listing.schema.ts      # Zod validation
  README.md              # routes you own (update when done)
```

**Reference implementation:** `src/modules/auth/` (fully working).  
**Your skeleton to fill in:** `src/modules/listings/`, `kyc/`, `payments/`, etc. (still return 501 until implemented).

---

## Pattern 1: Zod schema (`*.schema.ts`)

Zod replaces manual `if (!body.email)` checks. The `validate()` middleware runs before your controller.

```typescript
import { z } from 'zod';

// Body validation (default)
export const createListingSchema = z.object({
  locationId: z.string().uuid(),
  apartmentTypeId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  rentAmount: z.string(), // decimal as string is fine for MVP
  ownershipDocUrl: z.string().url(),
  videoUrl: z.string().url().optional(),
});

// Query string validation — use validate(schema, 'query') on the route
export const listingSearchSchema = z.object({
  city: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

// Optional: export a type (teammate can add this in review if you skip it)
export type CreateListingInput = z.infer<typeof createListingSchema>;
```

**Common Zod cheatsheet:**

```typescript
z.string().email()
z.string().uuid()
z.enum(['pending', 'approved', 'rejected'])
z.coerce.number()          // "10" from query → 10
z.object({ ... }).partial() // all fields optional (PATCH)
```

Invalid input → automatic **422** with `{ status: 'error', message: 'validation error', data: { fieldErrors: { ... } } }`.

---

## Pattern 2: Routes (`*.routes.ts`)

Wire middleware in this order: **rate limit (if auth-like) → authenticate → requireRole → validate → controller**.

```typescript
import { Router } from 'express';
import { validate } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { listingController } from './listing.controller.js';
import { createListingSchema, listingSearchSchema } from './listing.schema.js';

export const listingRouter = Router();

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Search listings (public)
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated listings
 */
listingRouter.get('/', validate(listingSearchSchema, 'query'), listingController.search);

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Listing created
 *       403:
 *         description: Wrong role
 */
listingRouter.post(
  '/',
  authenticate,
  requireRole('agent', 'landlord'),
  validate(createListingSchema),
  listingController.create,
);
```

Routes are mounted in `src/app.ts` as `/api/v1/listings` — your paths above are relative (`/`, `/:id`).

**Auth header for protected routes:** `Authorization: Bearer <accessToken>` from login/register.

---

## Pattern 3: Controller (`*.controller.ts`)

Controllers are thin. No business logic, no SQL.

```typescript
import type { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/response.js';
import { listingService } from './listing.service.js';

export const listingController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await listingService.search(req.query);
      ok(res, result);
    } catch (err) {
      next(err); // global error handler formats AppError + logs
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.body is already validated by Zod
      const listing = await listingService.create(req.user!.id, req.body);
      created(res, { listing });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string; // or validate uuid in schema with validate(..., 'params')
      const listing = await listingService.getById(id);
      ok(res, { listing });
    } catch (err) {
      next(err);
    }
  },
};
```

**Always** use `try/catch` and `next(err)` — same as Express error middleware in plain JS.

---

## Pattern 4: Service (`*.service.ts`)

Business rules live here. Throw `AppError` for expected failures (wrong user, not found, conflict).

```typescript
import { AppError } from '../../lib/errors.js';
import { listingRepo } from './listing.repo.js';

export const listingService = {
  async getById(id: string) {
    const listing = await listingRepo.findById(id);
    if (!listing) {
      throw new AppError('listing not found', 404);
    }
    return listing;
  },

  async create(ownerId: string, input: unknown) {
    // input is validated by Zod in the route; cast or use z.infer type when comfortable
    const data = input as {
      locationId: string;
      apartmentTypeId: string;
      title: string;
      description: string;
      rentAmount: string;
      ownershipDocUrl: string;
      videoUrl?: string;
    };

    return listingRepo.insert({
      ownerId,
      locationId: data.locationId,
      apartmentTypeId: data.apartmentTypeId,
      title: data.title,
      description: data.description,
      rentAmount: data.rentAmount,
      ownershipDocUrl: data.ownershipDocUrl,
      videoUrl: data.videoUrl,
      status: 'pending_verification',
    });
  },

  async update(ownerId: string, listingId: string, input: unknown) {
    const existing = await listingRepo.findById(listingId);
    if (!existing) {
      throw new AppError('listing not found', 404);
    }
    if (existing.ownerId !== ownerId) {
      throw new AppError('forbidden', 403);
    }
    const updated = await listingRepo.update(listingId, input as Record<string, unknown>);
    return updated;
  },
};
```

**HTTP status guide:**

| Situation | `AppError` status |
| --- | --- |
| Bad input (business rule) | 400 |
| Not logged in | 401 (usually handled by middleware) |
| Wrong role / not owner | 403 |
| Not found | 404 |
| Duplicate email, etc. | 409 |
| Not built yet | 501 (`notImplemented('feature')`) |
| Unexpected bug | don't catch — 500 + Sentry |

```typescript
import { notImplemented } from '../../lib/notImplemented.js';

async search() {
  notImplemented('listings.search'); // throws AppError 501 — remove when you implement
}
```

---

## Pattern 5: Repo (`*.repo.ts`)

Only layer that imports `db`. Copy query style from `auth.repo.ts`.

```typescript
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { listings } from '../../db/schema/index.js';

export const listingRepo = {
  async findById(id: string) {
    const [row] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .limit(1);
    return row;
  },

  async insert(data: typeof listings.$inferInsert) {
    const [row] = await db.insert(listings).values(data).returning();
    return row;
  },

  async update(id: string, data: Partial<typeof listings.$inferInsert>) {
    const [row] = await db
      .update(listings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    return row;
  },
};
```

**Soft deletes:** prefer `deletedAt` / `isNull(deletedAt)` like `users` — check the schema file for your table.

**Need a new column or table?** Stop and ask your teammate — they will edit `src/db/schema/*.ts` and run migrations.

---

## Pattern 6: API responses

All success responses look like:

```json
{
  "status": "success",
  "message": "success",
  "data": { ... }
}
```

Errors:

```json
{
  "status": "error",
  "message": "listing not found",
  "data": null
}
```

Validation (422):

```json
{
  "status": "error",
  "message": "validation error",
  "data": {
    "fieldErrors": {
      "email": ["Invalid email"]
    }
  }
}
```

In code:

```typescript
import { ok, created, fail } from '../../lib/response.js';

ok(res, { items: [], page: 1 });
created(res, { id: '...' }, 'listing created');
fail(res, 'bad request', 400); // rare in controllers — prefer AppError in services
```

---

## Auth cheat sheet

Already built in `src/modules/auth/`. You consume it, not rewrite it.

| Need | How |
| --- | --- |
| Logged-in user | `authenticate` middleware → `req.user!.id`, `req.user!.role` |
| Landlord/agent only | `requireRole('agent', 'landlord')` |
| Tenant only | `requireRole('tenant')` |
| Public route | omit `authenticate` |

Login/register responses include `accessToken` and `refreshToken`. Frontend stores them; API calls use Bearer access token.

---

## Environment variables

Never read `process.env` in feature code. Use the typed config:

```typescript
import { env } from '../../config/env.js';

// env.DATABASE_URL — already validated at startup
// env.JWT_SECRET, env.APP_URL, env.RESEND_API_KEY, etc.
```

New env var? Ask teammate to add it to `src/config/env.ts` and `.env.example`.

---

## Database & migrations (teammate-owned)

**You should not run `pnpm generate` alone** after the baseline migration unless you changed schema files together. Duplicate migrations can try to create tables that already exist.

| Command | Who | When |
| --- | --- | --- |
| `pnpm run dev` | You | Daily |
| `pnpm run migrate` | Either | After pulling new migration SQL |
| `pnpm run generate` | Teammate | After schema `.ts` changes |

If migrate fails with "relation already exists", ping your teammate — the migration journal may need syncing.

---

## Implementing a skeleton module (checklist)

Example: you own **listings**.

1. Read `src/modules/listings/README.md` and `docs/RentWise Pitch.md` (listings section).
2. Open `src/modules/auth/` side-by-side — same file names.
3. Replace `notImplemented(...)` in `listing.service.ts` one endpoint at a time.
4. Implement `listing.repo.ts` queries.
5. Wire controller responses with `ok` / `created`.
6. Test in Swagger UI or curl.
7. Update module README with real behavior and status codes.

**curl example (after login):**

```bash
# Login
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# Use accessToken from response
curl -s http://localhost:3000/api/v1/listings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Pull request expectations

1. **Scope:** one module or one feature — easier review.
2. **No** `console.log` — use `logger` from `src/lib/logger.js` if you need debug logs.
3. **No** secrets in code — `.env` only.
4. **Swagger:** update `@swagger` on routes you add or change.
5. **Tests:** not required for MVP unless you want to add them — ask first.

---

## FAQ

**Can I write plain JavaScript?**  
Use `.ts` files and write loose code (minimal types). Avoid adding `.js` source files under `src/`.

**Is TypeScript going to block me?**  
Occasionally you'll add a type or `as string` — your teammate helps in review. Runtime behavior is the same as Node + Express you already know.

**What if I break the build?**  
`pnpm run dev` uses `tsx` and is forgiving. Production build is stricter — teammate runs `pnpm run build` before deploy.

**Where do I ask questions?**  
Module README → `auth` reference → teammate for schema/env/migrations.

---

## Who owns what (Phase 2)

See the module table in [README.md](./README.md#module-ownership-map). `auth` is done; pick modules from the list and coordinate so two people do not implement the same routes.

You've got this — the patterns are repetitive on purpose. Copy `auth`, fill your module, ship.
