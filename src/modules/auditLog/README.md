# Audit log module

Owns scoped read access to `audit_logs` and the write contract for other modules.

## Routes (`/api/v1/audit-logs`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | Bearer | Role-scoped audit entries |

Query params: `entityType`, `entityId`, `action`, `from`, `to`, `page`, `limit`.

Response: `{ auditLogs, pagination: { page, limit, total } }`.

## Scoping rules

- **tenant** — `actor_id = self` OR `entity_id` matches their inspections/payments
- **agent / landlord** — `actor_id = self` OR `entity_id` matches their listings/inspections/payments
- **admin** — use `/api/v1/admin/audit-logs` for the full log

## `auditLogWrite()` contract

Use `src/lib/auditLogWrite.ts` from services after successful mutations:

```ts
await auditLogWrite({
  actorId,
  actorRole,
  action: 'listing.created',
  entityType: 'listing',
  entityId,
  beforeState: null,
  afterState: { id, status: 'pending' },
});
```

- IP and user-agent are captured from request context when omitted.
- Failures are logged and **never** fail the parent mutation.
- Webhook-driven payment updates use `actorRole: 'system'` with `actorId` set to the payment tenant (FK).

Call from services after successful mutations — never from controllers directly.

## Admin full log

`GET /api/v1/admin/audit-logs` — same query params, no role scoping. See `src/modules/admin/README.md`.
