# Audit log module

Owns scoped read access to `audit_logs` and the write contract for other modules.

## Routes (`/api/v1/audit-logs`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | Bearer | Role-scoped audit entries |

Query params: `entity_type`, `entity_id`, `action`, `from`, `to`, `page`, `limit`.

## Scoping rules

- **tenant** — actor is self OR entity matches their inspections/payments
- **agent / landlord** — actor is self OR entity matches their listings/inspections/payments
- **admin** — full log via `/api/v1/admin/audit-logs`

## `auditLog.write()` contract (Phase 2)

Use `src/lib/auditLogWrite.ts`:

```ts
await auditLogWrite({
  actorId,
  actorRole,
  action: 'listing.created',
  entityType: 'listing',
  entityId,
  beforeState: null,
  afterState: { ...snapshot },
  ipAddress,
  userAgent,
});
```

Call from services after successful mutations — never from controllers directly.

**Phase 2:** Implement `auditLogRepo.write` and scoped list queries.
