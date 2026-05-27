# Wave 1 — Samuel implementation guide

**Owner:** Samuel  
**Modules:** `user`, `kyc`, `reports`  
**Depends on:** `auth` (done) — no listings or payments required for Wave 1.

**Before you start:** Read [CONTRIBUTING.md](../CONTRIBUTING.md) for patterns. Copy from `src/modules/auth/` when stuck.

**When blocked:** Schema/migrations/env → ping **Shemaiah**. Do not run `pnpm generate` alone.

---

## Table of contents

1. [What you are shipping](#what-you-are-shipping)
2. [Conventions (read once)](#conventions-read-once)
3. [Module: user](#module-user)
4. [Module: kyc](#module-kyc)
5. [Module: reports](#module-reports)
6. [Swagger updates](#swagger-updates)
7. [Testing checklist](#testing-checklist)
8. [PR checklist](#pr-checklist)

---

## What you are shipping

| #   | Module      | Routes                             | Status today                     |
| --- | ----------- | ---------------------------------- | -------------------------------- |
| 1   | **user**    | `GET /users/me`, `PATCH /users/me` | `GET` works; `PATCH` returns 501 |
| 2   | **kyc**     | `POST /kyc`, `GET /kyc/me`         | Both 501                         |
| 3   | **reports** | `POST /reports`, `GET /reports/me` | Both 501                         |

**Files you will mainly edit:**

```text
src/modules/user/     user.service.ts, user.repo.ts, user.controller.ts (minor), user.routes.ts (swagger)
src/modules/kyc/      kyc.service.ts, kyc.repo.ts, kyc.controller.ts, kyc.routes.ts (swagger)
src/modules/reports/  report.service.ts, report.repo.ts, report.controller.ts, report.routes.ts (swagger)
```

You may use `authRepo` from `src/modules/auth/auth.repo.ts` for user lookups/updates until `user.repo` is fully wired — that is already the pattern in `user.service.ts`.

---

## Conventions (read once)

### API prefix

All routes are under **`/api/v1`**.

| Module  | Mount path        |
| ------- | ----------------- |
| users   | `/api/v1/users`   |
| kyc     | `/api/v1/kyc`     |
| reports | `/api/v1/reports` |

### Response envelope (every endpoint)

**Success (200 / 201):**

```json
{
  "status": "success",
  "message": "success",
  "data": {}
}
```

**Error (4xx / 5xx):**

```json
{
  "status": "error",
  "message": "human readable",
  "data": null
}
```

**Validation (422):**

```json
{
  "status": "error",
  "message": "validation error",
  "data": {
    "fieldErrors": {
      "phone": ["String must contain at least 7 character(s)"]
    }
  }
}
```

In controllers:

```typescript
import { ok, created } from '../../lib/response.js';

ok(res, { user }); // 200
created(res, { kyc }, 'kyc submitted'); // 201
```

Never `res.json({ user })` without the envelope.

### Errors in services

```typescript
import { AppError } from '../../lib/errors.js';

throw new AppError('phone already in use', 409);
throw new AppError('kyc already approved', 409);
throw new AppError('listing not found', 404);
```

Controllers use `try/catch` + `next(err)` — see `auth.controller.ts`.

### Auth header

Protected routes need:

```http
Authorization: Bearer <accessToken>
```

Get a token from `POST /api/v1/auth/login` or `/auth/register`.

### Roles

| Role       | Wave 1 relevance                            |
| ---------- | ------------------------------------------- |
| `tenant`   | reports, user profile                       |
| `agent`    | kyc submit, reports, user profile           |
| `landlord` | kyc submit, reports, user profile           |
| `admin`    | not your routes (Shemaiah’s `admin` module) |

`requireRole('agent', 'landlord')` is already on `POST /kyc`.

### DB column names vs API

Drizzle schema uses **camelCase** in TypeScript (`fullName`, `userId`). Postgres columns are **snake_case** (`full_name`, `user_id`). Inserts/updates use the TS field names in Drizzle.

### Soft delete

Always filter active rows:

```typescript
import { and, eq, isNull } from 'drizzle-orm';

.where(and(eq(users.id, id), isNull(users.deletedAt)))
```

### Imports

Always use **`.js` suffix** on local imports:

```typescript
import { db } from '../../config/db.js';
```

### Do not

- Import `db` in controllers.
- Call `process.env` — use `env` from `src/config/env.ts` only if you need config (Wave 1 modules likely do not).
- Change `src/db/schema/` or run `pnpm generate`.
- Remove `passwordHash` from API responses (strip it like `getMe` does today).

---

## Module: user

### Business rules (from pitch)

- Users manage **their own** profile only — no user-id in URL.
- **Email** is not updatable via `PATCH /users/me` (not in schema — intentional).
- **Role** cannot be changed by the user.
- **Phone** change should **invalidate phone verification** (`phone_verified = false`) so they re-verify OTP (see module README).
- **Phone** must stay **unique** across users.
- Return users without `passwordHash`.

### Routes

#### `GET /api/v1/users/me`

|       |                        |
| ----- | ---------------------- |
| Auth  | Bearer required        |
| Roles | any authenticated user |

**Already implemented** in `user.service.getMe` via `authRepo.findById`. Confirm response shape below and move logic to `user.repo` if you want consistency (optional).

**Success `data` shape:**

```json
{
  "user": {
    "id": "uuid",
    "role": "tenant",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+2348012345678",
    "phoneVerified": true,
    "emailVerified": false,
    "isActive": true,
    "createdAt": "2026-05-23T12:00:00.000Z",
    "updatedAt": "2026-05-23T12:00:00.000Z",
    "deletedAt": null,
    "deletedBy": null
  }
}
```

**Errors:**

| Status | message        | When                          |
| ------ | -------------- | ----------------------------- |
| 401    | unauthorized   | missing/invalid token         |
| 404    | user not found | deleted or missing row (rare) |

---

#### `PATCH /api/v1/users/me`

|      |                               |
| ---- | ----------------------------- |
| Auth | Bearer required               |
| Body | validated by `updateMeSchema` |

**Request body (all optional, at least one field):**

```json
{
  "fullName": "Jane Doe Updated",
  "phone": "+2348098765432"
}
```

Zod schema (already in `user.schema.ts`):

```typescript
fullName: z.string().min(2).max(255).optional(),
phone: z.string().min(7).max(32).optional(),
```

**Logic (`user.service.updateMe`):**

1. Load user by `userId` — 404 if missing.
2. Build patch object only for provided fields.
3. If `phone` is changing:
   - If another user has that phone → `409` `phone already in use` (`authRepo.findByPhone`).
   - Set `phoneVerified: false`.
4. Set `updatedAt: new Date()`.
5. Update via `authRepo.updateUser` or `user.repo.updateProfile`.
6. Return sanitized user (no `passwordHash`).

**Success:** `200`, same `data.user` shape as GET.

**Errors:**

| Status | message              |
| ------ | -------------------- |
| 401    | unauthorized         |
| 404    | user not found       |
| 409    | phone already in use |
| 422    | validation error     |

**Gotcha:** Empty body `{}` passes Zod but changes nothing — still return 200 with current user (or 422 if you add `.refine()` requiring one field; optional).

---

### `user.repo.ts` implementation

Replace stubs with:

```typescript
// Prefer delegating to authRepo for find/update to avoid duplicate queries,
// OR duplicate the drizzle pattern from auth.repo.ts for findById + updateProfile.
```

Minimum: `updateProfile` calls `authRepo.updateUser`.

---

### User Swagger (`user.routes.ts`)

Replace `501` descriptions on PATCH with:

- `200` — Updated user in `data.user`
- `404`, `409`, `422` as above
- Document request body properties in `requestBody` (already started)

---

## Module: kyc

### Business rules (from pitch)

| Rule                   | Detail                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who can submit         | **agent** and **landlord** only (enforced on route)                                                                                                             |
| Tenants                | No KYC — they use `GET /kyc/me` only if you allow any role; route today is `authenticate` only on GET → any role can view; returns empty/404 if never submitted |
| One active submission  | One logical KYC per user; **re-submit** soft-deletes previous row and creates new                                                                               |
| Initial status         | `pending` on submit                                                                                                                                             |
| Admin decisions        | `approved` / `rejected` — **Shemaiah** implements in `admin` module, not you                                                                                    |
| Status history         | Every transition logged in `kyc_status_logs`                                                                                                                    |
| Document URLs          | MVP: **HTTPS URLs in JSON** (client uploads to R2 or placeholder). You store URLs as strings.                                                                   |
| Document number        | Pitch says encrypted at rest — **MVP:** store as submitted string; add `// TODO: encrypt via Shemaiah helper` unless he gives you a function                    |
| Resubmit when rejected | Allowed — soft-delete old, new `pending` row                                                                                                                    |
| Resubmit when pending  | **409** `kyc submission already pending` (or allow replace — team default: block duplicate pending)                                                             |
| Resubmit when approved | **409** `kyc already approved`                                                                                                                                  |

### Status machine

```text
                    ┌─────────────┐
         submit     │   pending   │
        ──────────► │             │
                    └──────┬──────┘
                           │ admin (Shemaiah)
              ┌────────────┼────────────┐
              ▼                         ▼
        ┌──────────┐            ┌──────────┐
        │ approved │            │ rejected │
        └──────────┘            └────┬─────┘
                                     │ user resubmits (you)
                                     ▼
                              new row pending
```

**Your responsibility:** create `pending` + log initial transition.  
**Not your responsibility:** `approved` / `rejected` (admin PATCH).

### Database tables

**`kyc_submissions`** (`src/db/schema/kyc.ts`):

| Column (TS)      | Type           | Notes                                             |
| ---------------- | -------------- | ------------------------------------------------- |
| id               | uuid           | PK                                                |
| userId           | uuid           | FK users                                          |
| documentType     | varchar        | `nin` \| `bvn` \| `passport` \| `drivers_licence` |
| documentNumber   | varchar(512)   | store number                                      |
| documentFrontUrl | varchar(1024)  | required URL                                      |
| documentBackUrl  | varchar(1024)? | optional                                          |
| selfieUrl        | varchar(1024)? | optional                                          |
| status           | varchar        | default `pending`                                 |
| rejectionReason  | text?          | null until admin rejects                          |
| reviewedBy       | uuid?          | null until admin                                  |
| reviewedAt       | timestamp?     | null until admin                                  |
| submittedAt      | timestamp      | default now                                       |
| deletedAt        | timestamp?     | soft delete                                       |
| deletedBy        | uuid?          | set to userId on resubmit                         |

**`kyc_status_logs`:**

| Column     | Notes                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| kycId      | FK submission                                                                                                                             |
| fromStatus | use `submitted` or same as `toStatus` on first create — **recommended:** `fromStatus: 'none'`, `toStatus: 'pending'`, `changedBy: userId` |
| toStatus   | `pending`                                                                                                                                 |
| changedBy  | submitting user's id on create; admin id on admin transitions                                                                             |
| note       | optional text                                                                                                                             |
| changedAt  | now                                                                                                                                       |

Align with Shemaiah: admin module may expect `from_status` values — use only: `pending`, `approved`, `rejected`, and for first log either omit log until admin or use `pending` → `pending` with note `initial submission` (cleanest: **insert log** `from: 'none', to: 'pending'` if admin UI allows; otherwise **only** insert submission row and let admin logs start at first review).

**Recommended for MVP:**

- On submit: insert submission + insert status log `{ fromStatus: 'pending', toStatus: 'pending', changedBy: userId, note: 'submitted' }` **OR** skip log until admin acts. Simplest: **one log row** with `fromStatus: 'pending'`, `toStatus: 'pending'`, `note: 'initial submission'`.

---

### Routes

#### `POST /api/v1/kyc`

|       |                     |
| ----- | ------------------- |
| Auth  | Bearer              |
| Roles | `agent`, `landlord` |

**Request body** (`submitKycSchema` — already defined):

```json
{
  "documentType": "nin",
  "documentNumber": "12345678901",
  "documentFrontUrl": "https://example.com/front.jpg",
  "documentBackUrl": "https://example.com/back.jpg",
  "selfieUrl": "https://example.com/selfie.jpg"
}
```

| Field            | Required | Values                                      |
| ---------------- | -------- | ------------------------------------------- |
| documentType     | yes      | `nin`, `bvn`, `passport`, `drivers_licence` |
| documentNumber   | yes      | non-empty string                            |
| documentFrontUrl | yes      | valid URL                                   |
| documentBackUrl  | no       | valid URL if present                        |
| selfieUrl        | no       | valid URL if present                        |

**Service logic (`kyc.submit`):**

1. `findActiveByUserId(userId)` — latest row where `deletedAt` is null.
2. If existing `status === 'approved'` → 409.
3. If existing `status === 'pending'` → 409 (or soft-delete and replace — pick 409 for simpler MVP).
4. If existing `status === 'rejected'` → soft-delete old (`deletedAt`, `deletedBy`).
5. Insert new `kyc_submissions` row, `status: 'pending'`.
6. Insert `kyc_status_logs` row for submission.
7. Return created submission (without leaking internal admin fields if you prefer — include status + id + submittedAt).

**Success `201`:**

```json
{
  "status": "success",
  "message": "created",
  "data": {
    "kyc": {
      "id": "uuid",
      "userId": "uuid",
      "documentType": "nin",
      "documentFrontUrl": "https://...",
      "documentBackUrl": "https://...",
      "selfieUrl": null,
      "status": "pending",
      "submittedAt": "2026-05-23T..."
    }
  }
}
```

**Do not return `documentNumber` in API response** (sensitive) — strip in service like password hash.

**Errors:**

| Status | message                                           |
| ------ | ------------------------------------------------- |
| 401    | unauthorized                                      |
| 403    | forbidden (tenant tried POST — middleware)        |
| 409    | kyc already approved / submission already pending |
| 422    | validation error                                  |

**Controller fix:** today `submit` does not send a response — add `created(res, { kyc })`.

---

#### `GET /api/v1/kyc/me`

|       |                             |
| ----- | --------------------------- |
| Auth  | Bearer                      |
| Roles | any (agent/landlord/tenant) |

**Logic:**

1. Load active submission for user (not soft-deleted).
2. If none → **404** `no kyc submission found` (or `200` with `data: { kyc: null }` — pick **404** for clarity).
3. Optionally load `statusLogs` ordered by `changedAt` desc.
4. Strip `documentNumber` from response.

**Success `200`:**

```json
{
  "status": "success",
  "message": "success",
  "data": {
    "kyc": {
      "id": "uuid",
      "documentType": "nin",
      "status": "pending",
      "rejectionReason": null,
      "reviewedAt": null,
      "submittedAt": "..."
    },
    "statusLogs": [
      {
        "fromStatus": "pending",
        "toStatus": "pending",
        "note": "initial submission",
        "changedAt": "..."
      }
    ]
  }
}
```

**Controller fix:** call `ok(res, result)` — today it does not respond.

---

### `kyc.repo.ts` — suggested methods

```typescript
findActiveByUserId(userId: string)  // deletedAt is null, order by submittedAt desc, limit 1
softDelete(id: string, deletedBy: string)
insertSubmission(data: typeof kycSubmissions.$inferInsert)
insertStatusLog(data: typeof kycStatusLogs.$inferInsert)
findStatusLogsByKycId(kycId: string)
```

**Drizzle imports:**

```typescript
import { db } from '../../config/db.js';
import { kycSubmissions, kycStatusLogs } from '../../db/schema/kyc.js';
```

---

### KYC gotchas

1. **Tenant calling POST /kyc** → `403` from `requireRole` — do not implement in service.
2. **documentNumber in responses** — never expose.
3. **Back URL for passport** — optional; NIN might need front only — Zod already optional back.
4. **Google OAuth users** — can be agents; KYC flow same.
5. **Admin approve** — not Wave 1; Shemaiah wires queue. Your rows must use `status: 'pending'`.
6. **Listings gate** — Shemaiah checks `kyc_required_for_listing` + approved KYC when building `POST /listings`; you only store status.

---

## Module: reports

### Business rules (from pitch)

| Rule                   | Detail                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Who can report         | Any authenticated user (tenant, agent, landlord)                                                                               |
| Targets                | `listing` or `user` (polymorphic)                                                                                              |
| Cannot report yourself | If `targetType === 'user'` and `targetId === reporterId` → **400**                                                             |
| Target must exist      | Validate listing/user row exists (and not soft-deleted)                                                                        |
| Initial status         | `open`                                                                                                                         |
| Status changes         | Admin only (`under_review`, `resolved`, `dismissed`) — Shemaiah                                                                |
| Status logs            | `report_status_logs` — **optional on create**; admin creates logs on status change. MVP: **only insert `reports` row** on POST |
| Reporter visibility    | `GET /reports/me` — only rows where `reporterId = current user`                                                                |
| Duplicate reports      | Not specified — MVP allow multiple; optional: 409 if same reporter+target+reason within 24h                                    |

### Database tables

**`reports`:**

| Column     | Notes                      |
| ---------- | -------------------------- |
| reporterId | current user               |
| targetType | `listing` \| `user`        |
| targetId   | uuid (no FK — polymorphic) |
| reason     | text                       |
| status     | default `open`             |
| createdAt  | now                        |
| deletedAt  | soft delete (admin)        |

**`report_status_logs`:** defer to admin module on status PATCH.

---

### Routes

#### `POST /api/v1/reports`

|      |        |
| ---- | ------ |
| Auth | Bearer |

**Request body** (`createReportSchema`):

```json
{
  "targetType": "listing",
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Misleading photos or description"
}
```

| Field      | Required            |
| ---------- | ------------------- |
| targetType | `listing` or `user` |
| targetId   | uuid                |
| reason     | non-empty string    |

**Service logic (`report.create`):**

1. If `targetType === 'user'` and `targetId === reporterId` → `400` `cannot report yourself`.
2. **Existence check:**
   - `user`: `authRepo.findById(targetId)` → 404 `user not found`.
   - `listing`: query `listings` table where `id = targetId` and `deletedAt is null` → 404 `listing not found`. (Works even before listings API is built — row may exist from seeds/tests.)
3. Insert `reports` with `status: 'open'`.
4. Return `201` with report id + fields (no admin-only data).

**Success `201`:**

```json
{
  "status": "success",
  "message": "created",
  "data": {
    "report": {
      "id": "uuid",
      "targetType": "listing",
      "targetId": "uuid",
      "reason": "...",
      "status": "open",
      "createdAt": "..."
    }
  }
}
```

**Errors:**

| Status | message                            |
| ------ | ---------------------------------- |
| 400    | cannot report yourself             |
| 401    | unauthorized                       |
| 404    | user not found / listing not found |
| 422    | validation error                   |

**Controller fix:** use `created(res, { report })`.

---

#### `GET /api/v1/reports/me`

|      |        |
| ---- | ------ |
| Auth | Bearer |

**Query params (optional MVP):**

| Param | Default | Max |
| ----- | ------- | --- |
| page  | 1       | —   |
| limit | 20      | 50  |

Add Zod schema in `report.schema.ts` if you add pagination:

```typescript
export const listMyReportsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});
```

**Logic:**

1. Select reports where `reporterId = userId`, `deletedAt is null`, order `createdAt desc`, offset/limit.
2. Return array + optional `{ page, limit, total }`.

**Success `200`:**

```json
{
  "status": "success",
  "message": "success",
  "data": {
    "reports": [
      {
        "id": "uuid",
        "targetType": "listing",
        "targetId": "uuid",
        "reason": "...",
        "status": "open",
        "createdAt": "..."
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

**Controller fix:** `ok(res, result)`.

---

### `report.repo.ts` — suggested methods

```typescript
create(data: typeof reports.$inferInsert)
listByReporter(reporterId: string, opts: { page: number; limit: number })
countByReporter(reporterId: string)  // for total
existsListingTarget(listingId: string)  // select 1 from listings
existsUserTarget(userId: string)       // or use authRepo
```

**Listing existence (no listing module import):**

```typescript
import { listings } from '../../db/schema/listings.js';
import { and, eq, isNull } from 'drizzle-orm';

const [row] = await db
  .select({ id: listings.id })
  .from(listings)
  .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
  .limit(1);
return Boolean(row);
```

---

### Reports gotchas

1. **Polymorphic FK** — DB does not enforce `target_id`; you must validate in service.
2. **Reporting non-existent listing** — 404, not 500.
3. **Fake listing UUID** — same 404.
4. **Admin moderation** — not in Wave 1; status stays `open` until admin PATCH.
5. **Do not return other users’ reports** on `/me`.

---

## Swagger updates

For each route you implement, update JSDoc in `*.routes.ts`:

- Remove `501` / Phase 2 wording.
- Add `requestBody` schemas matching Zod.
- List real status codes: `200`, `201`, `401`, `403`, `404`, `409`, `422`.
- Use tag: `[Users]`, `[KYC]`, `[Reports]`.
- Protected routes: `security: [ bearerAuth: [] ]`.

Example block for `POST /kyc`:

```typescript
/**
 * @swagger
 * /kyc:
 *   post:
 *     summary: Submit KYC documents
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentType, documentNumber, documentFrontUrl]
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [nin, bvn, passport, drivers_licence]
 *               documentNumber: { type: string }
 *               documentFrontUrl: { type: string, format: uri }
 *               documentBackUrl: { type: string, format: uri }
 *               selfieUrl: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: KYC submission created (pending)
 *       403:
 *         description: Wrong role (tenant)
 *       409:
 *         description: Already pending or approved
 *       422:
 *         description: Validation error
 */
```

Verify at `http://localhost:3000/api/v1/docs` after `pnpm run dev`.

---

## Testing checklist

### Setup

```bash
pnpm run dev
# Login as agent or landlord for KYC
# Login as tenant for reports + user profile
```

### User

- [ ] `GET /users/me` with valid token → 200, no `passwordHash`
- [ ] `GET /users/me` without token → 401
- [ ] `PATCH /users/me` update `fullName` → 200
- [ ] `PATCH /users/me` change `phone` → 200 and `phoneVerified: false`
- [ ] `PATCH /users/me` duplicate phone → 409

### KYC

- [ ] `POST /kyc` as agent → 201, status `pending`
- [ ] `POST /kyc` as tenant → 403
- [ ] `GET /kyc/me` after submit → 200, no `documentNumber`
- [ ] `POST /kyc` again while pending → 409
- [ ] After Shemaiah rejects (later), resubmit → new row (manual test)

### Reports

- [ ] `POST /reports` target listing (valid uuid) → 201, `open`
- [ ] `POST /reports` target self as user → 400
- [ ] `POST /reports` bad listing id → 404
- [ ] `GET /reports/me` → only your reports

### curl templates

```bash
TOKEN="your_access_token"

# GET me
curl -s http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# PATCH me
curl -s -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Samuel Test"}'

# KYC submit (agent token)
curl -s -X POST http://localhost:3000/api/v1/kyc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType":"nin",
    "documentNumber":"12345678901",
    "documentFrontUrl":"https://example.com/front.jpg"
  }'

# Report
curl -s -X POST http://localhost:3000/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType":"user",
    "targetId":"OTHER_USER_UUID",
    "reason":"Spam messages"
  }'
```

---

## PR checklist

- [ ] Removed all `notImplemented()` calls in your three modules
- [ ] Controllers return `ok` / `created` (kyc/reports were missing responses)
- [ ] No `passwordHash` or `documentNumber` in JSON responses
- [ ] Swagger updated — no 501 docs
- [ ] Module READMEs updated (`user`, `kyc`, `reports`) with final status codes
- [ ] Did not commit `.env`
- [ ] Did not change `src/db/schema/` or migration files
- [ ] Ping Shemaiah if you need listing seed UUIDs for report tests

---

## Questions for Shemaiah (sync once)

1. KYC first status log: `none → pending` or skip log until admin?
2. `document_number` encryption helper — MVP plain text OK?
3. Pending KYC resubmit: 409 or replace existing pending row?
4. Seed listing UUID for report integration tests?

---

## Reference files

| What                            | Path                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Working module                  | `src/modules/auth/`                                  |
| User table                      | `src/db/schema/users.ts`                             |
| KYC tables                      | `src/db/schema/kyc.ts`                               |
| Reports tables                  | `src/db/schema/reports.ts`                           |
| Listings (existence check only) | `src/db/schema/listings.ts`                          |
| Pitch / product rules           | `docs/RentWise Pitch.md` §2.2, §2.17, §4.2–4.3, §4.8 |
| Shipping order                  | `docs/MODULE-DEPENDENCIES.md` Wave 1                 |

Good luck — ship one module at a time: **user → kyc → reports**.
