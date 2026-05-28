# Wave 2 (Samuel) — Conversations (REST)

Goal: implement the conversations REST module so tenants/agents/landlords can start a thread per listing and fetch message history. This unblocks the “tenant → listing → talk → inspection” flow while WebSocket chat remains deferred.

## Dependencies (already satisfied)

- Listings are live:
  - `GET /api/v1/listings/:id` works
  - Public `GET /api/v1/listings` works
- Seed exists for `locations` + `apartment_types` + `system_config` via `pnpm seed`
- Admin listing/KYC verification queues exist (useful for making listings visible)

## Where to work

- `src/modules/conversations/`
  - `conversation.routes.ts`
  - `conversation.controller.ts`
  - `conversation.service.ts`
  - `conversation.repo.ts`
  - `conversation.schema.ts`
  - `README.md`

Reference patterns:
- `src/modules/reports/` (repo/service/controller style + AppError usage)
- `src/modules/kyc/` (role gating + sanitize responses)

## Routes (must implement)

Base: `/api/v1/conversations`

### 1) Start conversation for a listing

- **POST** `/`
- **Auth**: Bearer (any logged-in user)
- **Body**: use existing `startConversationSchema` in `conversation.schema.ts`
- **Behavior**
  - Validate listing exists and is visible:
    - If the listing is not found, return **404**
    - (Simple rule is fine) only allow starting a conversation if listing exists and is not soft-deleted
  - Idempotency: if a conversation already exists for the same `(listingId, starterId)` pair, return the existing one (or 409 if you prefer; pick one and document it).
  - Create a conversation row.
  - Optional: create the first message if your schema includes it; otherwise defer messages to `GET /:id/messages` only.
- **Response**: **201** `{ conversation }`

### 2) List conversations for current user

- **GET** `/`
- **Auth**: Bearer
- **Behavior**
  - Return conversations where current user is a participant (or starter/recipient based on schema).
  - Sort descending by most recent activity:
    - Prefer `updatedAt` or last message timestamp if exists; else `createdAt`.
- **Response**: **200** `{ conversations }`

### 3) Get messages for a conversation

- **GET** `/:id/messages`
- **Auth**: Bearer
- **Behavior**
  - Ensure conversation exists; else **404**
  - Ensure requester is a participant; else **403**
  - Pagination:
    - If you already have pagination fields in schema, implement them.
    - If not, implement cursor-like pagination with `page` + `limit` in query (default limit 20, max 50) and sort newest-last for UI friendliness.
- **Response**: **200** `{ messages, pagination? }`

### 4) Optional: send message via REST

If the module already has a route for sending message (check `conversation.routes.ts`):
- Implement `POST /:id/messages` (Bearer)
- Validate participant + not deleted
- Insert message row and return **201**

If no such route exists, do not add it unless you need it for MVP; just document “send message deferred to WebSocket” in README.

## DB tables and expected relations

Use `src/db/schema/conversations.ts`:
- Conversations table
- Messages table (if present)

Rules:
- Always filter out soft-deleted rows (`deletedAt IS NULL`) if schema supports it.
- Enforce auth/ownership at the service layer.

## Error handling contract

Use `AppError` (`src/lib/errors.ts`) and the common response envelope:
- `401` unauthorized (middleware)
- `403` forbidden (participant checks)
- `404` not found (missing listing or conversation)
- `409` conflict (duplicate thread if you choose conflict style)
- `422` validation error (Zod via `validate()`)

## Swagger requirements

Update `src/modules/conversations/conversation.routes.ts` swagger blocks:
- Replace 501 placeholders with real status codes and minimal schemas.

## README requirements

Update `src/modules/conversations/README.md`:
- REST-only scope
- Any idempotency rule chosen for POST `/conversations`
- Pagination behavior for messages

## Quick smoke checks (curl)

1) Login and get token:

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@rentwiseng.com","password":"Tenant@1234"}'
```

2) Start conversation:

```bash
curl -s -X POST http://localhost:3000/api/v1/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listingId":"<LISTING_ID>"}'
```

3) List:

```bash
curl -s http://localhost:3000/api/v1/conversations \
  -H "Authorization: Bearer $TOKEN"
```

4) Messages:

```bash
curl -s http://localhost:3000/api/v1/conversations/<CONVERSATION_ID>/messages \
  -H "Authorization: Bearer $TOKEN"
```

